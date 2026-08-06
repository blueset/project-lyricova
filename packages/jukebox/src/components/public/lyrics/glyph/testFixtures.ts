import type {
  FontMetrics,
  GlyphOutline,
  GlyphOutlineRequest,
  LayoutLine,
  ParagraphLayout,
  PositionedGlyph,
  ShapeResult,
  ShapedCluster,
  SourceRange,
} from "@lyricova/glyph-renderer";

/** Builds a `SourceRange` for a plain-ASCII-ish fake where UTF-8 byte offsets mirror UTF-16 offsets (irrelevant to this layer's logic, which only reads the UTF-16 side). */
export function makeSourceRange(
  utf16Start: number,
  utf16End: number,
): SourceRange {
  return { utf8Start: utf16Start, utf8End: utf16End, utf16Start, utf16End };
}

export interface CharSpec {
  char: string;
  advance: number;
  /** ISO 15924 script tag for this cluster. Defaults to `"Latn"`. */
  script?: string;
  /** JLReq base-expansion space inserted before this cluster. Defaults to `0`. */
  leadingSpace?: number;
  /** JLReq base-expansion space inserted after this cluster. Defaults to `0`. */
  trailingSpace?: number;
  /** Font that shaped this cluster. Defaults to `0`. */
  fontId?: number;
  /** Ink height above the baseline (`bounds.yMax`). Defaults to `0`. */
  inkTop?: number;
}

/** Builds one `ShapedCluster` per entry in `chars`, laid out left-to-right starting at x=0. */
export function buildClusters(
  chars: readonly CharSpec[],
  startUtf16 = 0,
): ShapedCluster[] {
  let x = 0;
  let utf16 = startUtf16;
  return chars.map(
    ({
      char,
      advance,
      script = "Latn",
      leadingSpace = 0,
      trailingSpace = 0,
      fontId = 0,
      inkTop = 0,
    }) => {
      const source = makeSourceRange(utf16, utf16 + char.length);
      x += leadingSpace;
      const cluster: ShapedCluster = {
        source,
        fontId,
        direction: "ltr",
        script,
        level: 0,
        glyphs: [],
        x,
        advance,
        leadingSpace,
        trailingSpace,
        bounds: { xMin: 0, xMax: advance, yMin: 0, yMax: inkTop },
        isWhitespace: char === " ",
      };
      x += advance + trailingSpace;
      utf16 += char.length;
      return cluster;
    },
  );
}

/** Builds a `LayoutLine` wrapping `clusters`, with simple fixed ascent/descent metrics. */
export function buildLine(
  clusters: readonly ShapedCluster[],
  opts: { top?: number; ascent?: number; descent?: number } = {},
): LayoutLine {
  const first = clusters[0];
  const last = clusters[clusters.length - 1];
  const utf16Start = first ? first.source.utf16Start : 0;
  const utf16End = last ? last.source.utf16End : 0;
  const width = clusters.reduce(
    (sum, c) => sum + c.leadingSpace + c.advance + c.trailingSpace,
    0,
  );
  const ascent = opts.ascent ?? 8;
  const descent = opts.descent ?? 2;
  const top = opts.top ?? 0;
  return {
    clusters: [...clusters],
    source: makeSourceRange(utf16Start, utf16End),
    width,
    trailingWhitespace: 0,
    top,
    baseline: top + ascent,
    height: ascent + descent,
    hardBreak: true,
    direction: "ltr",
  };
}

/** Builds a `ParagraphLayout` from pre-built lines. */
export function buildParagraphLayout(
  lines: readonly LayoutLine[],
  opts: { ascent?: number; descent?: number } = {},
): ParagraphLayout {
  const ascent = opts.ascent ?? 8;
  const descent = opts.descent ?? 2;
  const width = lines.reduce((max, line) => Math.max(max, line.width), 0);
  const height = lines.reduce((sum, line) => sum + line.height, 0);
  return {
    lines: [...lines],
    baseDirection: "ltr",
    width,
    height,
    lineHeight: ascent + descent,
    ascent,
    descent,
    missingFontRanges: [],
  };
}

/**
 * A fake `shape()`: one glyph per Unicode code point in `req.text`, each its
 * own cluster, with a fixed advance per code point - good enough to exercise
 * placement math without needing real font shaping.
 *
 * `glyphId` is the code point's own value (not a per-call running index), so
 * it stays stable/discriminable for the same character across independent
 * `shape()` calls (e.g. one call per mono-ruby grapheme, or one call per
 * annotation) - letting a `fakeGlyphOutline` resolver vary ink metrics per
 * character rather than per meaningless call-local position.
 */
