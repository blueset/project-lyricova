"use client";

import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import {
  lineBreakOpportunities,
  type GlyphShaper,
  type ShapedCluster,
} from "@lyricova/glyph-renderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@lyricova/components/utils";
import { useAppContext } from "@/components/public/AppContext";
import { useResizeObserver } from "../../../../hooks/useResizeObserver";
import {
  readPlaybackSnapshot,
  useMediaClock,
} from "../../../../hooks/useMediaClock";
import type { PlaybackSnapshot } from "../../../../hooks/types";
import { glyphFlipMatrix, karaokeFillClip } from "./canvasGlyphGeometry";
import type { FillExtent } from "./canvasGlyphGeometry";
import type {
  ClusterRenderStyle,
  GlyphCanvasContext,
} from "./canvasGlyphRenderer";
import { drawCluster } from "./canvasGlyphRenderer";
import { GlyphPathCache } from "./glyphOutlineCache";
import {
  clusterFill,
  revealedOffset,
  validateRevealTags,
} from "./karaokeTiming";
import {
  buildLyricSegments,
  selectActiveSegments,
  type GlyphLyricSegment,
} from "./lyricSegments";
import { clusterEntrance, clusterEntranceProgress } from "./clusterAnimation";
import { alignmentOffset, stackSegmentPositions } from "./glyphCanvasLayout";
import { autoPhraseRanges } from "./autoPhrase";
import {
  canvasTextDirection,
  wrapCanvasText,
  type CanvasTextLayout,
} from "./canvasTextWrap";
import { createGlyphShaper, initGlyphRuntime } from "./fontLoader";
import { GlyphFontManager, type GlyphFontSelection } from "./glyphFontManager";
import { layoutRubyParagraph } from "./rubyLayout";
import type { RubyLayoutResult } from "./types";

/**
 * Proof-of-concept "Glyph Canvas" lyric renderer built on
 * `@lyricova/glyph-renderer`.
 *
 * The whole module is lazily imported (see `MODULE_LIST` in
 * `src/app/(public)/page.tsx`) so neither the WASM shaper nor any font is
 * loaded until this renderer is actually selected. On mount it initializes the
 * WASM runtime from the local byte route and creates an empty {@link GlyphShaper}
 * plus a coverage-aware {@link GlyphFontManager}, but it does **not** prefetch
 * the fallback chain: it reaches `ready` as soon as the runtime/manager exist.
 *
 * Fonts are then downloaded *per lyric line*: because {@link draw} is
 * synchronous and driven by the media clock, each segment's font
 * {@link GlyphFontSelection} is resolved off the clock into a synchronously
 * readable cache (keyed by the segment's shaped text). A segment whose
 * selection is not yet cached is skipped for the current frame while an async
 * `ensureFontsFor(...)` is kicked off (deduped per text); on completion the
 * selection is cached, that segment's layout is invalidated, and the current
 * snapshot is repainted. This means a Latin-only line never downloads the
 * multi-megabyte Source Han members at all.
 *
 * Painting is driven exclusively by {@link useMediaClock}/{@link PlaybackSnapshot}
 * - there is no independent `requestAnimationFrame` loop and no per-frame React
 * state - so seeks, pauses, playback-rate and visibility changes all resolve to
 * a redraw of the current snapshot.
 */

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
}

type LoadStatus = "loading" | "ready" | "error";

const PADDING = 32;
const SEGMENT_GAP = 16;
const TRANSLATION_RATIO = 0.5;
const MINOR_RATIO = 0.62;
/** How many UTF-16 units ahead of the reveal front a cluster starts entering. */
const ENTRANCE_LEAD = 2.5;

const BASE_INACTIVE = "rgba(255, 255, 255, 0.32)";
const BASE_ACTIVE = "rgba(255, 255, 255, 0.98)";
const MINOR_INACTIVE = "rgba(255, 255, 255, 0.22)";
const MINOR_ACTIVE = "rgba(255, 255, 255, 0.7)";
const TRANSLATION_COLOR = "rgba(255, 255, 255, 0.75)";
const TRANSLATION_FONT = "ui-sans-serif, system-ui, sans-serif";
const GLYPH_FEATURES = ["palt=1"] as const;
const GLYPH_VARIATIONS = ["wght=600"] as const;

