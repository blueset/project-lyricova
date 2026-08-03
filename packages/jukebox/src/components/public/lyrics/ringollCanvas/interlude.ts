/**
 * Pure timing/geometry model for the Ringoll Canvas interlude indicator.
 *
 * During long instrumental gaps between sung lines, Apple Music-like Lyrics
 * (AMLL) shows a breathing three-dot indicator anchored above the upcoming
 * line. This module reproduces AMLL's behaviour as a set of deterministic,
 * dependency-free pure functions so the DOM renderer (built separately) can
 * consume plain numbers rather than re-deriving the timing math per frame.
 *
 * Provenance: transcribed and re-shaped from AMLL
 * `packages/core/src/lyric-player/base/index.ts`
 * (`updateInterludeState` -> `checkGap`) for {@link findInterludeGaps} /
 * {@link activeInterlude}, and
 * `packages/core/src/lyric-player/dom/interlude-dots.ts` for
 * {@link interludeDotsState} and the two easings.
 *
 * ## Units boundary (read this first)
 *
 * This codebase measures lyric-segment times in **seconds**
 * (`GlyphLyricSegment.startTime`/`endTime`), whereas AMLL's animation
 * constants are all in **milliseconds**. Rather than pick a single unit and
 * silently convert, we split the API along its two natural concerns and name
 * every parameter for its unit:
 *
 * - **Detection** ({@link findInterludeGaps}, {@link activeInterlude}) works in
 *   **seconds**, matching our segment model. Its `time` parameters are plain
 *   `time` (seconds). AMLL's ms thresholds (4000 ms / 250 ms / 20 ms) are
 *   exposed here as the seconds constants {@link MIN_INTERLUDE_GAP_SECONDS},
 *   {@link INTERLUDE_TRAILING_OFFSET_SECONDS} and
 *   {@link INTERLUDE_LOOKAHEAD_SECONDS}.
 * - **Choreography** ({@link interludeDotsState}) works in **milliseconds**,
 *   matching AMLL's constants verbatim. Its parameters are `elapsedMs` /
 *   `durationMs` so the unit is unambiguous.
 *
 * The DOM renderer bridges the two by multiplying by 1000 at the boundary,
 * e.g. `interludeDotsState((currentTime - gap.startTime) * 1000,
 * gap.duration * 1000)`.
 *
 * ## Differences from AMLL (intentional, documented)
 *
 * 1. **Static gap list.** AMLL recomputes the active gap window every frame
 *    inside `checkGap` and clamps its reported `startTime` to "now"
 *    (`Math.max(gapStart, time)`). We instead precompute the *static* gap
 *    geometry once with {@link findInterludeGaps} and answer "which gap is
 *    active at time `t`?" separately with {@link activeInterlude}. This is
 *    cleaner and equivalent for rendering: the only observable difference is on
 *    a seek *into* the middle of a gap, where AMLL would restart the dot
 *    animation from the seek point while we keep the animation phase anchored
 *    to the true gap start (a more consistent result for scrubbing).
 * 2. **Look-ahead placement.** AMLL folds a 20 ms look-ahead into the geometry
 *    (`time = currentTime + 20`). Because our geometry is static, we fold that
 *    same look-ahead into the *active test* ({@link activeInterlude}) instead,
 *    where it belongs as a scrubbing detail rather than a property of the gap.
 *
 * Everything here is deterministic and never throws: malformed input is
 * skipped, and degenerate durations collapse to a fully-hidden state rather
 * than producing `NaN`/`Infinity`.
 */

/** Clamps `value` to `[min, max]`, mapping `NaN` to `min` (never propagates). */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Clamps to `[0, 1]`, mapping `NaN` to `0`. */
function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** `max(0, value)`, mapping `NaN`/`-Infinity` to `0`. */
function clampPositive(value: number): number {
  return value > 0 ? value : 0;
}

// ---------------------------------------------------------------------------
// Part 1 - detection (seconds)
// ---------------------------------------------------------------------------

