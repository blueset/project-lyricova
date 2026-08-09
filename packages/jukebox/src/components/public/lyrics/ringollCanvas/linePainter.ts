import type { LayoutLine, ShapedCluster } from "@lyricova/glyph-renderer";
import {
  clusterFillExtent,
  glyphFlipMatrix,
  karaokeFillClip,
} from "../glyph/canvasGlyphGeometry";
import type {
  ClusterTransform,
  FillDirection,
  FillExtent,
} from "../glyph/canvasGlyphGeometry";
import { drawCluster } from "../glyph/canvasGlyphRenderer";
import { glyphVariations } from "../glyph/fontVariations";
import type {
  ClusterRenderStyle,
  GlyphCanvasContext,
} from "../glyph/canvasGlyphRenderer";
import type { GlyphPathCache } from "../glyph/glyphOutlineCache";
import { alignmentOffset } from "../glyph/glyphCanvasLayout";
import { clusterFill } from "../glyph/karaokeTiming";
import type { SegmentAlignment } from "../glyph/lyricSegments";
import type { RubyLayoutResult, RubyPlacement } from "../glyph/types";
import {
  BASE_FLOAT_RISE_EM,
  BASE_FLOAT_RISE_MINOR_EM,
  BOB_AMPLITUDE_EM,
  BOB_AMPLITUDE_MINOR_EM,
  BOB_LEAD_MS,
  baseFloatOffsetEm,
  charEmphasis,
  emphasisBobOffsetEm,
  emphasisParams,
  EMPHASIS_TRANSIENT_DURATION_FACTOR,
  EMPHASIS_STAGGER_DIVISOR,
  shouldEmphasize,
  type EmphasisParams,
} from "./emphasis";
import { wordProgress, type LyricWord } from "./wordModel";

/**
 * Pure, canvas-agnostic paint logic for one lyric line of the Ringoll Canvas
 * renderer.
 *
 * {@link GlyphLineCanvas} owns the `<canvas>`, the media-clock wiring and the
 * device-pixel/padding transform; this module owns the *decision* of how each
 * shaped cluster (and each ruby run) should look at a given playback time. That
 * split is deliberate: the decision logic is where every Apple Music-like
 * Lyrics (AMLL) behaviour lives - the soft karaoke sweep, the per-syllable
 * emphasis glow, the persistent word float - and keeping it out of React lets
 * it be unit-tested against numbers instead of pixels.
 *
 * Nothing here holds timing state, reads a clock, or touches React: given a
 * laid-out line, its word model and a time, {@link resolveClusterStyle} returns
 * a {@link ClusterRenderStyle} and {@link paintLine} walks the layout drawing
 * each cluster. Two identical calls produce identical canvas ops.
 *
 * ## Units
 *
 * {@link LyricWord} times (and `startTime`/`endTime`) are **seconds** - they
 * come straight from the segment/word model. The emphasis math in `emphasis.ts`
 * is authored in **milliseconds**, so this module converts once, at the
 * boundary (`time * 1000`), and passes milliseconds inward. Every em-relative
 * offset returned by the emphasis model is multiplied by `fontSize` here to
 * reach layout units.
 */

/**
 * Soft karaoke sweep band width as a fraction of the base font size.
 *
 * AMLL fades the sung/unsung boundary across roughly the word *height*
 * (`word height x 0.5` with its ~1.2 line-height, i.e. ~0.6 em). We express it
 * directly against the font size instead of a measured line box, which is the
 * same order of magnitude and stable across scripts.
 */
export const SWEEP_FADE_RATIO = 0.5;

/** Fully-sung glyph alpha (AMLL reveals sung text at full opacity). */
export const SUNG_ALPHA = 1;
/** Not-yet-sung glyph alpha (AMLL holds unsung text dim but legible). */
export const UNSUNG_ALPHA = 0.4;

/** Default sung (active) colour: white at {@link SUNG_ALPHA}. */
export const SUNG_COLOR = `rgba(255, 255, 255, ${SUNG_ALPHA})`;
/** Default unsung (inactive) colour: white at {@link UNSUNG_ALPHA}. */
export const UNSUNG_COLOR = `rgba(255, 255, 255, ${UNSUNG_ALPHA})`;

