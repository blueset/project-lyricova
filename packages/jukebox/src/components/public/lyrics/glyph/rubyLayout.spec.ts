import { describe, expect, it, vi } from "vitest";
import { layoutRubyParagraph } from "./rubyLayout";
import { RubyLayoutError, RubyLayoutOptionsError } from "./types";
import type { FuriganaAnnotationInput, RubyLayoutShaper } from "./types";
import {
  buildClusters,
  buildLine,
  buildParagraphLayout,
  fakeGlyphOutline,
  fakeShape,
} from "./testFixtures";
import type {
  GlyphOutlineRequest,
  ParagraphLayout,
} from "@lyricova/glyph-renderer";

function makeShaper(
  layoutParagraphResult: ParagraphLayout,
  shapeImpl: ReturnType<typeof fakeShape> = fakeShape(),
  glyphOutlineImpl: ReturnType<typeof fakeGlyphOutline> = fakeGlyphOutline(),
): RubyLayoutShaper {
  return {
    layoutParagraph: vi.fn(() => layoutParagraphResult),
    shape: vi.fn(shapeImpl),
    glyphOutline: vi.fn(glyphOutlineImpl),
  };
}

describe("layoutRubyParagraph", () => {
  it("places mono ruby (a single annotated grapheme) centered as one contextual run", () => {
    const line = buildLine(
      buildClusters([
        { char: "A", advance: 10 },
        { char: "B", advance: 10 },
      ]),
      { top: 0, ascent: 8, descent: 2 },
    );
    const paragraphLayout = buildParagraphLayout([line], {
      ascent: 8,
      descent: 2,
    });
    const shaper = makeShaper(paragraphLayout, fakeShape(3));

    const furigana: FuriganaAnnotationInput[] = [
      { content: "xy", leftIndex: 0, rightIndex: 1 },
    ];
    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana,
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    expect(shaper.layoutParagraph).toHaveBeenCalledWith(
      expect.objectContaining({ noBreakRanges: [[0, 1]] }),
    );

    expect(result.rubies).toHaveLength(1);
    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("mono");
    expect(ruby.lineIndex).toBe(0);
    expect(ruby.baseX).toEqual([0, 10]);
    expect(ruby.fontSize).toBe(10); // default ratio: fontSize * 0.5
    // Ink is still measured per annotation (for clipping/bounds), even though
    // it no longer drives line advance.
    expect(ruby.inkAscent).toBe(8);
    expect(ruby.inkDescent).toBe(0);
    // The whole reading is one contextual run - never re-shaped per grapheme -
    // centred over the single base cluster: (10 - 6) / 2 = 2.
    expect(ruby.runs).toHaveLength(1);
    expect(ruby.runs[0]).toMatchObject({
      contentRange: [0, 2],
      width: 6,
      x: 2,
    });
    expect(shaper.shape).toHaveBeenCalledTimes(1);

    // Row geometry is deterministic: the base font's em-relative ascent (8/20)
    // and descent (2/20) scaled to the 10px ruby size, plus rubyGap 0.
    expect(result.rubyRow).toEqual({ height: 5, baseline: 4, fontSize: 10 });
    expect(ruby.y).toBe(4);

    const linePlacement = result.lines[0]!;
    expect(linePlacement.top).toBe(0);
    expect(linePlacement.height).toBe(15); // original 10 + reserved row 5
    expect(linePlacement.baseline).toBe(13); // 0 + row(5) + ascentOffset(8)
    expect(linePlacement.rubies).toEqual([ruby]);
    expect(result.height).toBe(15);
  });

  it("forwards the requested paragraph wrapping strategy", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const shaper = makeShaper(buildParagraphLayout([line]));

    layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [],
      fontIds: [0],
      fontSize: 20,
      maxWidth: 100,
      wrapStrategy: "balanced",
      phraseRanges: [[0, 1]],
    });

    expect(shaper.layoutParagraph).toHaveBeenCalledWith(
      expect.objectContaining({
        maxWidth: 100,
        wrapStrategy: "balanced",
        phraseRanges: [[0, 1]],
      }),
    );
  });

  it("distributes group ruby across its clusters 2:1:1 when narrower than the base", () => {
    // Kana ruby over a kanji base: both runs are fixed-width Japanese, so
    // inter-cluster spacing may be distributed into the ruby.
    const line = buildLine(
      buildClusters([
        { char: "\u63a5", advance: 10 },
        { char: "\u7d9a", advance: 10 },
      ]),
    );
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout, fakeShape(5));

    const result = layoutRubyParagraph(shaper, {
      text: "\u63a5\u7d9a",
      furigana: [
        { content: "\u3064\u306a\u304c", leftIndex: 0, rightIndex: 2 },
      ],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("group");
    expect(ruby.baseX).toEqual([0, 20]);
    // 3 graphemes * 5 width = 15, narrower than the 20-wide base -> split into
    // 3 clusters with slack 5 distributed as inter-cluster : leading : trailing
    // = 2 : 1 : 1, i.e. g = 5/3 and edge gaps g/2.
    expect(ruby.runs).toHaveLength(3);
    const gaps: number[] = [];
    for (let i = 1; i < ruby.runs.length; i++) {
      const gap =
        ruby.runs[i]!.x - (ruby.runs[i - 1]!.x + ruby.runs[i - 1]!.width);
      expect(gap).toBeGreaterThanOrEqual(0);
      gaps.push(gap);
    }
    const first = ruby.runs[0]!;
    const last = ruby.runs[ruby.runs.length - 1]!;
    expect(gaps[0]).toBeCloseTo(5 / 3, 5);
    expect(gaps[1]).toBeCloseTo(5 / 3, 5);
    expect(first.x - 0).toBeCloseTo(5 / 6, 5);
    // Symmetric margins on both sides of the base range.
    expect(first.x - 0).toBeCloseTo(20 - (last.x + last.width), 5);
    expect(shaper.shape).toHaveBeenCalledWith(
      expect.objectContaining({ text: "\u3064\u306a\u304c" }),
    );
  });

  it("keeps over-long group ruby as one solid block, centred within the granted overhang", () => {
    // Kana neighbours on both sides grant a full ruby em of overhang each, so
    // the over-long ruby is absorbed without disturbing the base at all.
    const line = buildLine(
      buildClusters([
        { char: "\u306e", advance: 6 },
        { char: "E", advance: 6 },
        { char: "F", advance: 6 },
        { char: "\u306e", advance: 6 },
      ]),
    );
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout, fakeShape(4));

    const result = layoutRubyParagraph(shaper, {
      text: "\u306eEF\u306e",
      furigana: [{ content: "wxyz", leftIndex: 1, rightIndex: 3 }],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("group");
    // 4 graphemes * 4 = 16 wide over a 12-wide base: kept as one contextually
    // shaped block (never compressed into overlapping clusters).
    expect(ruby.runs).toHaveLength(1);
    const run = ruby.runs[0]!;
    expect(run.width).toBe(16);
    expect(run.contentRange).toEqual([0, 4]);
    // Excess 4 split symmetrically: 2 per side, well inside the 10-unit
    // (1 ruby em) hiragana budget, so no clamp and no base expansion.
    expect(run.x - ruby.baseX[0]).toBeCloseTo(-2, 5);
    expect(run.x + run.width - ruby.baseX[1]).toBeCloseTo(2, 5);
  });

  it("reserves the ruby row uniformly on every line, annotated or not", () => {
    const lineA = buildLine(
      buildClusters(
        [
          { char: "A", advance: 10 },
          { char: "B", advance: 10 },
        ],
        0,
      ),
      { top: 0 },
    );
    const lineB = buildLine(
      buildClusters(
        [
          { char: "C", advance: 10 },
          { char: "D", advance: 10 },
        ],
        2,
      ),
      { top: 10 },
    );
    const paragraphLayout = buildParagraphLayout([lineA, lineB]);
    const shaper = makeShaper(paragraphLayout, fakeShape(3));

    const result = layoutRubyParagraph(shaper, {
      text: "ABCD",
      furigana: [{ content: "xy", leftIndex: 2, rightIndex: 4 }],
      fontIds: [0],
      fontSize: 20,
    });

    // Only line 1 carries ruby, but both lines reserve the same 5-unit row so
    // line advance never jitters between annotated and un-annotated lines.
    expect(result.lines[0]).toMatchObject({ top: 0, height: 15 });
    expect(result.lines[1]).toMatchObject({ top: 15, height: 15 });
    expect(result.height).toBe(30);
  });

  it('measures a ruby descender (e.g. a Latin "g") without letting it change line advance', () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline(() => ({ ascentRatio: 0.7, descentRatio: 0.3 })),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "g", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("mono");
    // rubyFontSize defaults to 10: ascent = 10*0.7 = 7, descent = 10*0.3 = 3.
    // Still measured, for ink bounds/clipping.
    expect(ruby.inkAscent).toBe(7);
    expect(ruby.inkDescent).toBe(3);
    // ...but the reserved row stays the deterministic, document-wide 5 units.
    expect(ruby.y).toBe(4);
    expect(result.lines[0]!.height).toBe(line.height + 5);
  });

  it("measures ink metrics from the distinct ruby fallback font's own glyphs, not the base font", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline(
        (request: GlyphOutlineRequest) =>
          request.fontId === 1
            ? { ascentRatio: 0.9, descentRatio: 0.1 }
            : { ascentRatio: 0.1, descentRatio: 0.9 }, // base font id's metrics - must NOT be used
      ),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "x", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      rubyFontIds: [1],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.fontIds).toEqual([1]);
    // rubyFontSize defaults to 10: font 1's metrics -> ascent 9, descent 1.
    expect(ruby.inkAscent).toBe(9);
    expect(ruby.inkDescent).toBe(1);
  });

  it("gracefully skips outline-less glyphs (e.g. whitespace) when measuring ink metrics", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    // "a" (codePoint 97) has no drawable outline; "b" (98) does.
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline((request: GlyphOutlineRequest) =>
        request.glyphId === 97 ? null : { ascentRatio: 0.6, descentRatio: 0.2 },
      ),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "ab", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("mono"); // one annotated base grapheme, whatever the ruby length
    // Only "b" contributes ink; "a" (no outline) contributes nothing, not NaN.
    expect(ruby.inkAscent).toBe(6);
    expect(ruby.inkDescent).toBe(2);
  });

  it("still reserves the deterministic row when a ruby annotation has no drawable outline", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline(() => null),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "x", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.inkAscent).toBe(0);
    expect(ruby.inkDescent).toBe(0);
    // Measured ink is zero, but the row is reserved from the font metrics, so
    // this line still advances exactly like every other line.
    expect(ruby.y).toBe(4);
    expect(result.lines[0]!.height).toBe(line.height + 5);
  });

  it("widens inkLeft/inkRight for negative left side bearing and right overhang beyond the runs' advance box", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline(() => ({
        ascentRatio: 0.8,
        descentRatio: 0,
        xMinRatio: -0.2, // negative left side bearing
        xMaxRatio: 0.9, // overhangs past the 6-wide advance
      })),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "x", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.runs).toHaveLength(1);
    const run = ruby.runs[0]!;
    // rubyFontSize defaults to 10: xMin = 10*-0.2 = -2, xMax = 10*0.9 = 9.
    expect(ruby.inkLeft).toBe(run.x - 2);
    expect(ruby.inkLeft).toBeLessThan(run.x); // narrower than the advance box would miss this
    expect(ruby.inkRight).toBe(run.x + 9);
    expect(ruby.inkRight).toBeGreaterThan(run.x + run.width);
  });

  it("falls back to the runs' advance box for inkLeft/inkRight when no glyph has a drawable outline", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline(() => null),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "x", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    const run = ruby.runs[0]!;
    expect(ruby.inkLeft).toBe(run.x);
    expect(ruby.inkRight).toBe(run.x + run.width);
  });

  it("keeps per-annotation ink independent while every annotation shares one deterministic row", () => {
    const line = buildLine(
      buildClusters([
        { char: "A", advance: 10 },
        { char: "B", advance: 10 },
      ]),
    );
    const paragraphLayout = buildParagraphLayout([line]);
    // "x" (120) -> tall ascent, short descent; "y" (121) -> short ascent, deep descent.
    const shaper = makeShaper(
      paragraphLayout,
      fakeShape(6),
      fakeGlyphOutline((request: GlyphOutlineRequest) =>
        request.glyphId === 120
          ? { ascentRatio: 0.9, descentRatio: 0.1 }
          : { ascentRatio: 0.3, descentRatio: 0.6 },
      ),
    );

    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana: [
        { content: "x", leftIndex: 0, rightIndex: 1 },
        { content: "y", leftIndex: 1, rightIndex: 2 },
      ],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.rubies).toHaveLength(2);
    const [rubyA, rubyB] = result.rubies;
    expect(rubyA!.inkAscent).toBe(9);
    expect(rubyA!.inkDescent).toBe(1);
    expect(rubyB!.inkAscent).toBe(3);
    expect(rubyB!.inkDescent).toBe(6);
    // The reserved row does not depend on either annotation's measured ink.
    expect(result.lines[0]!.height).toBe(line.height + 5);
    expect(rubyA!.y).toBe(4);
    expect(rubyB!.y).toBe(4);
  });

  it("skips invalid annotations by default and reports them as issues", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout);

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [
        { content: "x", leftIndex: 0, rightIndex: 5 }, // out of range
        { content: "y", leftIndex: 1, rightIndex: 0 }, // invalid range
      ],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.rubies).toEqual([]);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.map((i) => i.kind)).toEqual([
      "outOfRange",
      "invalidRange",
    ]);
  });

  it("throws a RubyLayoutError when onInvalidAnnotation is 'throw'", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout);

    expect(() =>
      layoutRubyParagraph(shaper, {
        text: "A",
        furigana: [{ content: "x", leftIndex: 0, rightIndex: 5 }],
        fontIds: [0],
        fontSize: 20,
        onInvalidAnnotation: "throw",
      }),
    ).toThrow(RubyLayoutError);
  });

  it("reports splitAcrossLines and skips placement when a base range straddles two lines", () => {
    // Two lines whose combined source spans [0,4), but the annotation's base
    // range [0,4) is supposed to be atomic - simulating a mandatory break
    // (or upstream inconsistency) splitting it anyway.
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0), {
      top: 0,
    });
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });
    const paragraphLayout = buildParagraphLayout([lineA, lineB]);
    const shaper = makeShaper(paragraphLayout);

    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana: [{ content: "xy", leftIndex: 0, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.rubies).toEqual([]);
    expect(result.issues).toEqual([
      {
        kind: "splitAcrossLines",
        annotation: { content: "xy", leftIndex: 0, rightIndex: 2 },
        lineIndices: [0, 1],
      },
    ]);
  });

  it("surfaces mid-surrogate/combining-mark annotations without crashing the rest of the layout", () => {
    // "A" + astral emoji (surrogate pair) + "B"
    const text = "A\u{1F600}B";
    const clusters = [
      ...buildClusters([{ char: "A", advance: 10 }], 0),
      ...buildClusters([{ char: "\u{1F600}", advance: 20 }], 1),
      ...buildClusters([{ char: "B", advance: 10 }], 3),
    ];
    const line = buildLine(clusters);
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout, fakeShape(3));

    const result = layoutRubyParagraph(shaper, {
      text,
      furigana: [
        { content: "bad", leftIndex: 2, rightIndex: 3 }, // splits the surrogate pair
        { content: "k", leftIndex: 3, rightIndex: 4 }, // valid, mono over "B"
      ],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([
      {
        kind: "midSurrogate",
        annotation: { content: "bad", leftIndex: 2, rightIndex: 3 },
        side: "left",
      },
    ]);
    expect(result.rubies).toHaveLength(1);
    expect(result.rubies[0]!.annotation.content).toBe("k");
    expect(result.rubies[0]!.mode).toBe("mono");
  });

  it("skips an empty-content annotation as an emptyContent issue instead of shaping an empty string", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout);

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.rubies).toEqual([]);
    expect(result.issues).toEqual([
      {
        kind: "emptyContent",
        annotation: { content: "", leftIndex: 0, rightIndex: 1 },
        reason: expect.stringContaining("must not be empty"),
      },
    ]);
    // shape() must never be called with an empty string.
    expect(shaper.shape).not.toHaveBeenCalled();
  });

  it("throws a RubyLayoutError for empty content when onInvalidAnnotation is 'throw'", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout);

    expect(() =>
      layoutRubyParagraph(shaper, {
        text: "A",
        furigana: [{ content: "", leftIndex: 0, rightIndex: 1 }],
        fontIds: [0],
        fontSize: 20,
        onInvalidAnnotation: "throw",
      }),
    ).toThrow(RubyLayoutError);
  });

  describe("numeric option validation", () => {
    function trivialShaper() {
      const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
      return makeShaper(buildParagraphLayout([line]));
    }

    it.each([0, -1, NaN, Infinity, -Infinity])(
      "throws RubyLayoutOptionsError for fontSize=%s",
      (fontSize) => {
        expect(() =>
          layoutRubyParagraph(trivialShaper(), {
            text: "A",
            furigana: [],
            fontIds: [0],
            fontSize,
          }),
        ).toThrow(RubyLayoutOptionsError);
      },
    );

    it.each([0, -1, NaN, Infinity, -Infinity])(
      "throws RubyLayoutOptionsError for rubyFontSize=%s",
      (rubyFontSize) => {
        expect(() =>
          layoutRubyParagraph(trivialShaper(), {
            text: "A",
            furigana: [],
            fontIds: [0],
            fontSize: 20,
            rubyFontSize,
          }),
        ).toThrow(RubyLayoutOptionsError);
      },
    );

    it.each([-1, NaN, Infinity, -Infinity])(
      "throws RubyLayoutOptionsError for rubyGap=%s",
      (rubyGap) => {
        expect(() =>
          layoutRubyParagraph(trivialShaper(), {
            text: "A",
            furigana: [],
            fontIds: [0],
            fontSize: 20,
            rubyGap,
          }),
        ).toThrow(RubyLayoutOptionsError);
      },
    );

    it("accepts rubyGap of exactly 0", () => {
      expect(() =>
        layoutRubyParagraph(trivialShaper(), {
          text: "A",
          furigana: [],
          fontIds: [0],
          fontSize: 20,
          rubyGap: 0,
        }),
      ).not.toThrow();
    });

    it("never calls the shaper when a layout option is invalid", () => {
      const shaper = trivialShaper();
      expect(() =>
        layoutRubyParagraph(shaper, {
          text: "A",
          furigana: [],
          fontIds: [0],
          fontSize: NaN,
        }),
      ).toThrow(RubyLayoutOptionsError);
      expect(shaper.layoutParagraph).not.toHaveBeenCalled();
    });
  });
});