export function fakeShape(
  advancePerCodePoint = 6,
): (req: { text: string; fontIds: readonly number[] }) => ShapeResult {
  return ({ text, fontIds }) => {
    const glyphs: PositionedGlyph[] = [];
    let idx = 0;
    for (const symbol of text) {
      const start = idx;
      idx += symbol.length;
      glyphs.push({
        glyphId: symbol.codePointAt(0) ?? 0,
        fontId: fontIds[0] ?? 0,
        cluster: start,
        clusterEnd: idx,
        clusterUtf16: start,
        clusterEndUtf16: idx,
        xAdvance: advancePerCodePoint,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0,
      });
    }
    return {
      glyphs,
      direction: "ltr",
      script: "Latn",
      language: null,
      missingFontRanges: [],
    };
  };
}

/** Ink metrics (as fractions of `fontSize`) a `fakeGlyphOutline` resolver returns for one glyph, or `null` to simulate an outline-less glyph (e.g. whitespace). */
export interface FakeGlyphInkRatios {
  ascentRatio: number;
  descentRatio: number;
  /**
   * Left edge of the glyph's ink, as a ratio of `fontSize`, relative to the
   * glyph's pen origin. Defaults to `0` (no negative left side bearing).
   * Negative values simulate ink starting left of the pen origin.
   */
  xMinRatio?: number;
  /**
   * Right edge of the glyph's ink, as a ratio of `fontSize`, relative to the
   * glyph's pen origin. Defaults to `0.5` (matches the fixed advance box
   * most fakes use). Values beyond the glyph's own advance simulate right
   * overhang (e.g. an italic or swash glyph).
   */
  xMaxRatio?: number;
}

/**
 * A fake `glyphOutline()`: builds a structurally-valid (but geometry-less)
 * `GlyphOutline` whose `bounds` reflect the given `ascentRatio`/`descentRatio`
 * (and optional `xMinRatio`/`xMaxRatio`) of the requested `fontSize`, or
 * `null` to simulate a glyph with no drawable outline. `resolve` receives
 * the full request (so tests can vary ink metrics per `fontId`/`glyphId`,
 * e.g. to simulate a distinct ruby fallback font or a specific descender
 * glyph); defaults to a flat ascent-only glyph (no descender) for every
 * request.
 */
export function fakeGlyphOutline(
  resolve: (
    request: GlyphOutlineRequest,
  ) => FakeGlyphInkRatios | null = () => ({
    ascentRatio: 0.8,
    descentRatio: 0,
  }),
): (request: GlyphOutlineRequest) => GlyphOutline | null {
  return (request) => {
    const ratios = resolve(request);
    if (!ratios) return null;
    return {
      commands: [],
      bounds: {
        xMin: request.fontSize * (ratios.xMinRatio ?? 0),
        xMax: request.fontSize * (ratios.xMaxRatio ?? 0.5),
        yMin: -request.fontSize * ratios.descentRatio,
        yMax: request.fontSize * ratios.ascentRatio,
      },
      unitsPerEm: 1000,
      fontSize: request.fontSize,
      scale: request.fontSize / 1000,
    };
  };
}

/**
 * A fake `fontMetrics()`: per-font vertical metrics on a 1000 upem, so ruby row
 * placement can be exercised without loading a real face.
 *
 * The defaults deliberately mirror {@link buildParagraphLayout}'s ascent/descent
 * (8 / 2 at the fixtures' `fontSize` 20, i.e. 0.400 / 0.100 em) with `sTypo`
 * equal to `hhea`. That makes the sTypo-anchored row math reduce exactly to the
 * paragraph-metric behaviour, so a test only sees a difference when it opts in.
 *
 * Pass `overrides` to model the shapes that actually matter: a pan-CJK face
 * whose `sTypo` box is the tighter *ideographic em box*, or an `OS/2` table too
 * old to carry `sTypo*` at all (`null`).
 */
export function fakeFontMetrics(
  overrides: Record<number, Partial<FontMetrics>> = {},
): (fontId: number) => FontMetrics {
  return (fontId) => ({
    unitsPerEm: 1000,
    ascender: 400,
    descender: -100,
    lineGap: 0,
    typoAscender: 400,
    typoDescender: -100,
    typoLineGap: 0,
    ...overrides[fontId],
  });
}