/**
 * Line-level alpha for a line that is not the active one.
 *
 * **Deviation from AMLL,** which dims an inactive line to `0.2` *on top of* the
 * per-cluster sung/unsung colours. Here it is `1`, so an inactive line paints at
 * exactly its cluster colour: a future line is entirely unsung and therefore
 * lands on {@link UNSUNG_COLOR} - the same colour as the not-yet-sung portion of
 * the active line, which is what makes the reveal read as one continuous
 * boundary sweeping down the page rather than each line having its own palette.
 *
 * Ringoll's row chrome already separates inactive lines by depth: the spring
 * applies `opacity: 0.5` to passed lines and a distance-proportional blur to
 * every non-active row. Multiplying AMLL's `0.2` on top of that made future
 * lines effectively `0.08` alpha - illegible.
 */
export const INACTIVE_LINE_ALPHA = 1;

/** Emphasis glow colour - AMLL blooms a white halo behind held syllables. */
export const GLOW_COLOR = "#ffffff";

/** The soft sweep band width, in layout units, for a given base font size. */
export function sweepFadeWidth(fontSize: number): number {
  return fontSize * SWEEP_FADE_RATIO;
}

export interface LineRevealParams {
  /** Per-word timing model (empty for an untimed or prefix-only line). */
  words: readonly LyricWord[];
  /** Current playback time, in **seconds**. */
  time: number;
  /** Line content length, in UTF-16 code units. */
  contentLength: number;
  /** Absolute reveal start time (seconds); untimed lines step here. */
  startTime: number;
  /** Authored line end time (seconds); untimed whole-line reveal ignores it. */
  endTime: number;
  /** UTF-16 prefix revealed immediately at {@link startTime}. */
  leadingRevealEnd?: number;
}

/**
 * The continuous revealed logical offset (a fractional UTF-16 position in
 * `[0, contentLength]`) of the sweep front at `time`.
 *
 * For a timed line this is driven by the word model: the front sits at the
 * right edge of every finished word, interpolates *linearly* across the one
 * word currently being sung (via {@link wordProgress}, mapped onto that word's
 * own UTF-16 range), and holds otherwise - which is exactly how a word's front
 * meets the next at their shared boundary. An untimed line has no authored
 * internal pacing, so it steps from fully unsung to fully sung at its authored
 * {@link LineRevealParams.startTime}.
 */
export function lineRevealedOffset(params: LineRevealParams): number {
  const {
    words,
    time,
    contentLength,
    startTime,
    leadingRevealEnd = 0,
  } = params;
  const initialReveal = Number.isFinite(leadingRevealEnd)
    ? Math.min(contentLength, Math.max(0, leadingRevealEnd))
    : 0;
  if (words.length === 0) {
    return time < startTime
      ? 0
      : initialReveal > 0
        ? initialReveal
        : contentLength;
  }

  // Words are ordered by index and (running-max normalised) time, so the first
  // word that has not finished bounds the front: earlier words are fully swept,
  // the active word interpolates, and a not-yet-started word stops the walk
  // (the front holds at the previous word's end through any inter-word gap).
  if (time < startTime) return 0;

  let revealed = initialReveal;
  for (const word of words) {
    const [start, end] = word.utf16Range;
    if (time >= word.endTime) {
      revealed = end;
    } else if (time <= word.startTime) {
      break;
    } else {
      revealed = start + wordProgress(word, time) * (end - start);
      break;
    }
  }
  return revealed;
}

/**
 * Absolute time when a line's transient emphasis glow/bob is guaranteed to
 * have settled. Persistent base float is intentionally excluded because its
 * final pose can be cached once the transient effects reach rest.
 *
 * AMLL lets element emphasis animations continue after the lyric line itself
 * is disabled. The bob starts 400 ms early but lasts `1.4 * du` from each
 * cluster's staggered start, so long words can settle later than the glow.
 */
