import type { ShapeResult } from "@lyricova/glyph-renderer";
import type { PositionedRubyGlyph } from "./types";

export interface ResolvedShapeRun {
  glyphs: PositionedRubyGlyph[];
  /** Total horizontal advance ("pen distance") of the run. */
  width: number;
}

/**
 * Resolves a raw {@link ShapeResult}'s glyphs (which only carry per-glyph
 * advances/offsets) into pen-positioned x coordinates and a total run width,
 * ready for canvas drawing/centering. Mirrors how `ShapedCluster.x` is
 * derived on the Rust side for `layoutParagraph`, but `shape()` does not
 * return that directly since it has no line/cluster concept.
 */
export function resolveShapeRun(result: ShapeResult): ResolvedShapeRun {
  let pen = 0;
  const glyphs: PositionedRubyGlyph[] = result.glyphs.map((glyph) => {
    const x = pen + glyph.xOffset;
    pen += glyph.xAdvance;
    return { ...glyph, x };
  });
  return { glyphs, width: pen };
}
