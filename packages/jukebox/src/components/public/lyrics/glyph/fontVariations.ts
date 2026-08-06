/**
 * Variable-font axis settings shared by every canvas lyrics renderer.
 *
 * Kept free of React (and of the runtime provider) so the painters, the layout
 * helpers and the Rust-backed shaper wrappers can all derive the exact same
 * axis list from a size without importing the runtime.
 */

/** Weight every canvas renderer shapes with. */
export const GLYPH_WEIGHT = 600;

/**
 * Sanity bounds for the `opsz` value handed to the shaper.
 *
 * These are **not** any one font's axis range - those differ per face (Inter's
 * `opsz` is 14-32, Mona Sans' was 0-100) and the shaper clamps each face to its
 * own range, verified: passing `opsz=60` to Inter renders byte-identically to
 * `opsz=32`. These bounds only keep a nonsensical size (negative, or a runaway
 * layout number) from reaching the shaper at all.
 */
export const OPSZ_MIN = 0;
export const OPSZ_MAX = 100;

/**
 * The axis list to shape and paint `fontSize` (CSS px) with.
 *
 * ## Why `opsz` tracks the size
 *
 * Following the *actual* size is what an optical size axis is for, and matches
 * CSS `font-optical-sizing: auto`, which feeds the used font size straight into
 * `opsz`. It keeps small text deliberately a little looser than display text,
 * which is the legibility behaviour the axis exists to provide.
 *
 * The alternative - leaving the axis alone - is actively wrong, because a
 * font's `opsz` default need not be a size anyone renders at. Mona Sans
 * defaulted to `0` though all 160 of its named instances sat at `72`, which
 * rendered Latin measurably looser and lighter (at 22 px, `opsz=0` was 7.5%
 * wider and 5.5% less dense than tracking the size).
 *
 * Axis ranges differ per face (Inter 14-32, Mona Sans 0-100) and the shaper
 * clamps to each face's own range, so the real size can be passed to all of
 * them. Source Han Sans has no `opsz` axis at all; unknown axes are ignored per
 * face, so one list is safe for a mixed chain.
 *
 * Non-finite or non-positive sizes fall back to the axis minimum so the caller
 * never has to pre-validate.
 */
export function glyphVariations(fontSize: number): readonly string[] {
  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : OPSZ_MIN;
  const opsz = Math.min(OPSZ_MAX, Math.max(OPSZ_MIN, size));
  // Rounded so the memo (and the glyph-outline cache, which keys on the joined
  // list) sees a small set of stable keys instead of one per sub-pixel size.
  const key = Math.round(opsz * 100) / 100;
  const cached = memo.get(key);
  if (cached) return cached;
  const value = Object.freeze([`wght=${GLYPH_WEIGHT}`, `opsz=${key}`]);
  memo.set(key, value);
  return value;
}

/**
 * Painting calls {@link glyphVariations} per cluster, per frame, so the arrays
 * are memoized by rounded size: identical input yields an identical (frozen)
 * array, which also keeps the outline cache key stable.
 */
const memo = new Map<number, readonly string[]>();