/**
 * Minimum qualifying gap length, in **seconds** (AMLL's `4000` ms threshold).
 * A silence shorter than this does not show the indicator.
 */
export const MIN_INTERLUDE_GAP_SECONDS = 4;

/**
 * How far *before* the upcoming line's start the gap ends, in **seconds**
 * (AMLL's `250` ms). The indicator clears this early so the next line can lead
 * in without the dots overlapping it.
 */
export const INTERLUDE_TRAILING_OFFSET_SECONDS = 0.25;

/**
 * Look-ahead applied by {@link activeInterlude}, in **seconds** (AMLL's `20`
 * ms). The indicator becomes active ~20 ms before the gap's nominal start so
 * it is on screen the instant the previous line finishes.
 */
export const INTERLUDE_LOOKAHEAD_SECONDS = 0.02;

/**
 * Minimal structural view of a lyric line for interlude detection.
 *
 * Only `startTime`/`endTime` (seconds) are required, so a bare
 * `{ startTime, endTime }` is accepted. `role` is optional and follows the
 * codebase convention (`GlyphLyricSegment.role`: `0` = default/left, `1` =
 * right/duet, `2` = center); when the *upcoming* line is a duet/right-role
 * line the indicator is right-aligned (surfaced as {@link InterludeGap.isNextDuet}).
 */
export interface InterludeLine {
  /** Absolute start time (seconds). */
  startTime: number;
  /** Absolute end time (seconds). */
  endTime: number;
  /** Line role (`1` = right/duet). Optional; defaults to non-duet. */
  role?: number;
}

/** A qualifying instrumental gap between two lines, with static geometry. */
export interface InterludeGap {
  /**
   * Index of the line *preceding* the gap; `-1` for the gap before the first
   * line. The indicator is inserted after this line.
   */
  anchorLineIndex: number;
  /** Index of the upcoming line the indicator is anchored above (`anchorLineIndex + 1`). */
  nextLineIndex: number;
  /** Absolute gap start (seconds). `0` for the leading gap. */
  startTime: number;
  /** Absolute gap end (seconds); {@link INTERLUDE_TRAILING_OFFSET_SECONDS} before the next line. */
  endTime: number;
  /** `endTime - startTime` in seconds (always `>= MIN_INTERLUDE_GAP_SECONDS`). */
  duration: number;
  /** Whether the upcoming line is a duet/right-role line (`role === 1`) -> right-align. */
  isNextDuet: boolean;
}

/** A line is usable for gap geometry only when its times are finite and ordered. */
function isValidLine(line: InterludeLine | undefined): line is InterludeLine {
  return (
    line !== undefined &&
    Number.isFinite(line.startTime) &&
    Number.isFinite(line.endTime) &&
    line.endTime >= line.startTime
  );
}

/**
 * Computes the static list of qualifying interlude gaps for `lines`.
 *
 * For every boundary `k` from `-1` (the gap *before* the first line) through
 * `lines.length - 2` (the gap before the last line), the gap spans
 * `[gapStart, gapEnd]` where:
 *
 * - `gapStart` is `0` for the leading gap, otherwise `lines[k].endTime`;
 * - `gapEnd = max(gapStart, lines[k + 1].startTime - INTERLUDE_TRAILING_OFFSET_SECONDS)`.
 *
 * A gap is emitted only when `gapEnd - gapStart >= MIN_INTERLUDE_GAP_SECONDS`.
 * There is deliberately no gap *after* the last line (nothing to lead into).
 *
 * Robustness: input is never assumed sorted and this never throws. A boundary
 * is skipped when a bounding line is malformed (non-finite time, or
 * `endTime < startTime`); overlapping/out-of-order lines collapse the `max(...)`
 * to a zero/negative-length window and fall below the threshold, so they are
 * skipped too. Original line indices are preserved (we never sort), so
 * `anchorLineIndex`/`nextLineIndex` always refer to positions in the input.
 */
