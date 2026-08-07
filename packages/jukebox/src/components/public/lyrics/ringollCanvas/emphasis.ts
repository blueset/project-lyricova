/**
 * Emphasised-syllable animation model for the Ringoll Canvas renderer.
 *
 * This reproduces Apple Music-like Lyrics' (AMLL) emphasis "glow": when a word
 * is held long enough, its glyphs swell, drift, glow and bob in a staggered
 * wave. Every constant here is taken directly from AMLL's own source
 * (`initEmphasizeAnimation` / `initFloatAnimation` / `makeEmpEasing` /
 * `shouldEmphasize`), so the feel matches note-for-note.
 *
 * **Units.** The upstream timing model is expressed in seconds - a
 * {@link import("./wordModel").LyricWord} and the underlying `RevealTag.time`
 * are absolute *seconds*. AMLL's animation constants, however, are authored in
 * *milliseconds*. Rather than let that ambiguity leak, every function here
 * commits to one convention and says so in its parameter names:
 * - {@link shouldEmphasize} reads `word.duration` in **seconds** (it consumes a
 *   `LyricWord` directly), comparing against AMLL's 1000 ms trigger as `1` s.
 * - Every other function takes **milliseconds** (`durationMs`, `timeMs`,
 *   `wordStartMs`, ...). Callers convert once, at the boundary, by multiplying
 *   the seconds-based model by 1000.
 *
 * Time inputs (`timeMs` / `wordStartMs`) only ever appear as a *difference*, so
 * they may share any common origin - absolute playback ms or line-relative ms -
 * as long as both use the same one.
 *
 * Everything is pure and deterministic; there is no dependency on a real clock,
 * the Web Animations API, or any third-party easing library.
 */

/** AMLL's emphasis trigger: a word held at least this long (seconds) may glow. */
const EMPHASIS_MIN_DURATION_SECONDS = 1;
/** The same trigger in milliseconds, and the floor AMLL clamps `du` to. */
const EMPHASIS_MIN_DURATION_MS = 1000;
/** Non-CJK words must be within this UTF-16 length window to emphasise. */
const NON_CJK_MIN_CHARS = 2;
const NON_CJK_MAX_CHARS = 7;
/** Emphasised bob: half-sine of this amplitude (em), leading the glow clock. */
export const BOB_AMPLITUDE_EM = 0.05;
/**
 * Background / minor lines double the bob amplitude (em), exactly as AMLL's
 * `isBG` branch applies `y *= 2` to the bob - mirroring the base float. Pass it
 * via {@link BaseFloatOptions.amplitudeEm}; a `minor` line MUST also pass
 * {@link BASE_FLOAT_RISE_MINOR_EM} to {@link baseFloatOffsetEm} for the same
 * line, so the two lifts double together (doubling one alone is a subtle bug).
 */
export const BOB_AMPLITUDE_MINOR_EM = 0.1;
/** The bob starts this many ms *before* the scale/glow clock so its peak leads. */
const BOB_LEAD_MS = 400;
/**
 * Upper duration factor for transient emphasis motion. AMLL's bob lasts
 * `1.4 * du`; the final staggered character glow ends just before the same
 * bound because its delay window is `< 0.4 * du`.
 */
export const EMPHASIS_TRANSIENT_DURATION_FACTOR = 1.4;

/**
 * Whether a word consists entirely of CJK-like script (Han ideographs,
 * Hiragana, Katakana or Hangul). AMLL exempts such words from the non-CJK
 * length window because a single held CJK glyph is a legitimate emphasis
 * target, whereas a lone Latin letter is usually noise.
 *
 * AMLL's own test is a code-point range (`\p{Unified_Ideograph}` plus
 * `\u0800-\u9FFC`, which happens to catch kana but not Hangul); we use a
 * cleaner Unicode *script* test that also covers Hangul, matching the prompt's
 * "CJK/kana/Hangul" intent.
 */
const CJK_LIKE =
  /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u;

function isCjkLike(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && CJK_LIKE.test(trimmed);
}

