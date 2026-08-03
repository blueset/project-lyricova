"use client";

import type { GlyphShaper } from "@lyricova/glyph-renderer";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { autoPhraseRanges } from "./autoPhrase";
import { createGlyphShaper, initGlyphRuntime } from "./fontLoader";
import { GlyphFontManager, type GlyphFontSelection } from "./glyphFontManager";
import { GlyphPathCache } from "./glyphOutlineCache";
import { layoutRubyParagraph } from "./rubyLayout";
import type { RubyLayoutIssue, RubyLayoutResult } from "./types";
import type { RubyVerticalMetrics } from "./rubyVerticalMetrics";

/**
 * Shared WASM/font/layout runtime for every canvas-based lyrics renderer.
 *
 * The Glyph Canvas PoC originally owned all of this itself, which was fine for
 * a single full-viewport canvas. A virtualized renderer paints **one canvas per
 * row**, and those rows must not each initialize the WASM module, register
 * their own copies of a 30 MB font, or keep private layout caches. This module
 * hoists the whole runtime into one provider:
 *
 * - the WASM runtime and a single {@link GlyphShaper},
 * - the coverage-driven {@link GlyphFontManager} and its selection cache,
 * - the glyph outline/`Path2D` cache,
 * - the paragraph layout cache, keyed so a font escalation invalidates only the
 *   affected text,
 * - the **document-level** ruby vertical anchors, which only produce a uniform
 *   ruby row if they are shared across every line (see `rubyVerticalMetrics.ts`).
 *
 * Consumers are pull-based: `selectionFor` and `layoutLine` are synchronous and
 * return `null` while work is still in flight, and the runtime bumps a version
 * counter when anything lands. Rows subscribe with {@link useGlyphRuntimeVersion}
 * and re-render, rather than the runtime pushing draws into them - a canvas per
 * row means there is no single "repaint everything" entry point to call.
 */

/** OpenType features every canvas renderer shapes with. */
export const GLYPH_FEATURES = ["palt=1"] as const;
/**
 * Variable-font axis settings every canvas renderer shapes with.
 *
 * `opsz=72` is **not** optional padding. Mona Sans exposes an `opsz` axis whose
 * range is `0-100` but whose *default is `0`*, while all 160 of its named
 * instances use `72`. Pinning only `wght` therefore rendered Latin at an optical
 * size the font was never designed to be used at: measured over
 * "Blessings for your everyday" at 60 px, `opsz=0` is 7% wider with 3% less ink
 * than `opsz=72`, i.e. **11% less dense** - which reads as a lighter weight
 * beside CJK text even though the stems are identical (0.130 em at `wght=600`).
 * Source Han Sans has no `opsz` axis, so it is unaffected; unknown axes are
 * ignored per font, which is why one shared list is safe.
 */
export const GLYPH_VARIATIONS = ["wght=600", "opsz=72"] as const;

/**
 * Probe text guaranteeing a usable base font: the chain's first member is the
 * small Latin face, which covers U+0020, so selecting for a lone space fetches
 * only that font. Used when a coverage-driven selection comes back empty (e.g.
 * an all-emoji line) so shaping never receives an empty chain.
 */
const BASE_FALLBACK_PROBE = " ";

/** Ruby size bounds for the player overlay, in CSS px. */
const RUBY_FONT_SIZE_MIN = 10;
const RUBY_FONT_SIZE_MAX = 20;
/** Clearance between the ruby row and the base text's typographic top, in ruby em. */
const RUBY_GAP_EM = 0.25;

export interface GlyphLineLayoutRequest {
  /** Stable identity of the line, used only for diagnostics. */
  lineIndex: number;
  text: string;
  furigana: RubyLayoutRequestFurigana;
  fontSize: number;
  maxWidth: number | null;
  /** Whether *any* line in the document carries ruby (document-level). */
  reserveRubyRow: boolean;
}

type RubyLayoutRequestFurigana = Parameters<
  typeof layoutRubyParagraph
>[1]["furigana"];