/**
 * Probe text used to guarantee a usable base font. The chain's first member is
 * the small Latin fallback (`mona-sans-latin-otf`), which by construction
 * covers ASCII including U+0020 SPACE, so selecting for a lone space fetches
 * *only* that ~1.31 MiB font. It is used to shape lines whose coverage-driven
 * selection is empty (e.g. an all-emoji line) so the shaper never receives an
 * empty font chain (which would throw `EmptyFontChain`); the uncoverable
 * characters simply render as tofu.
 */
const BASE_FALLBACK_PROBE = " ";

/**
 * Absolute cap on ruby size for this renderer, in CSS px. The base size is
 * viewport-responsive (see {@link responsiveFontSize}), so ruby tracks it by
 * ratio; this cap keeps furigana from becoming a distracting second headline
 * at the largest base sizes. It is a *design* decision belonging to this
 * player overlay, which is why the ruby layout engine takes it as a parameter
 * rather than baking one in.
 */
const RUBY_FONT_SIZE_MAX = 20;
/** Floor for the same reason, so ruby stays legible on a narrow viewport. */
const RUBY_FONT_SIZE_MIN = 10;

function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}

function responsiveFontSize(width: number, height: number): number {
  const basis = Math.min(width, height * 1.6);
  return Math.max(22, Math.min(56, Math.round(basis / 16)));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * The full text shaped for a segment: its base content plus every furigana
 * `content` (ruby is shaped too, with the same fallback chain). Font selection
 * must cover all of it, so this is the key used for both the selection cache
 * and the `ensureFontsFor(...)` argument.
 */
function segmentShapeText(segment: GlyphLyricSegment): string {
  if (segment.furigana.length === 0) return segment.content;
  let text = segment.content;
  for (const annotation of segment.furigana) text += annotation.content;
  return text;
}

interface SegmentLayout {
  segment: GlyphLyricSegment;
  layout: RubyLayoutResult | null;
  fontSize: number;
  /** Total occupied height (base/ruby paragraph plus any translation line). */
  height: number;
  translationHeight: number;
  translationFontSize: number;
  translationLayout: CanvasTextLayout | null;
}

export function GlyphCanvasLyrics({ lyrics, transLangIdx }: Props) {
  const { playerRef } = useAppContext();
  const language = lyrics.translationLanguages?.[transLangIdx ?? 0] ?? null;
  const trackDuration = lyrics.length ?? null;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  // Non-fatal: a line whose extra fallback font could not be loaded (its
  // `escalateFallback()` rejected). Surfaced in the warning banner so the
  // partially-rendered (tofu) line is observable without blanking the view.
  const [escalationError, setEscalationError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shaperRef = useRef<GlyphShaper | null>(null);
  const fontManagerRef = useRef<GlyphFontManager | null>(null);
  const cacheRef = useRef<GlyphPathCache | null>(null);
  const layoutCacheRef = useRef<Map<string, RubyLayoutResult>>(new Map());
  // Reverse index: shaped text -> the layout cache keys produced for it, so a
  // single text's cached layouts can be invalidated precisely when its font
  // selection changes (readiness / escalation) without clearing the whole cache.
  const layoutKeysByTextRef = useRef<Map<string, Set<string>>>(new Map());
  const translationCacheRef = useRef<Map<string, CanvasTextLayout>>(new Map());
  // Component-local, synchronously readable font selection cache keyed by a
  // segment's shaped text (see `segmentShapeText`). `draw` reads this without
  // awaiting; misses kick off an async preparation.
  const selectionCacheRef = useRef<Map<string, GlyphFontSelection>>(new Map());
  // Texts with an in-flight `ensureFontsFor(...)` preparation (per-text dedupe).
  const preparingRef = useRef<Set<string>>(new Set());
  // Texts whose escalation decision has already been made, so escalation can
  // never loop (each text is considered exactly once).
  const escalatedRef = useRef<Set<string>>(new Set());
  // Lazily-loaded, memoized guaranteed base selection (see BASE_FALLBACK_PROBE).
  const baseSelectionRef = useRef<Promise<GlyphFontSelection> | null>(null);
  const snapshotRef = useRef<PlaybackSnapshot | null>(null);
  // Points at the latest `draw` so async preparations repaint the *current*
  // snapshot without being a dependency of the stable callbacks below.
  const drawRef = useRef<(snapshot: PlaybackSnapshot | null) => void>(() => {});

  const {
    ref: containerRef,
    width,
    height,
  } = useResizeObserver<HTMLDivElement>();

  const segments = useMemo(
    () =>
      buildLyricSegments(lyrics, {
        translationLanguage: language,
        trackDuration,
      }),
    [lyrics, language, trackDuration],
  );

  // Document-level: JLReq reserves the ruby row on *every* line when the
  // lyrics file carries any furigana at all, so line advance stays uniform and
  // lines never jitter between annotated and un-annotated ones - even though
  // each line is laid out on its own.
  const reserveRubyRow = useMemo(
    () => segments.some((segment) => segment.furigana.length > 0),
    [segments],
  );

  // Validate reveal tags up front so invalid indices are surfaced explicitly
  // (a visible banner) and the affected lines fall back to a linear reveal,
  // rather than silently corrupting the karaoke offset every frame.
  const { invalidTimingLines, timingWarnings } = useMemo(() => {
    const invalid = new Set<number>();
    const warnings: string[] = [];
    for (const segment of segments) {
      if (segment.timeTags.length === 0) continue;
      try {
        validateRevealTags(segment.timeTags, segment.content.length);
      } catch (err) {
        invalid.add(segment.lineIndex);
        warnings.push(`Line ${segment.lineIndex + 1}: ${errorMessage(err)}`);
      }
    }
    return { invalidTimingLines: invalid, timingWarnings: warnings };
  }, [segments]);

  const layoutForSegment = useCallback(
    (
      segment: GlyphLyricSegment,
      fontSize: number,
      maxWidth: number | null,
      selection: GlyphFontSelection,
    ): RubyLayoutResult | null => {
      const shaper = shaperRef.current;
      if (!shaper) return null;
      const trimmed = segment.content.trim();
      if (trimmed.length === 0) return null;

      const shapeText = segmentShapeText(segment);
      // The selected manifest ids are part of the key: escalating a text to a
      // broader chain yields a different key, so its earlier (subset) layout is
      // never wrongly reused.
      const key = `${segment.lineIndex}\u0000${segment.content}\u0000${fontSize}\u0000${maxWidth ?? "-"}\u0000balanced\u0000${GLYPH_FEATURES.join(",")}\u0000${GLYPH_VARIATIONS.join(",")}\u0000${selection.fontManifestIds.join(",")}\u0000${reserveRubyRow ? "ruby" : "noruby"}`;
      let keys = layoutKeysByTextRef.current.get(shapeText);
      if (!keys) {
        keys = new Set();
        layoutKeysByTextRef.current.set(shapeText, keys);
      }
      keys.add(key);
      const cached = layoutCacheRef.current.get(key);
      if (cached) return cached;

      try {
        const phraseRanges = autoPhraseRanges(segment.content, {
          language: "ja",
        }).phraseRanges;
        const result = layoutRubyParagraph(shaper, {
          text: segment.content,
          furigana: segment.furigana,
          fontIds: selection.fontIds,
          fontSize,
          rubyFontSizeMin: RUBY_FONT_SIZE_MIN,
          rubyFontSizeMax: RUBY_FONT_SIZE_MAX,
          reserveRubyRow,
          maxWidth,
          wrapStrategy: "balanced",
          phraseRanges,
          language: "ja",
          onInvalidAnnotation: "skip",
          features: [...GLYPH_FEATURES],
          variations: [...GLYPH_VARIATIONS],
        });
        layoutCacheRef.current.set(key, result);
        return result;
      } catch (err) {
        // A per-line shaping failure must not blank the whole view; skip this
        // line's base text (translation, if any, still draws) and log it.
        console.warn(
          `[GlyphCanvas] failed to lay out line ${segment.lineIndex}:`,
          err,
        );
        return null;
      }
    },
    [reserveRubyRow],
  );

  // Drops every cached layout produced for `text` (its font selection changed).
  const invalidateLayoutForText = useCallback((text: string) => {
    const keys = layoutKeysByTextRef.current.get(text);
    if (!keys) return;
    for (const key of keys) layoutCacheRef.current.delete(key);
    keys.clear();
  }, []);

  // Memoized, guaranteed-usable base selection (only the small Latin font). Used
  // when a coverage-driven selection is empty so shaping never gets an empty
  // chain. Mirrors the manager's retry-on-failure: a failed attempt is cleared.
  const ensureBaseSelection = useCallback(
    (manager: GlyphFontManager): Promise<GlyphFontSelection> => {
      if (baseSelectionRef.current) return baseSelectionRef.current;
      const attempt = (async () => {
        const probe = await manager.ensureFontsFor(BASE_FALLBACK_PROBE);
        if (probe.fontManifestIds.length > 0) return probe;
        // Even the ASCII-space probe was uncoverable (should not happen with a
        // real Latin base font): fall back to loading the whole chain.
        const escalation = await manager.escalateFallback();
        return {
          fontIds: escalation.fontIds,
          fontManifestIds: escalation.fontManifestIds,
        };
      })();
      const tracked = attempt.catch((err) => {
        if (baseSelectionRef.current === tracked)
          baseSelectionRef.current = null;
        throw err;
      });
      baseSelectionRef.current = tracked;
      return tracked;
    },
    [],
  );

  // Resolves (once per text) the font selection a segment needs, off the media
  // clock, then caches it and repaints the current snapshot. Degrades to the
  // whole chain if the coverage route is unavailable, and only surfaces the
  // visible error state if that fallback also fails.
  const prepareSelection = useCallback(
    (text: string) => {
      const manager = fontManagerRef.current;
      if (!manager) return;
      if (selectionCacheRef.current.has(text)) return;
      if (preparingRef.current.has(text)) return;
      preparingRef.current.add(text);

      const isCurrent = () => fontManagerRef.current === manager;

      void (async () => {
        let selection: GlyphFontSelection | null = null;
        try {
          const selected = await manager.ensureFontsFor(text);
          selection =
            selected.fontManifestIds.length > 0
              ? selected
              : await ensureBaseSelection(manager);
        } catch {
          // Degradation: the coverage route (or a byte fetch) failed. Rather
          // than surfacing a hard error for a transient outage, load the whole
          // chain so the renderer still draws with the full fallback.
          try {
            const escalation = await manager.escalateFallback();
            selection = {
              fontIds: escalation.fontIds,
              fontManifestIds: escalation.fontManifestIds,
            };
          } catch (fatal) {
            selection = null;
            if (isCurrent()) {
              setError(errorMessage(fatal));
              setStatus("error");
            }
          }
        } finally {
          preparingRef.current.delete(text);
        }

        if (!selection || !isCurrent()) return;
        selectionCacheRef.current.set(text, selection);
        invalidateLayoutForText(text);
        drawRef.current(snapshotRef.current);
      })();
    },
    [ensureBaseSelection, invalidateLayoutForText],
  );

  // Escalation: only worthwhile when a chain font *declares* coverage for the
  // still-missing text but is not yet registered. Emoji and other genuinely
  // uncoverable characters return `false` and are left as tofu (never pulling
  // the multi-megabyte chain). Runs at most once per text.
  const maybeEscalate = useCallback(
    (text: string) => {
      const manager = fontManagerRef.current;
      if (!manager) return;
      const isCurrent = () => fontManagerRef.current === manager;

      void (async () => {
        let worthwhile = false;
        try {
          worthwhile = await manager.hasUnregisteredCoverageFor(text);
        } catch {
          worthwhile = false;
        }
        if (!worthwhile || !isCurrent()) return;
        try {
          const escalation = await manager.escalateFallback();
          if (!isCurrent()) return;
          selectionCacheRef.current.set(text, {
            fontIds: escalation.fontIds,
            fontManifestIds: escalation.fontManifestIds,
          });
          invalidateLayoutForText(text);
          drawRef.current(snapshotRef.current);
        } catch (err) {
          // The broader fallback could not be loaded. Keep the one-attempt-per
          // -text invariant (the text is already in `escalatedRef`, so no frame
          // retries and no re-layout loop), but make the failure observable via
          // the non-fatal warning banner instead of silently leaving tofu -
          // and never blank out the working lyrics with the fatal overlay.
          console.warn("[GlyphCanvas] font escalation failed:", err);
          if (isCurrent()) setEscalationError(errorMessage(err));
        }
      })();
    },
    [invalidateLayoutForText],
  );

  const translationLayoutForSegment = useCallback(
    (
      segment: GlyphLyricSegment,
      fontSize: number,
      maxWidth: number,
      ctx: CanvasRenderingContext2D,
    ): CanvasTextLayout | null => {
      if (!segment.translation) return null;
      const key = `${segment.translation}\u0000${fontSize}\u0000${maxWidth}\u0000${language ?? "-"}`;
      const cached = translationCacheRef.current.get(key);
      if (cached) return cached;

      ctx.save();
      let layout: CanvasTextLayout;
      try {
        ctx.font = `${fontSize}px ${TRANSLATION_FONT}`;
        layout = wrapCanvasText({
          text: segment.translation,
          maxWidth,
          lineHeight: Math.ceil(fontSize * 1.4),
          measureText: (text) => {
            ctx.direction = canvasTextDirection(text);
            return ctx.measureText(text).width;
          },
          breaks: lineBreakOpportunities(segment.translation),
          wrapStrategy: "balanced",
          phraseRanges: autoPhraseRanges(segment.translation, {
            language,
          }).phraseRanges,
        });
      } finally {
        ctx.restore();
      }
      translationCacheRef.current.set(key, layout);
      return layout;
    },
    [language],
  );

  const draw = useCallback(
    (snapshot: PlaybackSnapshot | null) => {
      const canvas = canvasRef.current;
      const cache = cacheRef.current;
      if (!canvas || !cache) return;
      if (width <= 0 || height <= 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = getDevicePixelRatio();
      const backingWidth = Math.max(1, Math.round(width * dpr));
      const backingHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentTime = snapshot?.currentTime ?? 0;
      const active = selectActiveSegments(segments, currentTime);
      if (active.length === 0) return;

      const contentWidth = Math.max(1, width - PADDING * 2);
      const maxWidth = contentWidth;

      const measured: SegmentLayout[] = active.map((segment) => {
        const fontSize = Math.round(
          responsiveFontSize(width, height) * (segment.minor ? MINOR_RATIO : 1),
        );

        let layout: RubyLayoutResult | null = null;
        if (segment.content.trim().length > 0) {
          const shapeText = segmentShapeText(segment);
          const selection = selectionCacheRef.current.get(shapeText);
          if (selection) {
            layout = layoutForSegment(segment, fontSize, maxWidth, selection);
            if (
              layout &&
              layout.missingFontRanges.length > 0 &&
              !escalatedRef.current.has(shapeText)
            ) {
              // Consider escalation exactly once per text, and only when it can
              // actually help (a coverable-but-unregistered chain font exists).
              escalatedRef.current.add(shapeText);
              maybeEscalate(shapeText);
            }
          } else {
            // Selection not ready: skip this segment's base text for this frame
            // and kick off a deduped async preparation that redraws on success.
            prepareSelection(shapeText);
          }
        }

        const translationFontSize = Math.round(fontSize * TRANSLATION_RATIO);
        const translationLayout = translationLayoutForSegment(
          segment,
          translationFontSize,
          maxWidth,
          ctx,
        );
        const translationHeight = translationLayout?.height ?? 0;
        const paragraphHeight = layout?.height ?? fontSize * 1.2;
        const heightWithTranslation =
          paragraphHeight +
          (translationHeight > 0 ? translationHeight + SEGMENT_GAP / 2 : 0);
        return {
          segment,
          layout,
          fontSize,
          translationHeight,
          translationFontSize,
          translationLayout,
          height: heightWithTranslation,
        };
      });

      const positions = stackSegmentPositions(measured, height, SEGMENT_GAP);

      measured.forEach((item, index) => {
        drawSegment(ctx, {
          item,
          top: positions[index]!.top,
          contentWidth,
          dpr,
          cache,
          currentTime,
          revealLinearly: invalidTimingLines.has(item.segment.lineIndex),
        });
      });
    },
    [
      segments,
      width,
      height,
      layoutForSegment,
      translationLayoutForSegment,
      invalidTimingLines,
      prepareSelection,
      maybeEscalate,
    ],
  );

  // Keep `drawRef` pointed at the latest `draw` for async preparations.
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // Initialize the WASM runtime and create the shaper + coverage-aware font
  // manager once, on mount. Crucially this does NOT prefetch the fallback
  // chain: `ready` is reached as soon as the runtime and manager exist; fonts
  // are fetched lazily, per line, by `prepareSelection`.
  useEffect(() => {
    // These Maps/Sets are created once (via useRef) and never reassigned, so
    // capturing them here is safe for the cleanup below.
    const layoutCache = layoutCacheRef.current;
    const layoutKeys = layoutKeysByTextRef.current;
    const translationCache = translationCacheRef.current;
    const selectionCache = selectionCacheRef.current;
    const preparing = preparingRef.current;
    const escalated = escalatedRef.current;
    let cancelled = false;
    const controller = new AbortController();
    setStatus("loading");
    setError(null);
    setEscalationError(null);

    (async () => {
      try {
        await initGlyphRuntime({ signal: controller.signal });
        if (cancelled) return;
        const shaper = createGlyphShaper();
        const manager = new GlyphFontManager({ shaper });
        shaperRef.current = shaper;
        fontManagerRef.current = manager;
        cacheRef.current = new GlyphPathCache({
          lookup: (fontId, glyphId, fontSize, variations) =>
            shaper.glyphOutline({
              fontId,
              glyphId,
              fontSize,
              variations: [...variations],
            }),
        });
        layoutCache.clear();
        layoutKeys.clear();
        translationCache.clear();
        selectionCache.clear();
        preparing.clear();
        escalated.clear();
        baseSelectionRef.current = null;
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      // `cacheRef` is (re)assigned inside the async init above, so the current
      // value at unmount is the one to free.
      cacheRef.current?.clear();
      cacheRef.current = null;
      layoutCache.clear();
      layoutKeys.clear();
      translationCache.clear();
      selectionCache.clear();
      preparing.clear();
      escalated.clear();
      baseSelectionRef.current = null;
      shaperRef.current?.free();
      shaperRef.current = null;
      // Null the manager last: in-flight async preparations gate on its
      // identity, so this makes their post-await work a no-op.
      fontManagerRef.current = null;
    };
  }, []);

  // New lyrics / new language invalidate cached layouts (the font selection
  // cache is content-addressed by shaped text and stays valid across these).
  // A lyrics change is also a natural boundary to give each text one fresh
  // escalation attempt and clear any stale per-line font warning.
  useEffect(() => {
    layoutCacheRef.current.clear();
    layoutKeysByTextRef.current.clear();
    translationCacheRef.current.clear();
    escalatedRef.current.clear();
    setEscalationError(null);
  }, [segments]);

  // Dimensions change the wrap width, so cached layouts are stale. Redraw the
  // current snapshot at the new size.
  useEffect(() => {
    layoutCacheRef.current.clear();
    layoutKeysByTextRef.current.clear();
    translationCacheRef.current.clear();
    draw(snapshotRef.current);
  }, [width, height, draw]);

  // Late readiness: once fonts/layout are available, repaint whatever the
  // current (possibly paused) snapshot is.
  useEffect(() => {
    if (status !== "ready") return;
    const player = playerRef.current;
    if (player && !snapshotRef.current) {
      snapshotRef.current = readPlaybackSnapshot(player);
    }
    draw(snapshotRef.current);
  }, [status, draw, playerRef]);

  // Sole timing source: media-clock snapshots. No independent RAF, no per-frame
  // React state - just an imperative redraw of the current snapshot.
  useMediaClock(
    playerRef,
    useCallback(
      (snapshot: PlaybackSnapshot) => {
        snapshotRef.current = snapshot;
        draw(snapshot);
      },
      [draw],
    ),
  );

  return (
    <div
      ref={containerRef}
      lang="ja"
      className="relative size-full overflow-hidden"
      data-testid="glyph-canvas-root"
      data-status={status}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      {status === "loading" && (
        <Overlay testId="glyph-canvas-loading">Loading glyph renderer…</Overlay>
      )}
      {status === "error" && (
        <Overlay testId="glyph-canvas-error" tone="error">
          <div className="font-semibold">Glyph renderer failed to load</div>
          <div className="mt-2 text-base font-normal opacity-80">{error}</div>
        </Overlay>
      )}
      {status === "ready" && (escalationError || timingWarnings.length > 0) && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2">
          {escalationError && (
            <div
              data-testid="glyph-canvas-font-warning"
              className="max-h-24 overflow-auto rounded bg-amber-500/20 p-2 text-xs text-amber-100"
            >
              <div className="font-semibold">
                Some characters are missing a fallback font (shown as tofu):
              </div>
              <div>{escalationError}</div>
            </div>
          )}
          {timingWarnings.length > 0 && (
            <div
              data-testid="glyph-canvas-timing-warning"
              className="max-h-24 overflow-auto rounded bg-amber-500/20 p-2 text-xs text-amber-100"
            >
              <div className="font-semibold">
                Invalid karaoke time tags (using linear reveal):
              </div>
              {timingWarnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Overlay({
  children,
  testId,
  tone = "info",
}: {
  children: React.ReactNode;
  testId: string;
  tone?: "info" | "error";
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-xl font-semibold italic",
        tone === "error" ? "text-red-200" : "text-white/80",
      )}
    >
      {children}
    </div>
  );
}

interface DrawSegmentParams {
  item: SegmentLayout;
  top: number;
  contentWidth: number;
  dpr: number;
  cache: GlyphPathCache;
  currentTime: number;
  revealLinearly: boolean;
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  params: DrawSegmentParams,
): void {
  const { item, top, contentWidth, dpr, cache, currentTime, revealLinearly } =
    params;
  const { segment, layout, fontSize } = item;

  const revealed = revealedOffset({
    tags: revealLinearly ? [] : segment.timeTags,
    contentLength: segment.content.length,
    startTime: segment.startTime,
    endTime: segment.endTime,
    currentTime,
  });

  const inactiveColor = segment.minor ? MINOR_INACTIVE : BASE_INACTIVE;
  const activeColor = segment.minor ? MINOR_ACTIVE : BASE_ACTIVE;

  if (layout) {
    for (const lp of layout.lines) {
      const alignX =
        PADDING +
        alignmentOffset(segment.alignment, contentWidth, lp.occupiedWidth) +
        lp.contentOffsetX;
      const adjustedLine = {
        ...lp.line,
        top: lp.top,
        baseline: lp.baseline,
        height: lp.height,
      };

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, alignX * dpr, top * dpr);

      for (let ci = 0; ci < lp.line.clusters.length; ci += 1) {
        const cluster = lp.line.clusters[ci]!;
        const style = resolveClusterStyle(
          cluster,
          revealed,
          inactiveColor,
          activeColor,
        );
        drawCluster(
          ctx as unknown as GlyphCanvasContext,
          cluster,
          adjustedLine,
          style,
          {
            cache,
            fontSize,
            variations: GLYPH_VARIATIONS,
          },
          1,
        );
      }

      // Ruby (furigana): shaped clusters drawn with the same custom outline
      // renderer, revealed in step with their base range.
      for (const ruby of lp.rubies) {
        drawRubyPlacement(ctx, {
          ruby,
          lineTop: lp.top,
          cache,
          revealed,
          inactiveColor,
          activeColor,
          variations: GLYPH_VARIATIONS,
        });
      }

      ctx.restore();
    }
  }

  // Translation: a non-animated secondary line, drawn with native canvas text
  // (not the custom glyph renderer).
  if (item.translationLayout) {
    const paragraphHeight = layout?.height ?? fontSize * 1.2;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${item.translationFontSize}px ${TRANSLATION_FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = TRANSLATION_COLOR;
    const translationTop = top + paragraphHeight + SEGMENT_GAP / 2;
    item.translationLayout.lines.forEach((line, index) => {
      ctx.direction = line.direction;
      ctx.textAlign = "left";
      const transX =
        PADDING + alignmentOffset(segment.alignment, contentWidth, line.width);
      const transY =
        translationTop +
        index * item.translationLayout!.lineHeight +
        item.translationFontSize;
      ctx.fillText(line.text, transX, transY);
    });
    ctx.restore();
  }
}

function resolveClusterStyle(
  cluster: ShapedCluster,
  revealed: number,
  inactiveColor: string,
  activeColor: string,
): ClusterRenderStyle {
  const fillDirection = cluster.direction === "rtl" ? "rtl" : "ltr";
  const fillFraction = clusterFill(
    revealed,
    cluster.source.utf16Start,
    cluster.source.utf16End,
  );

  if (cluster.isWhitespace) {
    return { inactiveColor, activeColor, fillFraction, fillDirection };
  }

  const entrance = clusterEntrance(
    clusterEntranceProgress({
      revealed,
      clusterStartUtf16: cluster.source.utf16Start,
      lead: ENTRANCE_LEAD,
    }),
    fillDirection,
  );
  return {
    inactiveColor,
    activeColor,
    fillFraction,
    fillDirection,
    opacity: entrance.opacity,
    transform: entrance.transform,
  };
}

export interface DrawRubyParams {
  ruby: RubyLayoutResult["rubies"][number];
  lineTop: number;
  cache: GlyphPathCache;
  revealed: number;
  inactiveColor: string;
  activeColor: string;
  variations?: readonly string[];
}

/** Exported for unit testing the fully-revealed-ruby clip behavior (see `glyphCanvasRuby.spec.ts`). */
export function drawRubyPlacement(
  ctx: CanvasRenderingContext2D,
  params: DrawRubyParams,
): void {
  const {
    ruby,
    lineTop,
    cache,
    revealed,
    inactiveColor,
    activeColor,
    variations = GLYPH_VARIATIONS,
  } = params;
  const baselineY = lineTop + ruby.y;
  const [rangeStart, rangeEnd] = ruby.annotation.utf16Range;
  const fraction = clusterFill(revealed, rangeStart, rangeEnd);

  // Ink-aware horizontal extent (measured at layout time from the runs'
  // actual glyph outlines, unioned with their advance boxes - see
  // `measureRubyInkHorizontalExtent` in `rubyInkMetrics.ts`), so negative
  // left side bearing / right overhang are covered by the karaoke clip
  // below instead of being silently excluded.
  const xStart = ruby.inkLeft;
  const xEnd = ruby.inkRight;
  if (!Number.isFinite(xStart) || !Number.isFinite(xEnd) || xEnd <= xStart) {
    return;
  }

  const paintRuns = () => {
    for (const run of ruby.runs) {
      for (const glyph of run.glyphs) {
        const path = cache.getPath(
          glyph.fontId,
          glyph.glyphId,
          ruby.fontSize,
          variations,
        );
        if (!path) continue;
        const flip = glyphFlipMatrix({
          x: run.x + glyph.x,
          y: baselineY + (-glyph.yOffset || 0),
        });
        ctx.save();
        ctx.transform(flip[0], flip[1], flip[2], flip[3], flip[4], flip[5]);
        ctx.fill(path);
        ctx.restore();
      }
    }
  };

  ctx.fillStyle = inactiveColor;
  paintRuns();

  if (fraction >= 1) {
    // Fully revealed: skip the clip entirely rather than relying on it to
    // exactly cover the ink extent. This guarantees every ruby glyph outline
    // paints as active - including any ink the extent measurement couldn't
    // capture (e.g. an outline-less glyph whose advance box was used as a
    // fallback) - instead of leaving stale inactive-color ink at the edges.
    ctx.fillStyle = activeColor;
    paintRuns();
  } else if (fraction > 0) {
    // Vertical band from the annotation's *measured* ink ascent/descent
    // (public ruby-layout API), horizontal fill via the shared, ink-aware
    // `karaokeFillClip` - no local magic numbers.
    const extent: FillExtent = {
      left: xStart,
      right: xEnd,
      top: baselineY - ruby.inkAscent,
      bottom: baselineY + ruby.inkDescent,
    };
    const clip = karaokeFillClip(extent, fraction, "ltr");
    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
    ctx.fillStyle = activeColor;
    paintRuns();
    ctx.restore();
  }
}
