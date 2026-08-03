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
 * Bounds of Mona Sans's `opsz` axis. Values outside are clamped rather than
 * rejected: an out-of-range axis value is undefined behaviour in the shaper, and
 * a lyric font size should never silently disable optical sizing.
 */
export const OPSZ_MIN = 0;
export const OPSZ_MAX = 100;

/**
 * The axis list to shape and paint `fontSize` (CSS px) with.
 *
 * ## Why `opsz` tracks the size
 *
 * Mona Sans exposes an `opsz` axis spanning `0-100` whose **default is `0`**,
 * while all 160 of its named instances sit at `72`. Leaving it at the default
 * therefore rendered Latin at an optical size the font was never designed for -
 * measurably looser and lighter (at 22 px, `opsz=0` is 7.5% wider and 5.5% less
 * dense than tracking the size).
 *
 * Following the *actual* size is what an optical size axis is for, and matches
 * CSS `font-optical-sizing: auto`, which feeds the used font size straight into
 * `opsz`. It also keeps small text deliberately a little looser than display
 * text, which is the legibility behaviour the axis exists to provide - at 56 px
 * this is indistinguishable from pinning `72`, while at 22 px it is correctly
 * more open.
 *
 * Source Han Sans has no `opsz` axis; unknown axes are ignored per face, so one
 * list is safe for a mixed chain.
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
