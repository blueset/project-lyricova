"use client";

import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import {
  lineBreakOpportunities,
  type ShapedCluster,
} from "@lyricova/glyph-renderer";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
import type { GlyphPathCache } from "./glyphOutlineCache";
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
import {
  glyphVariations,
  GlyphRuntimeProvider,
  canvasPixelRatio,
  responsiveFontSize,
  useGlyphRuntime,
  useGlyphRuntimeVersion,
} from "./glyphRuntime";
import type { RubyLayoutResult } from "./types";

/**
 * Proof-of-concept "Glyph Canvas" lyric renderer built on
 * `@lyricova/glyph-renderer`.
 *
 * The whole module is lazily imported (see `MODULE_LIST` in
 * `src/app/(public)/page.tsx`) so neither the WASM shaper nor any font is
 * loaded until this renderer is actually selected.
 *
 * ## What this component owns vs. what the runtime owns
 *
 * The WASM shaper, the coverage-aware font manager, the glyph-outline cache,
 * the paragraph layout cache and the document-level ruby anchors used to live
 * here. They were hoisted into {@link ./glyphRuntime} so a future virtualized
 * renderer (one canvas *per row*) can share a single copy across every row
 * instead of each row re-initializing WASM and re-downloading fonts. This
 * component now *consumes* that shared runtime and keeps only what is genuinely
 * its own: the single full-viewport `<canvas>` and its synchronous draw loop,
 * the {@link useMediaClock} wiring, segment selection/stacking, the karaoke
 * fill and cluster entrance animation, native-canvas translation layout
 * ({@link wrapCanvasText}), the non-fatal warning banner, and reveal-tag
 * validation.
 *
 * It is mounted standalone from `page.tsx` (not inside a provider), so
 * {@link GlyphCanvasLyrics} wraps its own {@link GlyphRuntimeProvider} around an
 * inner component that reads the runtime via {@link useGlyphRuntime}. A caller
 * that already owns a provider (the virtualized renderer) would render the
 * inner component directly.
 *
 * ## The pull-based runtime contract
 *
 * {@link draw} is synchronous and driven by the media clock, so it cannot await
 * fonts. It calls {@link GlyphRuntime.layoutLine} for each active line, which
 * resolves the line's font selection internally and returns `null` while the
 * fonts are still in flight (a Latin-only line therefore never downloads the
 * multi-megabyte Source Han members). A line whose layout is not ready is
 * simply skipped for this frame - its translation still draws - and the runtime
 * bumps a version counter when the fonts land. This component subscribes with
 * {@link useGlyphRuntimeVersion} and repaints the current snapshot on every
 * bump, rather than the runtime pushing a draw into it.
 *
 * `translationCacheRef` stays local on purpose: native-canvas translation
 * measurement needs the `CanvasRenderingContext2D` this component owns, which
 * the runtime deliberately does not.
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
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

export function GlyphCanvasLyrics(props: Props) {
  // This PoC is mounted standalone from `page.tsx`, not inside a provider, so
  // it owns the shared runtime here rather than pushing that requirement onto
  // callers (see the module doc). A future virtualized renderer will instead
  // host one <GlyphRuntimeProvider> around many rows and render the inner
  // component directly, so the runtime is shared across rows.
  return (
    <GlyphRuntimeProvider>
      <GlyphCanvasLyricsInner {...props} />
    </GlyphRuntimeProvider>
  );
}

function GlyphCanvasLyricsInner({ lyrics, transLangIdx }: Props) {
  const { playerRef } = useAppContext();
  // The shared WASM/font/layout runtime. Its `status`/`error`/`escalationError`
  // drive the loading/error/warning UI below; `layoutLine`/`pathCache` drive the
  // draw loop. It returns `null` from its synchronous getters while work is in
  // flight and bumps a version we subscribe to (see `runtimeVersion`).
  const runtime = useGlyphRuntime();
  const { status, error, escalationError, resetDocument } = runtime;
  const language = lyrics.translationLanguages?.[transLangIdx ?? 0] ?? null;
  const trackDuration = lyrics.length ?? null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Native-canvas translation measurement cache. Deliberately kept local rather
  // than in the runtime: it is keyed by (and produced from) the
  // `CanvasRenderingContext2D` this component owns, which the runtime does not.
  const translationCacheRef = useRef<Map<string, CanvasTextLayout>>(new Map());
  const snapshotRef = useRef<PlaybackSnapshot | null>(null);

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
      const cache = runtime.pathCache;
      if (!canvas || !cache) return;
      if (width <= 0 || height <= 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = canvasPixelRatio();
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

        // The runtime resolves this line's font selection internally (base text
        // plus every ruby reading, shaped with the same chain) and returns
        // `null` while those fonts are still loading. It also owns escalation
        // when a layout reports missing ranges. So there is nothing to
        // pre-resolve or re-check here: a `null` layout simply skips this line's
        // base text for the frame - its translation still draws below - and the
        // runtime bumps the version we subscribe to, repainting once fonts land.
        let layout: RubyLayoutResult | null = null;
        if (segment.content.trim().length > 0) {
          layout = runtime.layoutLine({
            lineIndex: segment.lineIndex,
            text: segment.content,
            furigana: segment.furigana,
            fontSize,
            maxWidth,
            reserveRubyRow,
          });
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
      runtime,
      reserveRubyRow,
      translationLayoutForSegment,
      invalidTimingLines,
    ],
  );

  // The runtime is pull-based: `layoutLine` returns `null` while a line's fonts
  // are still loading and bumps a version when they (or an escalation, or the
  // shared document-level ruby anchors) land. Subscribe to that version and
  // repaint the current snapshot on every bump. This replaces the old code's
  // direct `drawRef.current(snapshotRef.current)` call from inside the async
  // font preparation, which the runtime now owns.
  const runtimeVersion = useGlyphRuntimeVersion(runtime);
  useEffect(() => {
    draw(snapshotRef.current);
  }, [runtimeVersion, draw]);

  // New lyrics / new language: drop the local translation measurement cache, and
  // tell the runtime this is a new document. Registered fonts and their coverage
  // stay (content-addressed and expensive to refetch), but the escalation
  // attempts, the non-fatal escalation error and the document-level ruby anchors
  // all belong to the *previous* document and must not leak into this one.
  useEffect(() => {
    translationCacheRef.current.clear();
    resetDocument();
  }, [segments, resetDocument]);

  // Dimensions change the wrap width, so the local translation measurements are
  // stale (the runtime keys its own layout cache by width and re-lays out on
  // demand). Drop them and redraw the current snapshot at the new size.
  useEffect(() => {
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
            variations: glyphVariations(fontSize),
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
          variations: glyphVariations(fontSize),
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
    // Ruby carries its own optical size: it renders far smaller than its base.
    variations = glyphVariations(ruby.fontSize),
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