export interface GlyphRuntime {
  status: "loading" | "ready" | "error";
  /** Fatal error: the runtime could not initialize and nothing can be drawn. */
  error: string | null;
  /** Non-fatal: a font escalation failed, so some text may render as tofu. */
  escalationError: string | null;
  shaper: GlyphShaper | null;
  pathCache: GlyphPathCache | null;
  /**
   * The font selection for `text`, or `null` while it is being resolved. Kicks
   * off resolution on the first miss and bumps the version when it lands.
   */
  selectionFor(text: string): GlyphFontSelection | null;
  /** Lays out one line, memoized across every consumer. `null` while fonts load. */
  layoutLine(request: GlyphLineLayoutRequest): RubyLayoutResult | null;
  /**
   * Considers loading a broader fallback for text the current chain could not
   * fully cover. Runs at most once per text, and only when a chain font
   * actually declares the missing coverage.
   */
  maybeEscalate(text: string): void;
  /**
   * Clears the per-document derived state: escalation attempts, the non-fatal
   * escalation error, and the document-level ruby anchors. Call when the lyrics
   * document changes - the registered fonts and their coverage stay valid (they
   * are content-addressed and expensive to refetch), but "we already tried
   * escalating this text" and "the widest ruby box seen so far" are properties
   * of the *document* and must not leak into the next one.
   */
  resetDocument(): void;
  subscribe(listener: () => void): () => void;
  getVersion(): number;
}

const GlyphRuntimeContext = createContext<GlyphRuntime | null>(null);

/**
 * Ruby layout issues are non-fatal by contract, so layout returns them rather
 * than throwing. Without a consumer they vanish silently, which makes a real
 * problem (a malformed furigana range, ruby colliding with the base text)
 * invisible in a browser. Logged once per line and kind: layouts are cached but
 * a resize re-runs them at a new size, and repeating the warning every resize
 * frame would be worse than useless. `warn` rather than `error` because every
 * issue is recovered from and none stops the render.
 */
const reportedRubyIssues = new Set<string>();

export function reportRubyIssues(
  lineIndex: number,
  issues: readonly RubyLayoutIssue[],
): void {
  for (const issue of issues) {
    const key = `${lineIndex}\u0000${issue.kind}`;
    if (reportedRubyIssues.has(key)) continue;
    reportedRubyIssues.add(key);
    console.warn(
      `[GlyphRuntime] ruby layout issue on line ${lineIndex + 1}: ${issue.kind}`,
      issue,
    );
  }
}