export function lineTransientAnimationEndTime(
  words: readonly LyricWord[],
  content: string,
): number {
  let endTime = Number.NEGATIVE_INFINITY;
  for (const word of words) {
    const [start, end] = word.utf16Range;
    const wordText = content.slice(start, end);
    if (!shouldEmphasize(word, wordText)) continue;
    const params = emphasisParams(word.duration * 1000, word.isLast);
    // Before layout resolves, UTF-16 length is a safe upper bound for the
    // shaped-cluster count: ligatures/combining sequences may merge units, not
    // create more source units. Overestimating only extends repaint slightly.
    const charCount = Math.max(1, wordText.trim().length);
    const lastStaggerMs =
      (params.durationMs / (EMPHASIS_STAGGER_DIVISOR * charCount)) *
      (charCount - 1);
    const glowEndMs = lastStaggerMs + params.durationMs;
    const bobEndMs =
      lastStaggerMs -
      BOB_LEAD_MS +
      params.durationMs * EMPHASIS_TRANSIENT_DURATION_FACTOR;
    endTime = Math.max(
      endTime,
      word.startTime + Math.max(glowEndMs, bobEndMs) / 1000,
    );
  }
  return endTime;
}

/**
 * Absolute time when reversing every word's persistent base float at
 * `deactivationTime` has returned the line to rest.
 *
 * Web Animations reversal runs from each animation's current time, not always
 * from its full duration. The remaining reverse time is therefore the clamped
 * elapsed portion of that word's `max(1s, duration)` float clock.
 */
