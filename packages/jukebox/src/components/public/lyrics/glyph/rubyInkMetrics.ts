import type { GlyphOutline, PositionedGlyph } from "@lyricova/glyph-renderer";
import type { RubyLayoutShaper, RubyRun } from "./types";

/** Real ink ascent/descent measured from shaped glyphs' actual outlines, in `fontSize` units. Both are `>= 0`. */
export interface RubyInkMetrics {
  /** Height above the baseline of the highest ink point across the measured glyphs. */
  ascent: number;
  /** Depth below the baseline of the lowest ink point across the measured glyphs (e.g. non-zero for a Latin "g"). */
  descent: number;
}

const ZERO_INK_METRICS: RubyInkMetrics = { ascent: 0, descent: 0 };

/** Real horizontal ink extent spanned by a ruby annotation's shaped runs, line-relative (same space as `RubyRun.x`). */
export interface RubyInkHorizontalExtent {
  /** Left-most ink coordinate across every run/glyph. */
  left: number;
  /** Right-most ink coordinate across every run/glyph. */
  right: number;
}

/**
 * A memoizing cache for `glyphOutline` lookups, keyed by
 * `(fontId, glyphId, fontSize, variations)`. Purely a performance aid - the
 * same glyph (e.g. a common kana) is frequently reshaped across multiple
 * furigana annotations in one paragraph.
 */
export type GlyphOutlineCache = Map<string, GlyphOutline | null>;

function outlineCacheKey(
  fontId: number,
  glyphId: number,
  fontSize: number,
  variations: readonly string[],
): string {
  return `${fontId}|${glyphId}|${fontSize}|${variations.join(",")}`;
}

/**
 * Looks up (and caches) the outline of one shaped glyph via
 * `RubyLayoutShaper.glyphOutline`. `variations` must be the same list the
 * glyph was *shaped* with, per `GlyphOutlineRequest`'s contract, so the
 * outline's ink bounds actually correspond to the shaped glyph.
 */
export function lookupGlyphOutline(
  shaper: Pick<RubyLayoutShaper, "glyphOutline">,
  glyph: Pick<PositionedGlyph, "fontId" | "glyphId">,
  fontSize: number,
  variations: readonly string[] = [],
  cache?: GlyphOutlineCache,
): GlyphOutline | null {
  const key = cache
    ? outlineCacheKey(glyph.fontId, glyph.glyphId, fontSize, variations)
    : undefined;
  if (cache && key !== undefined && cache.has(key)) {
    return cache.get(key)!;
  }
  const outline = shaper.glyphOutline({
    fontId: glyph.fontId,
    glyphId: glyph.glyphId,
    fontSize,
    ...(variations.length > 0 ? { variations: [...variations] } : {}),
  });
  if (cache && key !== undefined) {
    cache.set(key, outline);
  }
  return outline;
}

/**
 * Measures the real ink ascent/descent spanned by a set of shaped ruby
 * glyphs, by reading each glyph's actual outline bounds (`GlyphOutline.bounds`,
 * `y` up, baseline at `0`) rather than approximating from the base
 * paragraph's font metrics. This correctly accounts for:
 * - Descenders in the ruby font (e.g. a Latin "g" dropping below baseline).
 * - A distinct ruby fallback font's real metrics (each glyph carries its own
 *   `fontId`, which may differ from the base text's font).
 * - Outline-less glyphs (whitespace, or color/bitmap/SVG-only glyphs this
 *   extractor doesn't support): `glyphOutline` returns `null` for these, and
 *   they contribute nothing (never `NaN`/crash).
 *
 * Returns `{ ascent: 0, descent: 0 }` for an empty glyph list or when none of
 * the glyphs have a drawable outline.
 */
export function measureRubyInkMetrics(
  shaper: Pick<RubyLayoutShaper, "glyphOutline">,
  glyphs: readonly Pick<PositionedGlyph, "fontId" | "glyphId">[],
  fontSize: number,
  variations: readonly string[] = [],
  cache?: GlyphOutlineCache,
): RubyInkMetrics {
  let ascent = 0;
  let descent = 0;
  for (const glyph of glyphs) {
    const outline = lookupGlyphOutline(
      shaper,
      glyph,
      fontSize,
      variations,
      cache,
    );
    if (!outline) continue;
    ascent = Math.max(ascent, outline.bounds.yMax);
    descent = Math.max(descent, -outline.bounds.yMin);
  }
  return { ascent, descent };
}

/**
 * Measures the real horizontal ink extent spanned by a ruby annotation's
 * shaped runs, by reading each glyph's actual outline bounds
 * (`GlyphOutline.bounds`, x increasing right, origin at the glyph pen)
 * rather than approximating from each run's logical advance box
 * (`[run.x, run.x + run.width]`). Approximating from the advance box alone
 * misses:
 * - Negative left side bearing (ink starting left of the pen origin).
 * - Right overhang (ink extending past the advance width, e.g. an italic or
 *   swash glyph).
 *
 * The returned extent is unioned with every run's own advance box (mirroring
 * `clusterFillExtent`'s treatment of base clusters in
 * `canvasGlyphGeometry.ts`), so it never shrinks narrower than the logical
 * layout box, and stays finite (falling back to the advance-box union) when
 * no glyph has a drawable outline - e.g. color/bitmap glyphs `glyphOutline`
 * doesn't support. Returns `{ left: 0, right: 0 }` for an empty run list.
 */
export function measureRubyInkHorizontalExtent(
  shaper: Pick<RubyLayoutShaper, "glyphOutline">,
  runs: readonly Pick<RubyRun, "x" | "width" | "glyphs">[],
  fontSize: number,
  variations: readonly string[] = [],
  cache?: GlyphOutlineCache,
): RubyInkHorizontalExtent {
  let left = Infinity;
  let right = -Infinity;
  for (const run of runs) {
    left = Math.min(left, run.x);
    right = Math.max(right, run.x + run.width);
    for (const glyph of run.glyphs) {
      const outline = lookupGlyphOutline(
        shaper,
        glyph,
        fontSize,
        variations,
        cache,
      );
      if (!outline) continue;
      const glyphX = run.x + glyph.x;
      left = Math.min(left, glyphX + outline.bounds.xMin);
      right = Math.max(right, glyphX + outline.bounds.xMax);
    }
  }
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return { left: 0, right: 0 };
  }
  return { left, right };
}

/** Combines several annotations' ink metrics into the single max ascent/max descent a shared line needs to reserve. */
export function combineRubyInkMetrics(
  metrics: readonly RubyInkMetrics[],
): RubyInkMetrics {
  return metrics.reduce(
    (acc, m) => ({
      ascent: Math.max(acc.ascent, m.ascent),
      descent: Math.max(acc.descent, m.descent),
    }),
    ZERO_INK_METRICS,
  );
}