describe("layoutRubyParagraph: ruby font size (JLReq clamp)", () => {
  function sizeFor(options: {
    fontSize: number;
    rubyFontSize?: number;
    rubyFontSizeRatio?: number;
    rubyFontSizeMin?: number;
    rubyFontSizeMax?: number;
  }): number {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(2));
    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [{ content: "x", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      ...options,
    });
    return result.rubyRow.fontSize;
  }

  it("defaults to half the base size", () => {
    expect(sizeFor({ fontSize: 40 })).toBe(20);
  });

  it("tracks a responsive base size through rubyFontSizeRatio", () => {
    expect(sizeFor({ fontSize: 40, rubyFontSizeRatio: 0.4 })).toBe(16);
    expect(sizeFor({ fontSize: 10, rubyFontSizeRatio: 0.4 })).toBe(4);
  });

  it("lets the absolute cap take precedence over the ratio", () => {
    expect(sizeFor({ fontSize: 100, rubyFontSizeMax: 20 })).toBe(20);
    // ...including over the floor, so a contradictory pair still resolves.
    expect(
      sizeFor({ fontSize: 100, rubyFontSizeMin: 30, rubyFontSizeMax: 20 }),
    ).toBe(20);
  });

  it("applies the absolute floor at small base sizes", () => {
    expect(sizeFor({ fontSize: 10, rubyFontSizeMin: 8 })).toBe(8);
  });

  it("is uncapped by default (ratio-only, never a guessed pixel constant)", () => {
    expect(sizeFor({ fontSize: 400 })).toBe(200);
  });

  it("lets an explicit rubyFontSize override the whole computation", () => {
    expect(
      sizeFor({
        fontSize: 100,
        rubyFontSizeRatio: 0.5,
        rubyFontSizeMin: 30,
        rubyFontSizeMax: 20,
        rubyFontSize: 33,
      }),
    ).toBe(33);
  });

  it.each([
    ["rubyFontSizeRatio", { rubyFontSizeRatio: 0 }],
    ["rubyFontSizeRatio", { rubyFontSizeRatio: NaN }],
    ["rubyFontSizeMin", { rubyFontSizeMin: -1 }],
    ["rubyFontSizeMax", { rubyFontSizeMax: 0 }],
    ["rubyFontSizeMax", { rubyFontSizeMax: Infinity }],
  ])("rejects a malformed %s", (_name, options) => {
    expect(() => sizeFor({ fontSize: 20, ...options })).toThrow(
      RubyLayoutOptionsError,
    );
  });
});

