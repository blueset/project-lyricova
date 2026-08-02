import { describe, expect, it } from "vitest";
import {
  collectRubyClearanceLoss,
  resolveRubyVerticalMetrics,
  typoBoxEm,
} from "./rubyVerticalMetrics";
import { fakeFontMetrics } from "./testFixtures";

/** Real shapes: 0 = Latin (sTypo == hhea), 1 = pan-CJK (sTypo is the em box). */
const shaper = {
  fontMetrics: fakeFontMetrics({
    0: {
      ascender: 1090,
      descender: -320,
      typoAscender: 1090,
      typoDescender: -320,
    },
    1: {
      ascender: 1160,
      descender: -288,
      typoAscender: 880,
      typoDescender: -120,
    },
  }),
};

describe("typoBoxEm", () => {
  it("prefers the sTypo box, which for a pan-CJK face is the ideographic em box", () => {
    expect(typoBoxEm(shaper, 1)).toEqual({ ascentEm: 0.88, descentEm: 0.12 });
  });

  it("is identical to hhea for a Latin face that declares them the same", () => {
    expect(typoBoxEm(shaper, 0)).toEqual({ ascentEm: 1.09, descentEm: 0.32 });
  });

  it("falls back to hhea when OS/2 predates sTypo", () => {
    const legacy = {
      fontMetrics: fakeFontMetrics({
        2: {
          ascender: 900,
          descender: -200,
          typoAscender: null,
          typoDescender: null,
        },
      }),
    };
    expect(typoBoxEm(legacy, 2)).toEqual({ ascentEm: 0.9, descentEm: 0.2 });
  });

  it("falls back to hhea for a degenerate (zero or inverted) sTypo box", () => {
    const broken = {
      fontMetrics: fakeFontMetrics({
        3: {
          ascender: 900,
          descender: -200,
          typoAscender: 0,
          typoDescender: 0,
        },
      }),
    };
    expect(typoBoxEm(broken, 3)).toEqual({ ascentEm: 0.9, descentEm: 0.2 });
  });
});

describe("resolveRubyVerticalMetrics", () => {
  it("takes the widest base box and the deepest ruby box across the fonts used", () => {
    expect(resolveRubyVerticalMetrics(shaper, [1], [0, 1])).toEqual({
      baseAscentEm: 0.88,
      rubyAscentEm: 1.09,
      rubyDescentEm: 0.32,
    });
  });

  it("ignores fonts that shaped nothing annotated", () => {
    // A Latin font elsewhere on the line must not inflate the base anchor: no
    // ruby sits above it, and using it would restore the chain-order
    // dependency this exists to remove.
    const withLatin = resolveRubyVerticalMetrics(shaper, [1], [1]);
    const withoutLatin = resolveRubyVerticalMetrics(shaper, [1, 0], [1]);
    expect(withLatin!.baseAscentEm).toBe(0.88);
    expect(withoutLatin!.baseAscentEm).toBe(1.09);
  });

  it("returns null when no font was used at all", () => {
    expect(resolveRubyVerticalMetrics(shaper, [], [])).toBeNull();
  });

  it("substitutes the other side when only one is present", () => {
    expect(resolveRubyVerticalMetrics(shaper, [1], [])).toEqual({
      baseAscentEm: 0.88,
      rubyAscentEm: 0.88,
      rubyDescentEm: 0,
    });
  });
});

describe("collectRubyClearanceLoss", () => {
  const anchors = { baseTypoTop: 28.16, rubyReservedDescent: 1.92, rubyGap: 0 };

  it("stays silent when a font merely overshoots its sTypo box", () => {
    // Ruby ink 3.09 vs 1.92 reserved overshoots by 1.17, but the base ink stops
    // 2.00 short of its own box, so nothing actually touches.
    expect(
      collectRubyClearanceLoss(
        [{ rubyFontIds: [0], baseInkTop: 26.16, rubyInkDescent: 3.09 }],
        anchors,
      ),
    ).toEqual([]);
  });

  it("reports a genuine collision, attributed to the ruby font", () => {
    expect(
      collectRubyClearanceLoss(
        [{ rubyFontIds: [0], baseInkTop: 28.16, rubyInkDescent: 4.0 }],
        anchors,
      ),
    ).toEqual([{ fontId: 0, overlap: 2.08 }]);
  });

  it("credits rubyGap as clearance", () => {
    const colliding = [
      { rubyFontIds: [0], baseInkTop: 28.16, rubyInkDescent: 4.0 },
    ];
    expect(
      collectRubyClearanceLoss(colliding, { ...anchors, rubyGap: 4 }),
    ).toEqual([]);
  });

  it("reports each font once, keeping its worst overlap", () => {
    const losses = collectRubyClearanceLoss(
      [
        { rubyFontIds: [0], baseInkTop: 28.16, rubyInkDescent: 3.0 },
        { rubyFontIds: [0], baseInkTop: 28.16, rubyInkDescent: 5.0 },
        { rubyFontIds: [1], baseInkTop: 28.16, rubyInkDescent: 4.0 },
      ],
      anchors,
    );
    expect(losses).toEqual([
      { fontId: 0, overlap: 3.08 },
      { fontId: 1, overlap: 2.08 },
    ]);
  });

  it("counts base ink above its own box against the clearance too", () => {
    // The base overshooting upward is just as harmful as ruby overshooting
    // downward, so one signed comparison covers both.
    expect(
      collectRubyClearanceLoss(
        [{ rubyFontIds: [0], baseInkTop: 31.0, rubyInkDescent: 1.92 }],
        anchors,
      ),
    ).toEqual([{ fontId: 0, overlap: expect.closeTo(2.84, 5) }]);
  });
});