/** Widens the document-level ruby anchors. Returns `true` when anything grew. */
function widenRubyMetrics(
  ref: { current: RubyVerticalMetrics | null },
  candidate: RubyVerticalMetrics | null,
): boolean {
  if (!candidate) return false;
  const current = ref.current;
  if (!current) {
    ref.current = { ...candidate };
    return true;
  }
  const merged: RubyVerticalMetrics = {
    baseAscentEm: Math.max(current.baseAscentEm, candidate.baseAscentEm),
    rubyAscentEm: Math.max(current.rubyAscentEm, candidate.rubyAscentEm),
    rubyDescentEm: Math.max(current.rubyDescentEm, candidate.rubyDescentEm),
  };
  const grew =
    merged.baseAscentEm > current.baseAscentEm ||
    merged.rubyAscentEm > current.rubyAscentEm ||
    merged.rubyDescentEm > current.rubyDescentEm;
  if (grew) ref.current = merged;
  return grew;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Owns the runtime. Exported for tests and for the provider; application code
 * should use {@link GlyphRuntimeProvider} + {@link useGlyphRuntime}.
 */
export function useCreateGlyphRuntime(): GlyphRuntime {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [escalationError, setEscalationError] = useState<string | null>(null);

  const shaperRef = useRef<GlyphShaper | null>(null);
  const managerRef = useRef<GlyphFontManager | null>(null);
  const pathCacheRef = useRef<GlyphPathCache | null>(null);

  const selectionCacheRef = useRef(new Map<string, GlyphFontSelection>());
  const preparingRef = useRef(new Set<string>());
  const escalatedRef = useRef(new Set<string>());
  const baseSelectionRef = useRef<Promise<GlyphFontSelection> | null>(null);

  const layoutCacheRef = useRef(new Map<string, RubyLayoutResult>());
  const layoutKeysByTextRef = useRef(new Map<string, Set<string>>());
  const rubyMetricsRef = useRef<RubyVerticalMetrics | null>(null);

  const listenersRef = useRef(new Set<() => void>());
  const versionRef = useRef(0);

  const bumpVersion = useCallback(() => {
    versionRef.current += 1;
    for (const listener of listenersRef.current) listener();
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);
  const getVersion = useCallback(() => versionRef.current, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const selectionCache = selectionCacheRef.current;
    const preparing = preparingRef.current;
    const escalated = escalatedRef.current;
    const layoutCache = layoutCacheRef.current;
    const layoutKeys = layoutKeysByTextRef.current;

    void (async () => {
      try {
        await initGlyphRuntime({ signal: controller.signal });
        if (cancelled) return;
        const shaper = createGlyphShaper();
        shaperRef.current = shaper;
        managerRef.current = new GlyphFontManager({ shaper });
        pathCacheRef.current = new GlyphPathCache({
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
        selectionCache.clear();
        preparing.clear();
        escalated.clear();
        baseSelectionRef.current = null;
        rubyMetricsRef.current = null;
        setStatus("ready");
        bumpVersion();
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      // Release the WASM-side shaper and every font registered in it. Without
      // this the module's linear memory keeps whole font buffers (up to ~30 MB
      // for the full Source Han face) alive after unmount.
      shaperRef.current?.free();
      shaperRef.current = null;
      managerRef.current = null;
      pathCacheRef.current = null;
      layoutCache.clear();
      layoutKeys.clear();
      selectionCache.clear();
      preparing.clear();
      escalated.clear();
      baseSelectionRef.current = null;
      rubyMetricsRef.current = null;
    };
  }, [bumpVersion]);

  /** Drops every cached layout produced for `text` (its font selection changed). */
  const invalidateLayoutForText = useCallback((text: string) => {
    const keys = layoutKeysByTextRef.current.get(text);
    if (!keys) return;
    for (const key of keys) layoutCacheRef.current.delete(key);
    keys.clear();
  }, []);

  const ensureBaseSelection = useCallback(
    (manager: GlyphFontManager): Promise<GlyphFontSelection> => {
      if (baseSelectionRef.current) return baseSelectionRef.current;
      const attempt = (async () => {
        const probe = await manager.ensureFontsFor(BASE_FALLBACK_PROBE);
        if (probe.fontManifestIds.length > 0) return probe;
        const escalation = await manager.escalateFallback();
        return {
          fontIds: escalation.fontIds,
          fontManifestIds: escalation.fontManifestIds,
        };
      })();
      // Mirror the manager's retry-on-failure: a failed attempt is cleared so a
      // later line can try again rather than inheriting a rejected promise.
      const tracked = attempt.catch((err) => {
        if (baseSelectionRef.current === tracked) {
          baseSelectionRef.current = null;
        }
        throw err;
      });
      baseSelectionRef.current = tracked;
      return tracked;
    },
    [],
  );

  const selectionFor = useCallback(
    (text: string): GlyphFontSelection | null => {
      const cached = selectionCacheRef.current.get(text);
      if (cached) return cached;

      const manager = managerRef.current;
      if (!manager || text.length === 0) return null;
      if (preparingRef.current.has(text)) return null;
      preparingRef.current.add(text);

      const isCurrent = () => managerRef.current === manager;

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
        bumpVersion();
      })();

      return null;
    },
    [bumpVersion, ensureBaseSelection, invalidateLayoutForText],
  );

  const maybeEscalate = useCallback(
    (text: string) => {
      const manager = managerRef.current;
      if (!manager) return;
      if (escalatedRef.current.has(text)) return;
      escalatedRef.current.add(text);
      const isCurrent = () => managerRef.current === manager;

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
          bumpVersion();
        } catch (err) {
          // Keep the one-attempt-per-text invariant (no frame retries, no
          // re-layout loop) but make the failure observable instead of
          // silently leaving tofu.
          console.warn("[GlyphRuntime] font escalation failed:", err);
          if (isCurrent()) setEscalationError(errorMessage(err));
        }
      })();
    },
    [bumpVersion, invalidateLayoutForText],
  );

  const resetDocument = useCallback(() => {
    escalatedRef.current.clear();
    rubyMetricsRef.current = null;
    layoutCacheRef.current.clear();
    layoutKeysByTextRef.current.clear();
    setEscalationError(null);
    bumpVersion();
  }, [bumpVersion]);

  const layoutLine = useCallback(
    (request: GlyphLineLayoutRequest): RubyLayoutResult | null => {
      const shaper = shaperRef.current;
      if (!shaper) return null;
      if (request.text.trim().length === 0) return null;

      // Font selection must cover the base text *and* every ruby reading, since
      // both are shaped with the same chain.
      const shapeText =
        request.text + request.furigana.map((f) => f.content).join("");
      const selection = selectionFor(shapeText);
      if (!selection) return null;

      const key = [
        request.lineIndex,
        request.text,
        request.fontSize,
        request.maxWidth ?? "-",
        selection.fontManifestIds.join(","),
        request.reserveRubyRow ? "ruby" : "noruby",
      ].join("\u0000");

      let keys = layoutKeysByTextRef.current.get(shapeText);
      if (!keys) {
        keys = new Set();
        layoutKeysByTextRef.current.set(shapeText, keys);
      }
      keys.add(key);
      const cached = layoutCacheRef.current.get(key);
      if (cached) return cached;

      try {
        const rubyFontSize = Math.min(
          Math.max(request.fontSize * 0.5, RUBY_FONT_SIZE_MIN),
          RUBY_FONT_SIZE_MAX,
        );
        const result = layoutRubyParagraph(shaper, {
          text: request.text,
          furigana: request.furigana,
          fontIds: selection.fontIds,
          fontSize: request.fontSize,
          rubyFontSizeMin: RUBY_FONT_SIZE_MIN,
          rubyFontSizeMax: RUBY_FONT_SIZE_MAX,
          rubyGap: rubyFontSize * RUBY_GAP_EM,
          reserveRubyRow: request.reserveRubyRow,
          ...(rubyMetricsRef.current
            ? { rubyMetrics: rubyMetricsRef.current }
            : {}),
          maxWidth: request.maxWidth,
          wrapStrategy: "balanced",
          phraseRanges: autoPhraseRanges(request.text, { language: "ja" })
            .phraseRanges,
          language: "ja",
          onInvalidAnnotation: "skip",
          features: [...GLYPH_FEATURES],
          variations: [...GLYPH_VARIATIONS],
        });
        reportRubyIssues(request.lineIndex, result.issues);
        // Widen from the paragraph's *natural* metrics, never from the anchor we
        // just supplied - layout echoes that straight back, so widening from it
        // would freeze the document anchor at whichever annotated line happened
        // to be painted first.
        if (widenRubyMetrics(rubyMetricsRef, result.naturalRubyMetrics)) {
          // The shared anchors grew, so every cached row height is now stale -
          // including *this* result, which was laid out against the narrower
          // anchor. Caching it would leave exactly one line permanently
          // inconsistent with the rest of the document, so it is dropped and
          // recomputed on the re-render the version bump triggers.
          layoutCacheRef.current.clear();
          // Deferred: `layoutLine` is called during render, and notifying
          // subscribers synchronously would re-enter React's render phase.
          queueMicrotask(bumpVersion);
        } else {
          layoutCacheRef.current.set(key, result);
        }
        if (result.missingFontRanges.length > 0) maybeEscalate(shapeText);
        return result;
      } catch (err) {
        // A per-line shaping failure must not blank the whole view.
        console.warn(
          `[GlyphRuntime] failed to lay out line ${request.lineIndex}:`,
          err,
        );
        return null;
      }
    },
    [bumpVersion, maybeEscalate, selectionFor],
  );

  return useMemo(
    (): GlyphRuntime => ({
      status,
      error,
      escalationError,
      shaper: shaperRef.current,
      pathCache: pathCacheRef.current,
      selectionFor,
      layoutLine,
      maybeEscalate,
      resetDocument,
      subscribe,
      getVersion,
    }),
    [
      status,
      error,
      escalationError,
      selectionFor,
      layoutLine,
      maybeEscalate,
      resetDocument,
      subscribe,
      getVersion,
    ],
  );
}