describe("layoutRubyParagraph: document-level ruby row", () => {
  function twoLines() {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0), {
      top: 0,
    });
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });
    return { lineA, lineB, layout: buildParagraphLayout([lineA, lineB]) };
  }

  it("reserves nothing when the document is known to carry no ruby", () => {
    const { layout } = twoLines();
    const shaper = makeShaper(layout, fakeShape(2));

    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana: [{ content: "x", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
      reserveRubyRow: false,
    });

    expect(result.rubyRow).toEqual({ height: 0, baseline: 0, fontSize: 10 });
    expect(result.lines[0]).toMatchObject({ top: 0, height: 10 });
    expect(result.lines[1]).toMatchObject({ top: 10, height: 10 });
    expect(result.rubies[0]!.y).toBe(0);
  });

  it("reserves the row on an un-annotated paragraph when the document has ruby elsewhere", () => {
    // The whole point of the document-level flag: this paragraph has no
    // furigana of its own, but must still advance like the ones that do.
    const { layout } = twoLines();
    const shaper = makeShaper(layout, fakeShape(2));

    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana: [],
      fontIds: [0],
      fontSize: 20,
      reserveRubyRow: true,
    });

    expect(result.rubies).toEqual([]);
    expect(result.rubyRow.height).toBe(5);
    expect(result.lines.map((l) => l.height)).toEqual([15, 15]);
  });

  it("adds rubyGap to the reserved row", () => {
    const { layout } = twoLines();
    const shaper = makeShaper(layout, fakeShape(2));

    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana: [],
      fontIds: [0],
      fontSize: 20,
      reserveRubyRow: true,
      rubyGap: 3,
    });

    expect(result.rubyRow).toEqual({ height: 8, baseline: 4, fontSize: 10 });
  });
});