/** Clamps to `[0, 1]`, mapping `NaN` to `0`. */
function clamp01(value: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export interface ShouldEmphasizeOptions {
  /**
   * Enforce AMLL's 2-7 UTF-16 character window for non-CJK words. On by
   * default; CJK-like words are always exempt regardless of this flag. Turn it
   * off to emphasise purely on duration.
   */
  requireLengthWindow?: boolean;
}

/**
 * Whether `word` should receive the emphasis animation.
 *
 * The gate is duration first: the word must be held at least
 * {@link EMPHASIS_MIN_DURATION_SECONDS} (AMLL's 1000 ms). For non-CJK text a
 * length window then applies - AMLL only emphasises 2-7 character words, since
 * a single letter reads as a glitch and a long run would shimmer distractingly.
 * CJK-like words skip the window entirely.
 *
 * Note the unit: `word.duration` is in **seconds** (it comes straight from
 * {@link import("./wordModel").LyricWord}); the rest of this module is in
 * milliseconds.
 */
export function shouldEmphasize(
  word: { duration: number },
  text: string,
  options: ShouldEmphasizeOptions = {},
): boolean {
  const { requireLengthWindow = true } = options;
  // `!(x >= 1)` also rejects a `NaN` duration.
  if (!(word.duration >= EMPHASIS_MIN_DURATION_SECONDS)) return false;
  if (!requireLengthWindow) return true;
  if (isCjkLike(text)) return true;
  const length = text.trim().length;
  return length >= NON_CJK_MIN_CHARS && length <= NON_CJK_MAX_CHARS;
}

export interface EmphasisParams {
  /** Peak scale/offset magnitude, capped at `1.2`. */
  amount: number;
  /** Peak glow strength, capped at `0.8`. */
  blur: number;
  /**
   * The emphasis clock length in **milliseconds** - `max(1000, durationMs)`,
   * boosted by `x1.2` for a line's last word. This is the `du` every
   * per-character computation divides by, so it is returned for reuse.
   */
  durationMs: number;
}

/**
 * AMLL's magnitude shaping curve: it *compresses* long words
 * (`sqrt`, sub-linear growth past 1) and *expands* short ones (`v ** 3`,
 * near-silent below 1) so emphasis ramps in gently and then saturates.
 */
function shapeMagnitude(value: number): number {
  return value > 1 ? Math.sqrt(value) : value ** 3;
}

/**
 * Derives the peak {@link EmphasisParams} for a word of `durationMs`, boosting
 * a line's last word (`isLast`).
 *
 * Mirrors AMLL exactly:
 * ```
 * du = max(1000, durationMs)
 * amount = shape(du / 2000) * 0.6
 * blur   = shape(du / 3000) * 0.5
 * if (isLast) { amount *= 1.6; blur *= 1.5; du *= 1.2; }
 * amount = min(1.2, amount)
 * blur   = min(0.8, blur)
 * ```
 * `amount`/`blur` are shaped from the *pre-boost* `du`; the `x1.2` only
 * lengthens the returned clock, so a worked example is `du = 1000` (not last)
 * -> `amount = 0.075`, `blur ~= 0.0185`, and `du = 2000` -> `amount = 0.6`.
 */
export function emphasisParams(
  durationMs: number,
  isLast: boolean,
): EmphasisParams {
  let du = Math.max(EMPHASIS_MIN_DURATION_MS, durationMs);
  let amount = shapeMagnitude(du / 2000) * 0.6;
  let blur = shapeMagnitude(du / 3000) * 0.5;
  if (isLast) {
    amount *= 1.6;
    blur *= 1.5;
    du *= 1.2;
  }
  amount = Math.min(1.2, amount);
  blur = Math.min(0.8, blur);
  return { amount, blur, durationMs: du };
}

const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 1e-7;
const SUBDIVISION_MAX_ITERATIONS = 10;
const SPLINE_TABLE_SIZE = 11;
const SAMPLE_STEP_SIZE = 1 / (SPLINE_TABLE_SIZE - 1);

const bezierCoA = (a1: number, a2: number): number => 1 - 3 * a2 + 3 * a1;
const bezierCoB = (a1: number, a2: number): number => 3 * a2 - 6 * a1;
const bezierCoC = (a1: number): number => 3 * a1;

/** Cubic bezier component at parameter `t` for control values `a1`, `a2`. */
function calcBezier(t: number, a1: number, a2: number): number {
  return ((bezierCoA(a1, a2) * t + bezierCoB(a1, a2)) * t + bezierCoC(a1)) * t;
}

/** Its derivative, `d/dt`, used by the Newton-Raphson step. */
function bezierSlope(t: number, a1: number, a2: number): number {
  return (
    3 * bezierCoA(a1, a2) * t * t + 2 * bezierCoB(a1, a2) * t + bezierCoC(a1)
  );
}

/**
 * Builds a CSS-style cubic-bezier easing `y(x)` from control points
 * `(x1, y1)` and `(x2, y2)` (anchored at `(0, 0)` and `(1, 1)`).
 *
 * Because the curve is parameterised by `t` - not by `x` - evaluating it at a
 * given `x` requires inverting `x(t) = x` for `t`. This uses the standard,
 * dependency-free approach popularised by `bezier-easing`: a small precomputed
 * sample table for an initial guess, Newton-Raphson refinement where the slope
 * is well-conditioned, and a binary-subdivision (bisection) fallback where it
 * is too flat for Newton to converge. `cubicBezier(0, 0, 1, 1)` short-circuits
 * to the identity.
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  if (!(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1)) {
    throw new RangeError("cubicBezier x control points must be in [0, 1].");
  }
  if (x1 === y1 && x2 === y2) {
    return (t: number) => t;
  }

  const sampleValues = new Array<number>(SPLINE_TABLE_SIZE);
  for (let i = 0; i < SPLINE_TABLE_SIZE; i += 1) {
    sampleValues[i] = calcBezier(i * SAMPLE_STEP_SIZE, x1, x2);
  }

  const getTForX = (x: number): number => {
    let intervalStart = 0;
    let currentSample = 1;
    const lastSample = SPLINE_TABLE_SIZE - 1;
    for (
      ;
      currentSample !== lastSample && sampleValues[currentSample] <= x;
      currentSample += 1
    ) {
      intervalStart += SAMPLE_STEP_SIZE;
    }
    currentSample -= 1;

    const dist =
      (x - sampleValues[currentSample]) /
      (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    let guess = intervalStart + dist * SAMPLE_STEP_SIZE;

    const initialSlope = bezierSlope(guess, x1, x2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
        const currentSlope = bezierSlope(guess, x1, x2);
        if (currentSlope === 0) return guess;
        guess -= (calcBezier(guess, x1, x2) - x) / currentSlope;
      }
      return guess;
    }
    if (initialSlope === 0) return guess;

    let a = intervalStart;
    let b = intervalStart + SAMPLE_STEP_SIZE;
    let t = guess;
    let i = 0;
    let currentX: number;
    do {
      t = a + (b - a) / 2;
      currentX = calcBezier(t, x1, x2) - x;
      if (currentX > 0) {
        b = t;
      } else {
        a = t;
      }
      i += 1;
    } while (
      Math.abs(currentX) > SUBDIVISION_PRECISION &&
      i < SUBDIVISION_MAX_ITERATIONS
    );
    return t;
  };

  return (x: number): number => {
    // Guarantee the exact endpoints despite floating-point drift.
    if (x === 0) return 0;
    if (x === 1) return 1;
    return calcBezier(getTForX(x), y1, y2);
  };
}

/** The rising half of the emphasis envelope. */
const emphasisRise = cubicBezier(0.2, 0.4, 0.58, 1);
/** The falling half of the emphasis envelope. */
const emphasisFall = cubicBezier(0.3, 0, 0.58, 1);

/**
 * The emphasis envelope: a symmetric `0 -> 1 -> 0` pulse over `x` in `[0, 1]`
 * peaking at `x = 0.5`.
 *
 * It is stitched from two eased half-ramps - the input is remapped to fill
 * `[0, 1]` on each side of the midpoint, `emphasisRise` drives the first half
 * up to the peak and `emphasisFall` (inverted) drives the second half back
 * down - exactly as AMLL's `makeEmpEasing(0.5)`. `x` outside `[0, 1]` resolves
 * to `0`, so a glyph is at rest before and after its pulse.
 */
export function emphasisEnvelope(x: number): number {
  if (x < 0.5) return emphasisRise(clamp01(x / 0.5));
  return 1 - emphasisFall(clamp01((x - 0.5) / 0.5));
}

export interface CharEmphasis {
  /** Uniform scale (`1` at rest, `> 1` at the peak). */
  scale: number;
  /** Horizontal drift in em (spreads glyphs out from the word centre). */
  offsetXEm: number;
  /** Vertical lift in em (negative = up). */
  offsetYEm: number;
  /** Glow opacity in `[0, blur]` (`0` at rest). */
  glowAlpha: number;
  /** Glow blur radius in em (constant while emphasised; alpha carries the pulse). */
  glowRadiusEm: number;
}

/**
 * Per-character emphasis pose at `timeMs` for character `charIndex` of
 * `charCount` in a word that started at `wordStartMs`, given the word's
 * {@link EmphasisParams}.
 *
 * Each character is delayed by a stagger of `du / (2.5 * n) * i`, so the pulse
 * sweeps across the word left-to-right (later characters peak later). The
 * envelope `e` then scales the uniform swell, the outward horizontal drift
 * (glyphs left of centre move left, right of centre move right), the vertical
 * lift, and the glow's opacity. The glow *radius* is held constant - AMLL
 * varies only its alpha - so it is derived from `blur` alone.
 *
 * All offsets are in em; all times are in **milliseconds** and share the origin
 * of `wordStartMs`.
 */
export function charEmphasis(
  params: EmphasisParams,
  charIndex: number,
  charCount: number,
  timeMs: number,
  wordStartMs: number,
): CharEmphasis {
  const { amount, blur, durationMs: du } = params;
  const n = Math.max(1, charCount);
  const stagger = (du / (2.5 * n)) * charIndex;
  const e = emphasisEnvelope(clamp01((timeMs - (wordStartMs + stagger)) / du));
  return {
    scale: 1 + 0.1 * amount * e,
    offsetXEm: -0.03 * amount * e * (n / 2 - charIndex),
    offsetYEm: -0.025 * amount * e,
    glowAlpha: blur * e,
    glowRadiusEm: Math.min(0.3, blur * 0.3),
  };
}

/**
 * Base float amplitude (em) for a normal line's words - AMLL's
 * `initFloatAnimation` lifts every word by this much (`up = 0.05`).
 */
export const BASE_FLOAT_RISE_EM = 0.05;

/**
 * Base float amplitude (em) for background / minor lines: AMLL doubles it
 * (`up *= 2` when the line `isBG`). Pass this as
 * {@link BaseFloatOptions.amplitudeEm} for lines whose `minor` flag is set.
 */
export const BASE_FLOAT_RISE_MINOR_EM = 0.1;

/** CSS `ease-out` == `cubic-bezier(0, 0, 0.58, 1)`: fast, then slowing. */
const easeOut = cubicBezier(0, 0, 0.58, 1);

/**
 * Amplitude-override options shared by the two em-relative vertical lifts,
 * {@link baseFloatOffsetEm} and {@link emphasisBobOffsetEm}. Both default to
 * their normal-line amplitude; a background / `minor` line overrides **both**
 * with the matching `*_MINOR_EM` constant.
 *
 * The renderer makes one `amplitudeEm` decision per line from its `minor` flag,
 * so a future reader must keep the two lifts in lockstep: doubling one and not
 * the other desynchronises them - a subtle visual bug nobody would trace back.
 */
export interface BaseFloatOptions {
  /**
   * Peak lift in em. For {@link baseFloatOffsetEm} it defaults to
   * {@link BASE_FLOAT_RISE_EM} (`0.05`; minor {@link BASE_FLOAT_RISE_MINOR_EM}
   * `0.1`); for {@link emphasisBobOffsetEm} it defaults to
   * {@link BOB_AMPLITUDE_EM} (`0.05`; minor {@link BOB_AMPLITUDE_MINOR_EM}
   * `0.1`).
   */
  amplitudeEm?: number;
}

/**
 * The base float AMLL applies to **every** word of a karaoke-swept line -
 * emphasised or not. It is the single most-seen motion in the renderer, so its
 * two easy-to-get-wrong semantics are encoded (and tested) explicitly:
 *
 * 1. **One-way, persistent lift - not a `0 -> 1 -> 0` entrance.** The word
 *    rises from `0` to `-amplitudeEm` on a CSS `ease-out` curve over
 *    `max(1000, wordDurationMs)` ms and then *stays* lifted (AMLL uses
 *    `fill: both`). It never returns to identity. This is deliberately unlike
 *    the emphasis envelope and unlike the older `glyph/clusterAnimation.ts`
 *    reveal-front entrance PoC (px-based, proximity-keyed) - do not conflate
 *    the two.
 * 2. **Additive composition (`composite: "add"`).** A character's total
 *    vertical offset is the *sum* of three independent contributions: this base
 *    float, the per-character emphasis {@link CharEmphasis.offsetYEm}, and the
 *    {@link emphasisBobOffsetEm} lead bob. Callers must **add** them, never pick
 *    one; a non-emphasised word simply has the latter two at zero.
 *
 * The amplitude is **em-relative** so it scales with font size, and takes the
 * shared {@link BaseFloatOptions} override: the default is
 * {@link BASE_FLOAT_RISE_EM}; a background / `minor` line passes
 * {@link BASE_FLOAT_RISE_MINOR_EM} via `options.amplitudeEm` - and must pass
 * {@link BOB_AMPLITUDE_MINOR_EM} to {@link emphasisBobOffsetEm} for the same
 * line so both lifts double together.
 *
 * **Sign convention:** the result is `<= 0`. Canvas/screen space is y-down, so
 * an upward lift is *negative* y - the value is `0` at `wordStartMs` and
 * settles at `-amplitudeEm`. Apply it directly to a transform's y translation.
 *
 * `timeMs` and `wordStartMs` are in **milliseconds** and share one origin.
 */
export function baseFloatOffsetEm(
  timeMs: number,
  wordStartMs: number,
  wordDurationMs: number,
  options: BaseFloatOptions = {},
): number {
  const amplitudeEm = options.amplitudeEm ?? BASE_FLOAT_RISE_EM;
  const du = Math.max(EMPHASIS_MIN_DURATION_MS, wordDurationMs);
  const x = clamp01((timeMs - wordStartMs) / du);
  return -amplitudeEm * easeOut(x);
}

/**
 * The extra "bob" an *emphasised* word adds on top of the base float: a
 * half-sine dip peaking at `-amplitudeEm` over `1.4 x du`, started
 * {@link BOB_LEAD_MS} before the scale/glow clock so its peak *leads* the swell
 * - the glyph is already lifting as it flares.
 *
 * Like {@link baseFloatOffsetEm}, the amplitude is em-relative and takes the
 * same shared {@link BaseFloatOptions} override: it defaults to
 * {@link BOB_AMPLITUDE_EM} (`0.05`) and a background / `minor` line passes
 * {@link BOB_AMPLITUDE_MINOR_EM} (`0.1`), mirroring AMLL's `isBG` `y *= 2`. A
 * `minor` line must pass the `*_MINOR_EM` constant to **both** this function
 * and {@link baseFloatOffsetEm} so the two lifts stay proportional.
 *
 * AMLL staggers this per character identically to {@link charEmphasis}; we
 * model it at the word level (the `charIndex = 0` clock) because the lead
 * already dominates the visual effect. Returns em (`<= 0`; up is `-y`); times
 * are in **milliseconds** and share the origin of `wordStartMs`.
 *
 * A non-positive (or non-finite) `params.durationMs` short-circuits to `0`:
 * `du` is the denominator of the phase ratio, so `0` would divide to
 * `Infinity`/`NaN` and poison the canvas transform. {@link emphasisParams}
 * floors `du` at `1000` ms and never emits such a value, but this helper is
 * exported and takes an arbitrary {@link EmphasisParams}, so it guards itself.
 */
export function emphasisBobOffsetEm(
  params: EmphasisParams,
  timeMs: number,
  wordStartMs: number,
  options: BaseFloatOptions = {},
): number {
  if (!(params.durationMs > 0)) return 0;
  const amplitudeEm = options.amplitudeEm ?? BOB_AMPLITUDE_EM;
  const x = clamp01(
    (timeMs - (wordStartMs - BOB_LEAD_MS)) /
      (EMPHASIS_TRANSIENT_DURATION_FACTOR * params.durationMs),
  );
  return -amplitudeEm * Math.sin(Math.PI * x);
}