export function GlyphRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useCreateGlyphRuntime();
  return (
    <GlyphRuntimeContext.Provider value={runtime}>
      {children}
    </GlyphRuntimeContext.Provider>
  );
}

export function useGlyphRuntime(): GlyphRuntime {
  const runtime = useContext(GlyphRuntimeContext);
  if (!runtime) {
    throw new Error(
      "useGlyphRuntime must be used inside a <GlyphRuntimeProvider>.",
    );
  }
  return runtime;
}

/**
 * Re-renders the caller whenever the runtime's fonts or layouts change, so a
 * row that returned `null` earlier picks its layout up once it is ready.
 */
export function useGlyphRuntimeVersion(runtime: GlyphRuntime): number {
  return useSyncExternalStore(
    runtime.subscribe,
    runtime.getVersion,
    runtime.getVersion,
  );
}

/**
 * Viewport-responsive base font size, shared by every renderer so a document's
 * lines agree. Clamped so lyrics stay readable on a phone and do not become a
 * wall of text on a desktop.
 */
export function responsiveFontSize(width: number, height: number): number {
  const basis = Math.min(width, height * 1.6);
  return Math.max(22, Math.min(56, Math.round(basis / 16)));
}

/** Device pixel ratio, capped: a canvas per row makes uncapped DPR expensive. */
export function canvasPixelRatio(max = 2): number {
  if (typeof window === "undefined") return 1;
  return Math.min(max, window.devicePixelRatio || 1);
}
