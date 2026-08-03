import { describe, expect, it } from "vitest";
import {
  collectRubyClearanceLoss,
  declaresTypoBox,
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

describe("capping the base reservation by measured ink", () => {
  it("stops a Latin line box from lifting the whole document's ruby row", () => {
    // Font 0 is Mona Sans-shaped: its sTypo is really its hhea line box
    // (1.090 em) though capitals reach only 0.729 em. Uncapped, a single Latin
    // ruby base raised the shared anchor by 0.21 em over the pan-CJK box and
    // pushed ruby visibly away from the text on *every* line.
    const uncapped = resolveRubyVerticalMetrics(shaper, [0], [1]);
    expect(uncapped?.baseAscentEm).toBeCloseTo(1.09, 6);

    const capped = resolveRubyVerticalMetrics(shaper, [0], [1], {
      baseInkAscentEm: new Map([[0, 0.729]]),
    });
    expect(capped?.baseAscentEm).toBeCloseTo(0.729, 6);
  });

  it("never reserves more than sTypo even when ink overshoots it", () => {
    // sTypo stays the upper bound; overshoot is surfaced as a clearance issue
    // rather than silently inflating every line.
    const metrics = resolveRubyVerticalMetrics(shaper, [0], [1], {
      baseInkAscentEm: new Map([[0, 2]]),
    });
    expect(metrics?.baseAscentEm).toBeCloseTo(1.09, 6);
  });

  it("caps only the font that declared no typographic box", () => {
    // Font 1 (pan-CJK) declares sTypo 880 against hhea 1160, so its box is
    // authoritative and survives verbatim - ruby belongs above the ideographic
    // em box, not above whichever kanji the line happens to contain (JLReq).
    // Font 0 copied hhea into sTypo, so it is capped to its ink.
    const metrics = resolveRubyVerticalMetrics(shaper, [0, 1], [1], {
      baseInkAscentEm: new Map([
        [0, 0.729], // Latin capitals
        [1, 0.813], // kanji ink, below the em box
      ]),
    });
    expect(metrics?.baseAscentEm).toBeCloseTo(0.88, 6);
  });

  it("keeps a real typographic box even when its ink falls short", () => {
    const metrics = resolveRubyVerticalMetrics(shaper, [1], [1], {
      baseInkAscentEm: new Map([[1, 0.5]]),
    });
    expect(metrics?.baseAscentEm).toBeCloseTo(0.88, 6);
  });

  it("distinguishes the two cases by sTypo vs hhea", () => {
    expect(declaresTypoBox(shaper, 0)).toBe(false); // sTypo == hhea
    expect(declaresTypoBox(shaper, 1)).toBe(true); // 880 vs 1160
  });

  it("falls back to sTypo for a font with no measured ink", () => {
    // A fully blank annotated range must not collapse the reservation to zero.
    for (const ink of [undefined, 0]) {
      const map = ink === undefined ? new Map() : new Map([[0, ink]]);
      const metrics = resolveRubyVerticalMetrics(shaper, [0], [1], {
        baseInkAscentEm: map,
      });
      expect(metrics?.baseAscentEm).toBeCloseTo(1.09, 6);
    }
  });

  it("leaves the ruby side untouched", () => {
    const metrics = resolveRubyVerticalMetrics(shaper, [0], [1], {
      baseInkAscentEm: new Map([[0, 0.729]]),
    });
    expect(metrics?.rubyAscentEm).toBeCloseTo(0.88, 6);
    expect(metrics?.rubyDescentEm).toBeCloseTo(0.12, 6);
  });
});
