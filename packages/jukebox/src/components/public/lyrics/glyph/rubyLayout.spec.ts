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
  it("places mono ruby (base/ruby grapheme counts match) centered per grapheme", () => {
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
      { content: "xy", leftIndex: 0, rightIndex: 2 },
    ];
    const result = layoutRubyParagraph(shaper, {
      text: "AB",
      furigana,
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    expect(shaper.layoutParagraph).toHaveBeenCalledWith(
      expect.objectContaining({ noBreakRanges: [[0, 2]] }),
    );

    expect(result.rubies).toHaveLength(1);
    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("mono");
    expect(ruby.lineIndex).toBe(0);
    expect(ruby.baseX).toEqual([0, 20]);
    expect(ruby.fontSize).toBe(10); // default rubyFontSize = fontSize * 0.5
    // Ink ascent measured from the fake glyph outlines: rubyFontSize(10) * 0.8 = 8; no descender (ratio 0).
    expect(ruby.inkAscent).toBe(8);
    expect(ruby.inkDescent).toBe(0);
    expect(ruby.y).toBe(8);
    expect(ruby.runs).toHaveLength(2);
    // Cluster "A" [0,10) center 5, ruby run width 3 -> x = 3.5.
    expect(ruby.runs[0]).toMatchObject({
      contentRange: [0, 1],
      width: 3,
      x: 3.5,
    });
    // Cluster "B" [10,20) center 15, ruby run width 3 -> x = 13.5.
    expect(ruby.runs[1]).toMatchObject({
      contentRange: [1, 2],
      width: 3,
      x: 13.5,
    });

    const linePlacement = result.lines[0]!;
    expect(linePlacement.top).toBe(0);
    expect(linePlacement.height).toBe(18); // original height 10 + extent (ascent 8 + descent 0 + gap 0)
    expect(linePlacement.baseline).toBe(16); // 0 + extent(8) + ascentOffset(8)
    expect(linePlacement.rubies).toEqual([ruby]);
    expect(result.height).toBe(18);
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

  it("distributes group ruby across its clusters (space-around) when narrower than the base", () => {
    const line = buildLine(
      buildClusters([
        { char: "C", advance: 10 },
        { char: "D", advance: 10 },
      ]),
    );
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout, fakeShape(5));

    const result = layoutRubyParagraph(shaper, {
      text: "CD",
      furigana: [{ content: "pqr", leftIndex: 0, rightIndex: 2 }],
      fontIds: [0],
      fontSize: 20,
    });

    expect(result.issues).toEqual([]);
    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("group");
    expect(ruby.baseX).toEqual([0, 20]);
    // 3 graphemes * 5 width = 15, narrower than the 20-wide base -> split
    // into 3 clusters distributed with equal, non-negative gaps.
    expect(ruby.runs).toHaveLength(3);
    for (let i = 1; i < ruby.runs.length; i++) {
      const gap =
        ruby.runs[i]!.x - (ruby.runs[i - 1]!.x + ruby.runs[i - 1]!.width);
      expect(gap).toBeGreaterThanOrEqual(0);
    }
    // Symmetric margins on both sides of the base range.
    const first = ruby.runs[0]!;
    const last = ruby.runs[ruby.runs.length - 1]!;
    expect(first.x - 0).toBeCloseTo(20 - (last.x + last.width), 5);
    expect(shaper.shape).toHaveBeenCalledWith(
      expect.objectContaining({ text: "pqr" }),
    );
  });

  it("keeps group ruby as one centered block with symmetric overhang when wider than the base", () => {
    const line = buildLine(buildClusters([{ char: "E", advance: 6 }]));
    const paragraphLayout = buildParagraphLayout([line]);
    const shaper = makeShaper(paragraphLayout, fakeShape(6));

    const result = layoutRubyParagraph(shaper, {
      text: "E",
      furigana: [{ content: "wxyz", leftIndex: 0, rightIndex: 1 }],
      fontIds: [0],
      fontSize: 20,
    });

    const ruby = result.rubies[0]!;
    expect(ruby.mode).toBe("group");
    // 4 graphemes * 6 width = 24, wider than the 6-wide base -> kept as one
    // contextually shaped block, centered with symmetric overhang.
    expect(ruby.runs).toHaveLength(1);
    const run = ruby.runs[0]!;
    expect(run.width).toBe(24);
    expect(run.contentRange).toEqual([0, 4]);
    const overhangLeft = 0 - run.x;
    const overhangRight = run.x + run.width - 6;
    expect(overhangLeft).toBeCloseTo(overhangRight, 5);
  });

  it("reserves ruby row height only for lines that actually have ruby", () => {
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

    expect(result.lines[0]).toMatchObject({ top: 0, height: 10 });
    // extent = ink ascent(8) + descent(0) + gap(0) = 8; 10 + 8 = 18.
    expect(result.lines[1]).toMatchObject({ top: 10, height: 18 });
    expect(result.height).toBe(28);
  });

  it('covers ruby descenders (e.g. a Latin "g") by reserving inkDescent', () => {
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
    expect(ruby.inkAscent).toBe(7);
    expect(ruby.inkDescent).toBe(3);
    expect(ruby.y).toBe(7);
    // extent = ascent(7) + descent(3) + gap(0) = 10 - the descender's own
    // room is reserved, not just the ascent.
    expect(result.lines[0]!.height).toBe(line.height + 10);
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
    expect(ruby.mode).toBe("group"); // base "A" is 1 grapheme, ruby "ab" is 2 - can't map 1:1.
    // Only "b" contributes ink; "a" (no outline) contributes nothing, not NaN.
    expect(ruby.inkAscent).toBe(6);
    expect(ruby.inkDescent).toBe(2);
  });

  it("reserves zero extent when a ruby annotation has no drawable outline at all", () => {
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
    expect(ruby.y).toBe(0);
    expect(result.lines[0]!.height).toBe(line.height); // no extra room reserved
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

  it("uses the max ink ascent/descent across multiple ruby annotations sharing a line, not their sum", () => {
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
    // Line reserves max ascent (9) + max descent (6) + gap(0) = 15 - never
    // the sum of both annotations' individual extents.
    expect(result.lines[0]!.height).toBe(line.height + 15);
    // Both annotations share the same baseline on this line.
    expect(rubyA!.y).toBe(9);
    expect(rubyB!.y).toBe(9);
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