export function findInterludeGaps(
  lines: readonly InterludeLine[],
): InterludeGap[] {
  const gaps: InterludeGap[] = [];
  const lastBoundary = lines.length - 2;

  for (let k = -1; k <= lastBoundary; k += 1) {
    const nextLineIndex = k + 1;
    const next = lines[nextLineIndex];
    if (!isValidLine(next)) continue;

    let gapStart: number;
    if (k === -1) {
      gapStart = 0;
    } else {
      const prev = lines[k];
      if (!isValidLine(prev)) continue;
      gapStart = prev.endTime;
    }

    const gapEnd = Math.max(
      gapStart,
      next.startTime - INTERLUDE_TRAILING_OFFSET_SECONDS,
    );
    if (!Number.isFinite(gapStart) || !Number.isFinite(gapEnd)) continue;

    const duration = gapEnd - gapStart;
    // `>=` (not `>`): a gap exactly at the threshold qualifies. `NaN` fails
    // this test, so degenerate windows are skipped rather than emitted.
    if (!(duration >= MIN_INTERLUDE_GAP_SECONDS)) continue;

    gaps.push({
      anchorLineIndex: k,
      nextLineIndex,
      startTime: gapStart,
      endTime: gapEnd,
      duration,
      isNextDuet: next.role === 1,
    });
  }

  return gaps;
}

/**
 * Returns the gap active at playback `time` (seconds), or `null`.
 *
 * A gap is active when `time + INTERLUDE_LOOKAHEAD_SECONDS` lies strictly
 * inside `(startTime, endTime)` - matching AMLL's `gapStart < t && gapEnd > t`
 * with the 20 ms look-ahead folded in (see the module note on look-ahead
 * placement). Boundaries are exclusive, so the indicator is not active exactly
 * at a gap's endpoints. Gaps produced by {@link findInterludeGaps} are disjoint,
 * so at most one can match; the first match is returned. A non-finite `time`
 * yields `null` (all comparisons fail) rather than throwing.
 */