export function lineFloatDescentEndTime(
  words: readonly LyricWord[],
  deactivationTime: number,
): number {
  if (!Number.isFinite(deactivationTime) || words.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  let endTime = deactivationTime;
  for (const word of words) {
    const duration = Number.isFinite(word.duration)
      ? Math.max(1, word.duration)
      : 1;
    const wordStartTime = Number.isFinite(word.startTime)
      ? word.startTime
      : deactivationTime;
    const animationTimeAtDeactivate = Math.min(
      duration,
      Math.max(0, deactivationTime - wordStartTime),
    );
    endTime = Math.max(endTime, deactivationTime + animationTimeAtDeactivate);
  }
  return endTime;
}

/** The `0..1` karaoke fill fraction for a ruby annotation's base UTF-16 range. */
export function rubyRevealFraction(
  ruby: RubyPlacement,
  revealed: number,
): number {
  const [start, end] = ruby.annotation.utf16Range;
  return clusterFill(revealed, start, end);
}

/** Per-cluster emphasis/float context, precomputed once per word. */
export interface ClusterWordContext {
  /** The word this cluster belongs to (by its UTF-16 start offset). */
  word: LyricWord;
  /** Index of this cluster among its word's non-whitespace clusters (logical order). */
  charIndex: number;
  /** Number of non-whitespace clusters in the word (the emphasis stagger's `n`). */
  charCount: number;
  /** Whether the word qualifies for the emphasis animation (see `shouldEmphasize`). */
  emphasized: boolean;
  /** The word's peak emphasis parameters (shared by every character). */
  params: EmphasisParams;
}

/**
 * Buckets every non-whitespace cluster of a laid-out line into the word that
 * contains its UTF-16 start, assigning a logical `charIndex`/`charCount` (for
 * the per-syllable emphasis stagger) and precomputing the word's
 * {@link EmphasisParams} and emphasis eligibility once.
 *
 * Whitespace clusters are excluded so the stagger's character count matches
 * AMLL's letter count (and so an inter-word space never counts as a syllable);
 * they still sweep, they just carry no emphasis/float. A cluster is attributed
 * by its `source.utf16Start`, so a cluster straddling a word boundary lands in
 * exactly one word. Clusters are gathered across every wrapped line of the
 * paragraph, so a word split by a line break still staggers as one unit.
 */
export function buildWordContexts(
  layout: RubyLayoutResult,
  content: string,
  words: readonly LyricWord[],
): Map<ShapedCluster, ClusterWordContext> {
  const contexts = new Map<ShapedCluster, ClusterWordContext>();
  for (const word of words) {
    const [wordStart, wordEnd] = word.utf16Range;
    const clusters: ShapedCluster[] = [];
    for (const placement of layout.lines) {
      for (const cluster of placement.line.clusters) {
        if (cluster.isWhitespace) continue;
        const at = cluster.source.utf16Start;
        if (at >= wordStart && at < wordEnd) clusters.push(cluster);
      }
    }
    if (clusters.length === 0) continue;
    clusters.sort((a, b) => a.source.utf16Start - b.source.utf16Start);

    const charCount = clusters.length;
    const wordText = content.slice(wordStart, wordEnd);
    const emphasized = shouldEmphasize(word, wordText);
    const params = emphasisParams(word.duration * 1000, word.isLast);
    clusters.forEach((cluster, charIndex) => {
      contexts.set(cluster, {
        word,
        charIndex,
        charCount,
        emphasized,
        params,
      });
    });
  }
  return contexts;
}

export interface ResolveClusterStyleParams {
  /** The cluster to style (only its source/direction/whitespace flag are read). */
  cluster: Pick<ShapedCluster, "source" | "direction" | "isWhitespace">;
  /** Continuous revealed offset from {@link lineRevealedOffset}. */
  revealed: number;
  /** Soft sweep band width in layout units (see {@link sweepFadeWidth}). */
  fadeWidth: number;
  /**
   * Shared sweep front in this cluster's local x coordinates. Omitted callers
   * retain the renderer's independent per-cluster fraction behaviour.
   */
  softEdgeFront?: number;
  /** Base font size in layout units (scales the em-relative emphasis/float). */
  fontSize: number;
  /** Current playback time, in **milliseconds** (`time * 1000`). */
  timeMs: number;
  /** When the line's persistent word floats began reversing, in milliseconds. */
  floatReverseStartMs?: number;
  /** Whether this is a background/minor line (doubles the float amplitude). */
  minor: boolean;
  /** Sung colour (its alpha carries {@link SUNG_ALPHA}). */
  activeColor: string;
  /** Unsung colour (its alpha carries {@link UNSUNG_ALPHA}). */
  inactiveColor: string;
  /** The cluster's word context, or `null` when it belongs to no word. */
  word?: ClusterWordContext | null;
}

/**
 * The full paint description for one cluster at one time.
 *
 * The sweep is always present: a `fillFraction` from {@link clusterFill} plus a
 * `softEdgeWidth` band, revealing the sung colour over the unsung one. On top
 * of that, a cluster that belongs to a word gets AMLL's motion:
 *
 * - **Float** - every word rises and stays lifted ({@link baseFloatOffsetEm}),
 *   doubled on a minor line.
 * - **Emphasis** (only when {@link shouldEmphasize} passed) - a staggered
 *   per-character swell, outward drift, extra lift and white glow
 *   ({@link charEmphasis}), plus a leading half-sine bob
 *   ({@link emphasisBobOffsetEm}).
 *
 * The three vertical contributions - base float, emphasis lift, and bob -
 * **sum** into `transform.translate.y`; they never replace one another (a
 * non-emphasised word simply contributes only the float).
 */
export function resolveClusterStyle(
  params: ResolveClusterStyleParams,
): ClusterRenderStyle {
  const {
    cluster,
    revealed,
    fadeWidth,
    fontSize,
    timeMs,
    minor,
    activeColor,
    inactiveColor,
  } = params;
  const word = params.word ?? null;

  const fillDirection: FillDirection =
    cluster.direction === "rtl" ? "rtl" : "ltr";
  const style: ClusterRenderStyle = {
    inactiveColor,
    activeColor,
    fillFraction: clusterFill(
      revealed,
      cluster.source.utf16Start,
      cluster.source.utf16End,
    ),
    fillDirection,
    softEdgeWidth: fadeWidth,
  };
  if (
    params.softEdgeFront !== undefined &&
    Number.isFinite(params.softEdgeFront)
  ) {
    style.softEdgeFront = params.softEdgeFront;
  }

  if (!word) return style;

  const wordStartMs = word.word.startTime * 1000;
  const wordDurationMs = word.word.duration * 1000;

  // Base float: every word of the line, always additive. Minor lines double
  // the amplitude (AMLL's `isBG` `up *= 2`).
  let offsetXEm = 0;
  let offsetYEm = baseFloatOffsetEm(timeMs, wordStartMs, wordDurationMs, {
    amplitudeEm: minor ? BASE_FLOAT_RISE_MINOR_EM : BASE_FLOAT_RISE_EM,
    reverseStartMs: params.floatReverseStartMs,
  });
  let scale = 1;
  let glow: ClusterRenderStyle["glow"];

  if (word.emphasized) {
    const emphasis = charEmphasis(
      word.params,
      word.charIndex,
      word.charCount,
      timeMs,
      wordStartMs,
    );
    // Emphasis lift and the leading bob add on top of the base float; the bob's
    // amplitude doubles on a minor line in lockstep with the float.
    offsetXEm += emphasis.offsetXEm;
    offsetYEm += emphasis.offsetYEm;
    offsetYEm += emphasisBobOffsetEm(word.params, timeMs, wordStartMs, {
      amplitudeEm: minor ? BOB_AMPLITUDE_MINOR_EM : BOB_AMPLITUDE_EM,
      charIndex: word.charIndex,
      charCount: word.charCount,
    });
    scale = emphasis.scale;
    if (emphasis.glowAlpha > 0 && emphasis.glowRadiusEm > 0) {
      glow = {
        blur: emphasis.glowRadiusEm * fontSize,
        color: GLOW_COLOR,
        alpha: emphasis.glowAlpha,
      };
    }
  }

  const translateX = offsetXEm * fontSize;
  const translateY = offsetYEm * fontSize;
  const hasTranslate = translateX !== 0 || translateY !== 0;
  const hasScale = scale !== 1;
  if (hasTranslate || hasScale) {
    const transform: ClusterTransform = {};
    if (hasTranslate) transform.translate = { x: translateX, y: translateY };
    if (hasScale) transform.scale = scale;
    style.transform = transform;
  }
  if (glow) style.glow = glow;

  return style;
}

export interface LinePaintOptions {
  /** The laid-out line (its wrapped rows, clusters and ruby placements). */
  layout: RubyLayoutResult;
  /** The line's base text; word ranges and content length index into it (UTF-16). */
  content: string;
  /** Per-word timing model (empty for an untimed or prefix-only line). */
  words: readonly LyricWord[];
  /** Current playback time, in **seconds**. */
  time: number;
  /** Absolute time when the line's base floats began reversing, in seconds. */
  floatReverseStartTime?: number;
  /** Absolute reveal start time (seconds); untimed lines step here. */
  startTime: number;
  /** Authored line end time (seconds), retained for the segment contract. */
  endTime: number;
  /** UTF-16 prefix revealed immediately at {@link startTime}. */
  leadingRevealEnd: number;
  /** Base font size the line was laid out at, in layout units. */
  fontSize: number;
  /** Whether this is a background/minor line (larger float amplitude). */
  minor: boolean;
  /**
   * Line-level alpha composed under the per-cluster colours: `1` when active,
   * {@link INACTIVE_LINE_ALPHA} otherwise. Kept as a knob even though both are
   * currently `1` (see {@link INACTIVE_LINE_ALPHA}).
   */
  lineAlpha: number;
  /** Sung colour. */
  activeColor: string;
  /** Unsung colour. */
  inactiveColor: string;
  /** Horizontal alignment of each wrapped row within {@link contentWidth}. */
  alignment: SegmentAlignment;
  /** Available width (layout units) the rows are aligned within. */
  contentWidth: number;
  /**
   * Font variation axes the line was laid out/shaped with, forwarded to the
   * glyph outline cache so painted outlines match the measured layout. The
   * component passes its `GLYPH_VARIATIONS`; kept an option so this module has
   * no dependency on the React runtime.
   */
  variations: readonly string[];
}

interface SweepClusterSpan {
  cluster: ShapedCluster;
  line: LayoutLine;
  lineIndex: number;
  clusterIndex: number;
  advance: number;
  pathStart: number;
  pathEnd: number;
}

function localFrontToPath(span: SweepClusterSpan, localFront: number): number {
  return span.cluster.direction === "rtl"
    ? span.pathStart + span.advance - localFront
    : span.pathStart + localFront;
}

/**
 * Maps the line's logical reveal position onto one continuous reading-path
 * coordinate, then converts that coordinate back to each cluster's local x.
 *
 * Cluster advances form the path in logical source order, including whitespace
 * clusters, so this changes only the soft band's spatial handoff: authored
 * timing, instant prefixes and whitespace pacing remain untouched. At a shared
 * source boundary the previous cluster receives a front at its reading-end
 * edge while the next receives the same front at its reading-start edge. The
 * renderer can therefore paint both halves of one gradient simultaneously.
 */
export function buildContinuousSweepFronts(
  layout: RubyLayoutResult,
  revealed: number,
  contentLength: number,
  fadeWidth: number,
): Map<ShapedCluster, number> {
  const spans: SweepClusterSpan[] = [];
  layout.lines.forEach((placement, lineIndex) => {
    const line: LayoutLine = {
      ...placement.line,
      top: placement.top,
      baseline: placement.baseline,
      height: placement.height,
    };
    placement.line.clusters.forEach((cluster, clusterIndex) => {
      spans.push({
        cluster,
        line,
        lineIndex,
        clusterIndex,
        advance:
          Number.isFinite(cluster.advance) && cluster.advance > 0
            ? cluster.advance
            : 0,
        pathStart: 0,
        pathEnd: 0,
      });
    });
  });

  spans.sort(
    (a, b) =>
      a.cluster.source.utf16Start - b.cluster.source.utf16Start ||
      a.cluster.source.utf16End - b.cluster.source.utf16End ||
      a.lineIndex - b.lineIndex ||
      a.clusterIndex - b.clusterIndex,
  );
  if (spans.length === 0) return new Map();

  let path = 0;
  for (const span of spans) {
    span.pathStart = path;
    path += span.advance;
    span.pathEnd = path;
  }

  const logicalEnd =
    Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;
  const logical = Number.isFinite(revealed)
    ? Math.min(logicalEnd, Math.max(0, revealed))
    : 0;
  const halfFade = Math.max(0, fadeWidth) / 2;
  const first = spans[0]!;
  const firstExtent = clusterFillExtent(first.cluster, first.line);
  const firstLocalFront =
    first.cluster.direction === "rtl"
      ? firstExtent.right + halfFade
      : firstExtent.left - halfFade;
  const startPathFront = localFrontToPath(first, firstLocalFront);
  const last = spans[spans.length - 1]!;
  const lastExtent = clusterFillExtent(last.cluster, last.line);
  const lastLocalFront =
    last.cluster.direction === "rtl"
      ? lastExtent.left - halfFade
      : lastExtent.right + halfFade;
  const endPathFront = localFrontToPath(last, lastLocalFront);

  let pathFront: number;
  if (logical <= 0) {
    pathFront = startPathFront;
  } else if (logical >= logicalEnd) {
    pathFront = endPathFront;
  } else {
    pathFront = startPathFront;
    for (const span of spans) {
      const { utf16Start, utf16End } = span.cluster.source;
      if (logical < utf16Start) break;
      if (logical <= utf16End) {
        const sourceLength = utf16End - utf16Start;
        const fraction =
          sourceLength > 0 ? (logical - utf16Start) / sourceLength : 1;
        const spanStart = span === first ? startPathFront : span.pathStart;
        const spanEnd = span === last ? endPathFront : span.pathEnd;
        pathFront = spanStart + fraction * (spanEnd - spanStart);
        break;
      }
      pathFront = span.pathEnd;
    }
  }

  const fronts = new Map<ShapedCluster, number>();
  for (const span of spans) {
    const traveled = pathFront - span.pathStart;
    const localFront =
      span.cluster.direction === "rtl" ? span.advance - traveled : traveled;
    fronts.set(span.cluster, localFront);
  }
  return fronts;
}

/**
 * Paints one lyric line onto `ctx`, which the caller must have already put in
 * *paragraph space*: the current transform maps `(0, 0)` to the paragraph's
 * top-left (after any device-pixel-ratio and glow-padding offset). Each wrapped
 * row is then shifted horizontally by its alignment offset (plus ruby overhang
 * `contentOffsetX`) while its vertical position rides the row's own
 * paragraph-relative baseline, matching how the layout stacks rows.
 *
 * The caller owns clearing the canvas and the outer transform; `paintLine` only
 * multiplies per-row/per-cluster transforms into it. It is stateless: the same
 * inputs always emit the same canvas ops.
 */
export function paintLine(
  ctx: GlyphCanvasContext,
  options: LinePaintOptions,
  cache: GlyphPathCache,
): void {
  const {
    layout,
    content,
    words,
    time,
    floatReverseStartTime,
    startTime,
    endTime,
    leadingRevealEnd,
    fontSize,
    minor,
    lineAlpha,
    activeColor,
    inactiveColor,
    alignment,
    contentWidth,
    variations,
  } = options;

  const fadeWidth = sweepFadeWidth(fontSize);
  const timeMs = time * 1000;
  const floatReverseStartMs =
    floatReverseStartTime !== undefined
      ? floatReverseStartTime * 1000
      : undefined;
  const revealed = lineRevealedOffset({
    words,
    time,
    contentLength: content.length,
    startTime,
    endTime,
    leadingRevealEnd,
  });
  const wordContexts = buildWordContexts(layout, content, words);
  const sweepFronts = buildContinuousSweepFronts(
    layout,
    revealed,
    content.length,
    fadeWidth,
  );

  for (const placement of layout.lines) {
    const alignX =
      alignmentOffset(alignment, contentWidth, placement.occupiedWidth) +
      placement.contentOffsetX;
    const line: LayoutLine = {
      ...placement.line,
      top: placement.top,
      baseline: placement.baseline,
      height: placement.height,
    };

    ctx.save();
    // Horizontal alignment only; the row's vertical offset is carried by its
    // paragraph-relative `baseline`, so it composes with the caller's origin.
    ctx.transform(1, 0, 0, 1, alignX, 0);

    for (const cluster of placement.line.clusters) {
      const style = resolveClusterStyle({
        cluster,
        revealed,
        fadeWidth,
        softEdgeFront: sweepFronts.get(cluster),
        fontSize,
        timeMs,
        floatReverseStartMs,
        minor,
        activeColor,
        inactiveColor,
        word: wordContexts.get(cluster) ?? null,
      });
      drawCluster(
        ctx,
        cluster,
        line,
        style,
        { cache, fontSize, variations },
        lineAlpha,
      );
    }

    for (const ruby of placement.rubies) {
      paintRubyPlacement(ctx, {
        ruby,
        lineTop: placement.top,
        cache,
        revealed,
        activeColor,
        inactiveColor,
        baseAlpha: lineAlpha,
      });
    }

    ctx.restore();
  }
}

interface PaintRubyParams {
  ruby: RubyPlacement;
  /** Paragraph-relative top of the wrapped row this ruby sits above. */
  lineTop: number;
  cache: GlyphPathCache;
  revealed: number;
  activeColor: string;
  inactiveColor: string;
  baseAlpha: number;
  /**
   * Axes for the ruby glyphs. Defaults to {@link glyphVariations} of the ruby's
   * own size - **not** the base line's, since a size-tracking axis such as
   * `opsz` must follow the text it is actually rendering.
   */
  rubyVariations?: readonly string[];
}

/**
 * Paints one ruby annotation's shaped runs, revealed with the *same* fraction
 * as the base range it annotates so furigana sweeps in step with its base text.
 *
 * The inactive pass paints every run; when fully revealed the active pass
 * repaints them solid (skipping the clip so no edge ink is missed), and while
 * partially revealed the active colour is clipped to the annotation's measured
 * ink box via the shared {@link karaokeFillClip}. Runs are drawn at their
 * line-relative pen positions, so the caller's per-row alignment transform
 * places them over their base text.
 */
function paintRubyPlacement(
  ctx: GlyphCanvasContext,
  params: PaintRubyParams,
): void {
  const {
    ruby,
    lineTop,
    cache,
    revealed,
    activeColor,
    inactiveColor,
    baseAlpha,
    rubyVariations,
  } = params;

  // Ruby renders far smaller than its base, so it gets its own optical size
  // rather than inheriting the base line's.
  const rubyAxes = rubyVariations ?? glyphVariations(ruby.fontSize);

  const xStart = ruby.inkLeft;
  const xEnd = ruby.inkRight;
  if (!Number.isFinite(xStart) || !Number.isFinite(xEnd) || xEnd <= xStart) {
    return;
  }
  const baselineY = lineTop + ruby.y;
  const fraction = rubyRevealFraction(ruby, revealed);

  const paintRuns = () => {
    for (const run of ruby.runs) {
      for (const glyph of run.glyphs) {
        const path = cache.getPath(
          glyph.fontId,
          glyph.glyphId,
          ruby.fontSize,
          rubyAxes,
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

  ctx.save();
  ctx.globalAlpha = baseAlpha;
  ctx.fillStyle = inactiveColor;
  paintRuns();

  if (fraction >= 1) {
    ctx.fillStyle = activeColor;
    paintRuns();
  } else if (fraction > 0) {
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
  ctx.restore();
}