describe("layoutRubyParagraph: base expansion is pre-measured", () => {
  function rangeAdvancesFor(
    text: string,
    furigana: FuriganaAnnotationInput[],
    clusters: { char: string; advance: number }[],
  ) {
    const line = buildLine(buildClusters(clusters));
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(6));
    layoutRubyParagraph(shaper, {
      text,
      furigana,
      fontIds: [0],
      fontSize: 20,
    });
    return (
      shaper.layoutParagraph as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]![0] as {
      rangeAdvances?: {
        start: number;
        end: number;
        minAdvance: number;
        distribution: string;
      }[];
      noBreakRanges?: [number, number][];
    };
  }

  it("asks for no expansion at a paragraph edge, where ruby may hang out freely", () => {
    // "\u5c71" alone has no adjacent character on either side, so JLReq's
    // ruby-aligned line head/end applies and the base is left undisturbed.
    const request = rangeAdvancesFor(
      "\u5c71",
      [{ content: "gpjy", leftIndex: 0, rightIndex: 1 }],
      [{ char: "\u5c71", advance: 10 }],
    );

    expect(request.rangeAdvances).toEqual([]);
    // The pair stays an unbreakable atom regardless.
    expect(request.noBreakRanges).toEqual([[0, 1]]);
  });

  it("subtracts the overhang both kana neighbours grant before expanding", () => {
    const request = rangeAdvancesFor(
      "\u306e\u5c71\u306e",
      [{ content: "gpjy", leftIndex: 1, rightIndex: 2 }],
      [
        { char: "\u306e", advance: 10 },
        { char: "\u5c71", advance: 10 },
        { char: "\u306e", advance: 10 },
      ],
    );

    // 24 wide ruby, minus 1 ruby em (10) of hiragana overhang per side.
    expect(request.rangeAdvances).toEqual([
      { start: 1, end: 2, minAdvance: 4, distribution: "even" },
    ]);
  });

  it("grants no overhang next to ideographic or western neighbours", () => {
    const request = rangeAdvancesFor(
      "\u5b57\u5c71A",
      [{ content: "gp", leftIndex: 1, rightIndex: 2 }],
      [
        { char: "\u5b57", advance: 10 },
        { char: "\u5c71", advance: 10 },
        { char: "A", advance: 10 },
      ],
    );

    expect(request.rangeAdvances).toEqual([
      { start: 1, end: 2, minAdvance: 12, distribution: "even" },
    ]);
  });

  it("never letterspaces a proportional base run when expanding it", () => {
    // Kana ruby over a Latin base (`BAD`, `Voc.`): the excess must go into
    // inter-word space or the edges, never between the letters.
    const request = rangeAdvancesFor(
      "\u5b57BAD\u5b57",
      [{ content: "\u30d0\u30c3\u30c9", leftIndex: 1, rightIndex: 4 }],
      [
        { char: "\u5b57", advance: 10 },
        { char: "B", advance: 5 },
        { char: "A", advance: 5 },
        { char: "D", advance: 5 },
        { char: "\u5b57", advance: 10 },
      ],
    );

    expect(request.rangeAdvances).toEqual([
      { start: 1, end: 4, minAdvance: 18, distribution: "whitespace" },
    ]);
  });

  it("centres ruby over the expanded base box, not over the bare clusters", () => {
    // Simulates what the layout engine returns once it has applied a
    // rangeAdvance: 4 units of edge gap on each side of the base cluster.
    const line = buildLine(
      buildClusters([
        { char: "\u5c71", advance: 10, leadingSpace: 4, trailingSpace: 4 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(6));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5c71",
      furigana: [{ content: "abc", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.baseX).toEqual([0, 18]);
    // 18-wide ruby over the 18-wide expanded box: flush, no overhang left.
    expect(ruby.runs[0]!.x).toBeCloseTo(0, 5);
  });
});

describe("layoutRubyParagraph: overhang budgets", () => {
  it("clamps and reports over-long ruby that its neighbours cannot absorb", () => {
    const line = buildLine(
      buildClusters([
        { char: "\u5b57", advance: 10 },
        { char: "\u5c71", advance: 10 },
        { char: "\u5b57", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(6));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5b57\u5c71\u5b57",
      furigana: [{ content: "abcd", leftIndex: 1, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
    });

    // Ideographic neighbours grant nothing, and the fake shaper ignores the
    // requested base expansion, so the run is centred and both sides report.
    expect(result.issues).toEqual([
      {
        kind: "overhangClamped",
        annotation: { content: "abcd", leftIndex: 1, rightIndex: 2 },
        side: "left",
        requested: 7,
        allowed: 0,
      },
      {
        kind: "overhangClamped",
        annotation: { content: "abcd", leftIndex: 1, rightIndex: 2 },
        side: "right",
        requested: 7,
        allowed: 0,
      },
    ]);
    const run = result.rubies[0]!.runs[0]!;
    expect(run.x).toBeCloseTo(10 - 7, 5);
  });

  it("resolves the two sides independently, shifting asymmetrically to stay centred", () => {
    // Ideographic on the left (0 budget), hiragana on the right (1 ruby em).
    const line = buildLine(
      buildClusters([
        { char: "\u5b57", advance: 10 },
        { char: "\u5c71", advance: 10 },
        { char: "\u306e", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(4));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5b57\u5c71\u306e",
      furigana: [{ content: "abcd", leftIndex: 1, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
    });

    // 16-wide ruby over a 10-wide base: excess 6, all of which the right-hand
    // hiragana can absorb, so the run sits flush with the base's left edge.
    expect(result.issues).toEqual([]);
    const run = result.rubies[0]!.runs[0]!;
    expect(run.x).toBeCloseTo(10, 5);
    expect(run.x + run.width - 20).toBeCloseTo(6, 5);
  });

  it("never overhangs past a bracket glyph itself", () => {
    // A narrow opening bracket: its class allows a full ruby em, but JLReq
    // caps the overhang at the bracket's own advance (3 here).
    const line = buildLine(
      buildClusters([
        { char: "\uff08", advance: 3 },
        { char: "\u5c71", advance: 10 },
        { char: "\u5b57", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(4));

    const result = layoutRubyParagraph(shaper, {
      text: "\uff08\u5c71\u5b57",
      furigana: [{ content: "abcd", leftIndex: 1, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
    });

    const run = result.rubies[0]!.runs[0]!;
    // Excess 6; the right (ideographic) side grants 0, so everything has to
    // come from the left, but the bracket caps it at its own 3-unit advance -
    // the ruby stops exactly at the bracket's left edge, never past it.
    expect(run.x).toBeCloseTo(0, 5);
    expect(result.issues).toEqual([
      {
        kind: "overhangClamped",
        annotation: { content: "abcd", leftIndex: 1, rightIndex: 2 },
        side: "right",
        requested: 3,
        allowed: 0,
      },
    ]);
  });

  it("honours a caller-supplied overhang table", () => {
    const line = buildLine(
      buildClusters([
        { char: "\u5b57", advance: 10 },
        { char: "\u5c71", advance: 10 },
        { char: "\u5b57", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(4));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5b57\u5c71\u5b57",
      furigana: [{ content: "abcd", leftIndex: 1, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
      rubyOverhang: { ideographic: 1.0 },
    });

    expect(result.issues).toEqual([]);
    const run = result.rubies[0]!.runs[0]!;
    expect(run.x).toBeCloseTo(7, 5); // centred, 3 units of overhang per side
  });
});

describe("layoutRubyParagraph: adjacent ruby collisions", () => {
  it("pushes only the following run apart, keeping the preceding one fixed", () => {
    // Two over-long annotations separated by a single hiragana, which grants
    // both of them a full ruby em of overhang into the same 10 units.
    const line = buildLine(
      buildClusters([
        { char: "\u5c71", advance: 10 },
        { char: "\u306e", advance: 10 },
        { char: "\u5ddd", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(8));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5c71\u306e\u5ddd",
      furigana: [
        { content: "abc", leftIndex: 0, rightIndex: 1 },
        { content: "def", leftIndex: 2, rightIndex: 3 },
      ],
      fontIds: [0],
      fontSize: 20,
    });

    const [first, second] = [...result.rubies].sort(
      (a, b) => a.baseX[0] - b.baseX[0],
    );
    // Both are 24 wide over a 10-wide base. The first sits at the line head,
    // where JLReq lets ruby hang out freely, so it centres at -7 and its ink
    // runs to 17 - overlapping the second, which started at 13.
    expect(first!.runs[0]!.x).toBeCloseTo(-7, 5);
    // The preceding run is untouched; only the following one moves, and only
    // as far as spending its own 7 units of left overhang allows.
    expect(second!.runs[0]!.x).toBeCloseTo(20, 5);
    expect(second!.inkLeft).toBeCloseTo(second!.baseX[0], 5);
    // Full separation (10) was not reachable, but the overlap is gone, so this
    // is the correct JLReq-constrained outcome rather than an error.
    expect(second!.inkLeft - first!.inkRight).toBeCloseTo(3, 5);
    expect(result.issues).toEqual([]);
  });

  it("does not fire on a fully annotated romanized line", () => {
    // Every base character carries ruby, so every neighbour is western and
    // grants no overhang at all: base expansion alone keeps them apart.
    const line = buildLine(
      buildClusters([
        { char: "B", advance: 10 },
        { char: "A", advance: 10 },
        { char: "D", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(3));

    const result = layoutRubyParagraph(shaper, {
      text: "BAD",
      furigana: [
        { content: "\u30d0", leftIndex: 0, rightIndex: 1 },
        { content: "\u30c3", leftIndex: 1, rightIndex: 2 },
        { content: "\u30c9", leftIndex: 2, rightIndex: 3 },
      ],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    expect(result.rubies).toHaveLength(3);
    for (let i = 1; i < result.rubies.length; i++) {
      expect(result.rubies[i]!.inkLeft).toBeGreaterThan(
        result.rubies[i - 1]!.inkRight,
      );
    }
  });

  it("chains three consecutive collisions in one left-to-right pass", () => {
    const line = buildLine(
      buildClusters([
        { char: "\u5c71", advance: 10 },
        { char: "\u306e", advance: 10 },
        { char: "\u5ddd", advance: 10 },
        { char: "\u306e", advance: 10 },
        { char: "\u6797", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(8));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5c71\u306e\u5ddd\u306e\u6797",
      furigana: [
        { content: "abc", leftIndex: 0, rightIndex: 1 },
        { content: "def", leftIndex: 2, rightIndex: 3 },
        { content: "ghi", leftIndex: 4, rightIndex: 5 },
      ],
      fontIds: [0],
      fontSize: 20,
    });

    const ordered = [...result.rubies].sort((a, b) => a.baseX[0] - b.baseX[0]);
    expect(ordered).toHaveLength(3);
    // Every run spent its whole left overhang and now sits flush with its own
    // base - none was dragged past it by the run before.
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]!.inkLeft).toBeCloseTo(ordered[i]!.baseX[0], 5);
    }
    // 24-wide ruby over a 10-wide base with only a 10-wide kana between: even
    // at zero overhang the second and third pair still overlap by 4, which is
    // reported rather than "fixed" by sliding ruby off its base.
    expect(ordered[1]!.inkLeft - ordered[0]!.inkRight).toBeCloseTo(3, 5);
    expect(ordered[2]!.inkLeft - ordered[1]!.inkRight).toBeCloseTo(-4, 5);
    expect(result.issues).toEqual([
      {
        kind: "rubyCollision",
        annotation: { content: "ghi", leftIndex: 4, rightIndex: 5 },
        other: { content: "def", leftIndex: 2, rightIndex: 3 },
        shortfall: 4,
      },
    ]);
  });

  it("never slides ruby off its base to separate adjacent expanded annotations", () => {
    // The fully-romanized shape: every base character is annotated and its
    // ruby is wider than it, so base expansion makes each ruby exactly fill
    // its own expanded box and consecutive runs touch at the shared boundary.
    // Chasing separation there would slide every ruby further right of the
    // character it annotates, compounding down the line.
    const line = buildLine(
      buildClusters([
        { char: "A", advance: 10, leadingSpace: 2, trailingSpace: 2 },
        { char: "B", advance: 10, leadingSpace: 2, trailingSpace: 2 },
        { char: "C", advance: 10, leadingSpace: 2, trailingSpace: 2 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(7));

    const result = layoutRubyParagraph(shaper, {
      text: "ABC",
      furigana: [
        { content: "ab", leftIndex: 0, rightIndex: 1 },
        { content: "ab", leftIndex: 1, rightIndex: 2 },
        { content: "ab", leftIndex: 2, rightIndex: 3 },
      ],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    const ordered = [...result.rubies].sort((a, b) => a.baseX[0] - b.baseX[0]);
    for (const ruby of ordered) {
      // Each ruby stays centred on its own expanded base box.
      const runsLeft = Math.min(...ruby.runs.map((run) => run.x));
      const runsRight = Math.max(...ruby.runs.map((run) => run.x + run.width));
      expect(runsLeft - ruby.baseX[0]).toBeCloseTo(
        ruby.baseX[1] - runsRight,
        5,
      );
    }
    // Consecutive runs are adjacent, never overlapping.
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]!.inkLeft).toBeGreaterThanOrEqual(
        ordered[i - 1]!.inkRight - 1e-6,
      );
    }
  });
});

describe("layoutRubyParagraph: line head and end", () => {
  it("shifts the line inward so ruby aligned at the line head is never clipped", () => {
    const line = buildLine(
      buildClusters([
        { char: "\u5c71", advance: 10 },
        { char: "\u306e", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(6));

    const result = layoutRubyParagraph(shaper, {
      text: "\u5c71\u306e",
      furigana: [{ content: "abc", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const placement = result.lines[0]!;
    const ruby = result.rubies[0]!;
    expect(ruby.inkLeft).toBeLessThan(0);
    // The ruby - not the base - ends up flush with the line head.
    expect(placement.contentOffsetX).toBeCloseTo(-ruby.inkLeft, 5);
    expect(placement.occupiedWidth).toBeGreaterThan(line.width);
    expect(result.width).toBe(placement.occupiedWidth);
  });

  it("leaves an un-annotated line untouched", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }]));
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(6));

    const result = layoutRubyParagraph(shaper, {
      text: "A",
      furigana: [],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.lines[0]).toMatchObject({
      contentOffsetX: 0,
      occupiedWidth: 10,
    });
  });

  it("pulls ruby back inside the content box and reports it", () => {
    const line = buildLine(
      buildClusters([
        { char: "\u306e", advance: 10 },
        { char: "\u5c71", advance: 10 },
      ]),
    );
    const shaper = makeShaper(buildParagraphLayout([line]), fakeShape(6));

    const result = layoutRubyParagraph(shaper, {
      text: "\u306e\u5c71",
      furigana: [{ content: "abc", leftIndex: 1, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
      maxWidth: 20,
    });

    const overflowIssues = result.issues.filter(
      (issue) => issue.kind === "outsideLineBox",
    );
    expect(overflowIssues).toHaveLength(1);
    expect(result.rubies[0]!.inkRight).toBeLessThanOrEqual(20 + 1e-6);
  });
});