export function activeInterlude(
  gaps: readonly InterludeGap[],
  time: number,
): InterludeGap | null {
  const t = time + INTERLUDE_LOOKAHEAD_SECONDS;
  for (const gap of gaps) {
    if (gap.startTime < t && t < gap.endTime) return gap;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Part 2 - choreography (milliseconds)
// ---------------------------------------------------------------------------

/** Number of dots in the indicator. */
export const INTERLUDE_DOT_COUNT = 3;

/**
 * Per-dot diameter, expressed as a CSS `clamp(min, preferred, max)` in
 * structured form so the DOM renderer can build the rule itself: the dot is
 * `1vh`, floored at `0.5em` and capped at `3em`.
 */
export const INTERLUDE_DOT_DIAMETER = {
  min: { value: 0.5, unit: "em" },
  preferred: { value: 1, unit: "vh" },
  max: { value: 3, unit: "em" },
} as const;

/** Gap between adjacent dots, in `em`. */
export const INTERLUDE_DOT_GAP_EM = 0.25;

/**
 * Vertical offset of the indicator above the upcoming line, as a fraction of
 * font size (AMLL's `dotMargin = fontSize * 0.4`). See
 * {@link interludeAnchorOffsetPx}.
 */
export const INTERLUDE_ANCHOR_OFFSET_RATIO = 0.4;

/**
 * Target breathing period, in **milliseconds** (AMLL's
 * `targetBreatheDuration`). The actual period is rounded so a whole number of
 * breaths fits the interlude (see {@link interludeDotsState}).
 */
export const INTERLUDE_TARGET_BREATHE_MS = 1500;

/**
 * Constant size multiplier applied to the group scale (AMLL's `* 0.7`). Always
 * present in {@link InterludeDotsState.scale}.
 */
export const INTERLUDE_DOT_SIZE_MULTIPLIER = 0.7;

// Internal choreography timing thresholds (milliseconds), named for clarity.
/** Grow-in completes by this elapsed time. */
const GROW_IN_MS = 2000;
/** Group alpha is fully hidden before this elapsed time. */
const OPACITY_RAMP_START_MS = 500;
/** Group alpha finishes ramping to 1 at this elapsed time. */
const OPACITY_RAMP_END_MS = 1000;
/** End flourish (shrink + anticipation bump) occupies the final this-many ms. */
const END_FLOURISH_MS = 750;
/** Fade-out occupies the final this-many ms. */
const FADE_OUT_MS = 375;
/** The per-dot left-to-right fill-in spans `duration - DOTS_TAIL_MS`. */
const DOTS_TAIL_MS = 750;

/**
 * `easeOutExpo` easing (AMLL). `easeOutExpo(0) === 0`, `easeOutExpo(1) === 1`,
 * rising very steeply at first. Used for the dots' grow-in.
 */
export function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - 2 ** (-10 * x);
}

/**
 * `easeInOutBack` easing (AMLL). `easeInOutBack(0) === 0`,
 * `easeInOutBack(1) === 1`, and it deliberately **overshoots below 0** early in
 * the first half (and above 1 late in the second). The interlude end flourish
 * relies on that negative dip to produce a small *anticipation bump* just
 * before the group collapses - see {@link interludeDotsState}.
 */
export function easeInOutBack(x: number): number {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return x < 0.5
    ? ((2 * x) ** 2 * ((c2 + 1) * 2 * x - c2)) / 2
    : ((2 * x - 2) ** 2 * ((c2 + 1) * (2 * x - 2) + c2) + 2) / 2;
}

/** Per-frame render state for the three-dot interlude indicator. */
export interface InterludeDotsState {
  /**
   * Group scale, already including the {@link INTERLUDE_DOT_SIZE_MULTIPLIER}
   * (`0.7`). `0` when the interlude has finished (`elapsedMs > durationMs`) or
   * is degenerate.
   */
  scale: number;
  /** Group alpha in `[0, 1]` (AMLL's `globalOpacity`). */
  opacity: number;
  /**
   * Per-dot alpha in `[0, 1]`, **already multiplied by {@link opacity}**, one
   * per dot, filling left-to-right. Always length {@link INTERLUDE_DOT_COUNT}
   * (`3`). Apply these directly to the dots and keep the container at opacity
   * `1`; {@link opacity} is exposed separately only for renderers that would
   * rather set a container alpha and derive relative dot alphas.
   */
  dotOpacities: readonly [number, number, number];
}

/** A fully-hidden state (finished/degenerate). Shared shape, fresh object each call. */
function hiddenDotsState(): InterludeDotsState {
  return { scale: 0, opacity: 0, dotOpacities: [0, 0, 0] };
}

/**
 * Computes the {@link InterludeDotsState} for the indicator, given `elapsedMs`
 * into the interlude and its total `durationMs` (both **milliseconds**).
 *
 * Reproduces AMLL's `InterludeDots.update` exactly for valid inputs:
 *
 * - **Breathing**: the group scale oscillates +/-5% around 1 with a period
 *   rounded so a whole number of breaths fits (`B = D / ceil(D / 1500)`).
 * - **Grow-in**: for the first {@link GROW_IN_MS} ms the scale is multiplied by
 *   {@link easeOutExpo}, so the group swells from nothing to full size.
 * - **Opacity ramp**: the group alpha is `0` before {@link OPACITY_RAMP_START_MS}
 *   ms, then ramps linearly to `1` by {@link OPACITY_RAMP_END_MS} ms.
 * - **End flourish**: in the final {@link END_FLOURISH_MS} ms the scale is
 *   multiplied by `1 - easeInOutBack(x)` with `x` sweeping only `0 -> 0.5`
 *   (note the `/ 750 / 2`), so the group shrinks to roughly *half* - not zero -
 *   and, because {@link easeInOutBack} dips negative first, briefly *grows*
 *   (an anticipation bump) before collapsing. This quirk is intentional.
 * - **Fade-out**: in the final {@link FADE_OUT_MS} ms the group alpha fades to `0`.
 * - **Dots**: the three dots light up left-to-right across
 *   `Dd = max(0, D - 750)` ms, each clamped to `[0.25, 1]`, then multiplied by
 *   the group alpha.
 *
 * Degenerate handling (never returns `NaN`/`Infinity`):
 * - `durationMs <= 0` -> fully hidden (no division by zero, no breathing period).
 * - `elapsedMs < 0` -> fully hidden (the indicator is not on screen yet).
 * - `elapsedMs > durationMs` -> fully hidden (finished; matches AMLL's `scale(0)`).
 * - Very short interludes where `Dd <= 0` (i.e. `durationMs <= 750`): the
 *   per-dot fill divides by `Dd`, so we treat each dot as fully filled
 *   (`rawDotOpacity = 1`, the limit of the formula as `Dd -> 0+`), then still
 *   modulate by the group alpha.
 */
export function interludeDotsState(
  elapsedMs: number,
  durationMs: number,
): InterludeDotsState {
  // Guard degenerate durations and out-of-range elapsed up-front so the main
  // path only ever runs on finite, in-range inputs. A non-finite duration
  // would make the breathing period `NaN`, so it is rejected here.
  if (!Number.isFinite(durationMs) || durationMs <= 0) return hiddenDotsState();
  if (!(elapsedMs >= 0)) return hiddenDotsState();
  if (elapsedMs > durationMs) return hiddenDotsState();

  const d = elapsedMs;
  const D = durationMs;
  const remaining = D - d;

  // Breathing: round the period so a whole number of breaths fits the gap.
  const breatheDuration = D / Math.ceil(D / INTERLUDE_TARGET_BREATHE_MS);

  let scale = 1;
  scale *= Math.sin(1.5 * Math.PI - (d / breatheDuration) * 2) / 20 + 1;

  // Grow-in.
  if (d < GROW_IN_MS) {
    scale *= easeOutExpo(d / GROW_IN_MS);
  }

  // Group alpha ramp.
  let globalOpacity = 1;
  if (d < OPACITY_RAMP_START_MS) {
    globalOpacity = 0;
  } else if (d < OPACITY_RAMP_END_MS) {
    globalOpacity *=
      (d - OPACITY_RAMP_START_MS) /
      (OPACITY_RAMP_END_MS - OPACITY_RAMP_START_MS);
  }

  // End flourish: shrink to ~half with an anticipation bump (x only reaches 0.5).
  if (remaining < END_FLOURISH_MS) {
    scale *=
      1 - easeInOutBack((END_FLOURISH_MS - remaining) / END_FLOURISH_MS / 2);
  }

  // Fade-out.
  if (remaining < FADE_OUT_MS) {
    globalOpacity *= clamp01(remaining / FADE_OUT_MS);
  }

  const dotsDuration = clampPositive(D - DOTS_TAIL_MS);
  scale = clampPositive(scale) * INTERLUDE_DOT_SIZE_MULTIPLIER;

  const dotOpacities = [0, 0, 0] as [number, number, number];
  for (let k = 0; k < INTERLUDE_DOT_COUNT; k += 1) {
    // As `dotsDuration -> 0+` the raw fill tends to its ceiling for any d > 0,
    // so a zero/negative window means "already fully filled" (avoids /0 -> NaN).
    const rawDotOpacity =
      dotsDuration > 0
        ? clamp(
            (((d - (k * dotsDuration) / INTERLUDE_DOT_COUNT) *
              INTERLUDE_DOT_COUNT) /
              dotsDuration) *
              0.75,
            0.25,
            1,
          )
        : 1;
    dotOpacities[k] = clamp01(globalOpacity * rawDotOpacity);
  }

  return { scale, opacity: globalOpacity, dotOpacities };
}

/**
 * Vertical offset (px) of the indicator above the upcoming line for a given
 * `fontSizePx` (AMLL's `dotMargin = fontSize * 0.4`). Non-finite/negative
 * font sizes yield `0`.
 */
export function interludeAnchorOffsetPx(fontSizePx: number): number {
  if (!(fontSizePx > 0)) return 0;
  return fontSizePx * INTERLUDE_ANCHOR_OFFSET_RATIO;
}
