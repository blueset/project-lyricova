import { describe, expect, it } from "vitest";
import type { LayoutLine, ShapedCluster } from "@lyricova/glyph-renderer";
import {
  apply,
  clamp01,
  clusterFillExtent,
  clusterGlyphOffsets,
  composeClusterMatrix,
  defaultClusterAnchor,
  glyphFlipMatrix,
  IDENTITY,
  karaokeFillClip,
  karaokeFillFront,
  multiply,
  rotation,
  scaling,
  translation,
  type Affine,
  type FillExtent,
  type Point,
} from "./canvasGlyphGeometry";

function expectMatrixClose(actual: Affine, expected: Affine): void {
  for (let i = 0; i < 6; i += 1) {
    expect(actual[i]).toBeCloseTo(expected[i], 6);
  }
}

function expectPointClose(actual: Point, expected: Point): void {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

describe("affine primitives", () => {
  it("multiplies so the right operand is applied first", () => {
    // translate-then-scale vs scale-then-translate differ.
    const scaleThenTranslate = multiply(translation(10, 0), scaling(2, 2));
    expectPointClose(apply(scaleThenTranslate, { x: 3, y: 0 }), {
      x: 16,
      y: 0,
    });

    const translateThenScale = multiply(scaling(2, 2), translation(10, 0));
    expectPointClose(apply(translateThenScale, { x: 3, y: 0 }), {
      x: 26,
      y: 0,
    });
  });

  it("treats IDENTITY as a no-op", () => {
    expectPointClose(apply(IDENTITY, { x: 5, y: -7 }), { x: 5, y: -7 });
    expectMatrixClose(multiply(IDENTITY, scaling(3, 4)), scaling(3, 4));
    expectMatrixClose(multiply(scaling(3, 4), IDENTITY), scaling(3, 4));
  });

  it("rotates 90 degrees clockwise in y-down space", () => {
    const m = rotation(Math.PI / 2);
    expectPointClose(apply(m, { x: 1, y: 0 }), { x: 0, y: 1 });
    expectPointClose(apply(m, { x: 0, y: 1 }), { x: -1, y: 0 });
  });
});

describe("glyphFlipMatrix", () => {
  it("flips the y axis and translates to the pen offset", () => {
    const m = glyphFlipMatrix({ x: 12, y: -3 });
    expect(m).toEqual([1, 0, 0, -1, 12, -3]);
    // A y-up outline point (0, 10) [10px above baseline] lands 10px *up* in
    // screen space (smaller y) from the pen offset.
    expectPointClose(apply(m, { x: 0, y: 10 }), { x: 12, y: -13 });
    expectPointClose(apply(m, { x: 5, y: 0 }), { x: 17, y: -3 });
  });
});

describe("clusterGlyphOffsets", () => {
  it("advances the pen and preserves per-glyph offsets", () => {
    const cluster = {
      glyphs: [
        { xAdvance: 10, xOffset: 0, yOffset: 0 },
        { xAdvance: 12, xOffset: 1, yOffset: 2 },
        { xAdvance: 0, xOffset: -3, yOffset: 5 },
      ],
    } as unknown as Pick<ShapedCluster, "glyphs">;

    expect(clusterGlyphOffsets(cluster)).toEqual([
      { x: 0, y: 0 },
      { x: 11, y: -2 }, // pen 10 + xOffset 1, y = -yOffset
      { x: 19, y: -5 }, // pen 10+12 + xOffset -3
    ]);
  });

  it("returns an empty array for a glyph-less cluster", () => {
    expect(clusterGlyphOffsets({ glyphs: [] })).toEqual([]);
  });
});

describe("defaultClusterAnchor", () => {
  it("uses the ink-box centre (negating y for screen space)", () => {
    const anchor = defaultClusterAnchor({
      advance: 20,
      bounds: { xMin: 2, xMax: 18, yMin: 0, yMax: 30 },
    });
    expect(anchor).toEqual({ x: 10, y: -15 });
  });

  it("falls back to the baseline horizontal centre for ink-less clusters", () => {
    const anchor = defaultClusterAnchor({
      advance: 8,
      bounds: {
        xMin: Infinity,
        xMax: -Infinity,
        yMin: Infinity,
        yMax: -Infinity,
      },
    });
    expect(anchor).toEqual({ x: 4, y: 0 });
  });
});

describe("composeClusterMatrix", () => {
  const origin: Point = { x: 100, y: 50 };

  it("reduces to a translation to the pen origin with no transform", () => {
    const m = composeClusterMatrix(origin, undefined, { x: 5, y: 5 });
    expectMatrixClose(m, translation(100, 50));
    expectPointClose(apply(m, { x: 0, y: 0 }), { x: 100, y: 50 });
  });

  it("scales about the anchor, keeping the anchor point fixed", () => {
    const anchor: Point = { x: 10, y: -4 };
    const m = composeClusterMatrix(origin, { scale: 2 }, anchor);
    // The anchor maps to origin + anchor regardless of scale.
    expectPointClose(apply(m, anchor), {
      x: origin.x + anchor.x,
      y: origin.y + anchor.y,
    });
    // A point 1 unit right of the anchor moves to 2 units right after 2x scale.
    expectPointClose(apply(m, { x: anchor.x + 1, y: anchor.y }), {
      x: origin.x + anchor.x + 2,
      y: origin.y + anchor.y,
    });
  });

  it("applies translation on top of the origin", () => {
    const m = composeClusterMatrix(
      origin,
      { translate: { x: 7, y: -3 } },
      { x: 0, y: 0 },
    );
    expectPointClose(apply(m, { x: 0, y: 0 }), { x: 107, y: 47 });
  });

  it("rotates about the anchor", () => {
    const anchor: Point = { x: 4, y: 0 };
    const m = composeClusterMatrix(origin, { rotate: Math.PI / 2 }, anchor);
    expectPointClose(apply(m, anchor), { x: origin.x + 4, y: origin.y });
    // Point one unit right of the anchor rotates to one unit below it.
    expectPointClose(apply(m, { x: anchor.x + 1, y: 0 }), {
      x: origin.x + 4,
      y: origin.y + 1,
    });
  });
});

describe("clamp01", () => {
  it("clamps out-of-range and NaN values", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe("clusterFillExtent", () => {
  const line: Pick<LayoutLine, "top" | "baseline" | "height"> = {
    top: 0,
    baseline: 40,
    height: 50, // line box screen band: [-40, 10]
  };

  it("unions the advance box with the ink box (typical glyph)", () => {
    const extent = clusterFillExtent(
      { advance: 20, bounds: { xMin: 1, xMax: 18, yMin: 0, yMax: 30 } },
      line,
    );
    // Ink fits inside advance horizontally, inside line box vertically.
    expect(extent).toEqual({ left: 0, right: 20, top: -40, bottom: 10 });
  });

  it("extends left for a negative left side bearing (xMin < 0)", () => {
    const extent = clusterFillExtent(
      { advance: 20, bounds: { xMin: -6, xMax: 18, yMin: 0, yMax: 30 } },
      line,
    );
    expect(extent.left).toBe(-6);
    expect(extent.right).toBe(20);
  });

  it("extends right for ink beyond the advance (xMax > advance)", () => {
    const extent = clusterFillExtent(
      { advance: 20, bounds: { xMin: 0, xMax: 27, yMin: 0, yMax: 30 } },
      line,
    );
    expect(extent.left).toBe(0);
    expect(extent.right).toBe(27);
  });

  it("extends vertically for ink taller than a short line box", () => {
    const shortLine: Pick<LayoutLine, "top" | "baseline" | "height"> = {
      top: 0,
      baseline: 8,
      height: 10, // line box band: [-8, 2]
    };
    const extent = clusterFillExtent(
      // Ascender to y=30 (screen -30), descender to y=-12 (screen +12).
      { advance: 20, bounds: { xMin: 0, xMax: 20, yMin: -12, yMax: 30 } },
      shortLine,
    );
    expect(extent.top).toBe(-30); // ink ascender above the line box top (-8)
    expect(extent.bottom).toBe(12); // ink descender below the line box bottom (2)
  });

  it("collapses to the advance / line box for ink-less (non-finite) bounds", () => {
    const extent = clusterFillExtent(
      {
        advance: 12,
        bounds: {
          xMin: Infinity,
          xMax: -Infinity,
          yMin: Infinity,
          yMax: -Infinity,
        },
      },
      line,
    );
    expect(extent).toEqual({ left: 0, right: 12, top: -40, bottom: 10 });
  });
});

describe("karaokeFillClip", () => {
  const extent: FillExtent = { left: 0, right: 40, top: -10, bottom: 4 };

  it("fills left-to-right for ltr", () => {
    expect(karaokeFillClip(extent, 0.25, "ltr")).toEqual({
      x: 0,
      y: -10,
      width: 10,
      height: 14,
    });
  });

  it("fills right-to-left for rtl", () => {
    expect(karaokeFillClip(extent, 0.25, "rtl")).toEqual({
      x: 30,
      y: -10,
      width: 10,
      height: 14,
    });
  });

  it("covers the whole extent at fraction 1 and nothing at fraction 0", () => {
    // A cluster whose ink overshoots both the advance and a short line box.
    const wide: FillExtent = { left: -6, right: 46, top: -30, bottom: 12 };

    expect(karaokeFillClip(wide, 0, "ltr")).toMatchObject({ x: -6, width: 0 });
    expect(karaokeFillClip(wide, 0, "rtl")).toMatchObject({ x: 46, width: 0 });

    const fullLtr = karaokeFillClip(wide, 1, "ltr");
    expect(fullLtr).toEqual({ x: -6, y: -30, width: 52, height: 42 });
    const fullRtl = karaokeFillClip(wide, 1, "rtl");
    expect(fullRtl).toEqual({ x: -6, y: -30, width: 52, height: 42 });
  });

  it("clamps out-of-range fractions", () => {
    expect(karaokeFillClip(extent, 2, "ltr").width).toBe(40);
    expect(karaokeFillClip(extent, -1, "ltr").width).toBe(0);
  });
});

describe("karaokeFillFront", () => {
  const extent: FillExtent = { left: 0, right: 40, top: -10, bottom: 4 };

  it("tracks the ltr clip's right (leading) edge", () => {
    for (const fraction of [0, 0.25, 0.5, 1]) {
      const clip = karaokeFillClip(extent, fraction, "ltr");
      expect(karaokeFillFront(extent, fraction, "ltr")).toBeCloseTo(
        clip.x + clip.width,
        6,
      );
    }
    expect(karaokeFillFront(extent, 0.25, "ltr")).toBe(10);
  });

  it("tracks the rtl clip's left (leading) edge", () => {
    for (const fraction of [0, 0.25, 0.5, 1]) {
      const clip = karaokeFillClip(extent, fraction, "rtl");
      expect(karaokeFillFront(extent, fraction, "rtl")).toBeCloseTo(clip.x, 6);
    }
    expect(karaokeFillFront(extent, 0.25, "rtl")).toBe(30);
  });

  it("sits at the reading-start edge at 0 and the far edge at 1", () => {
    expect(karaokeFillFront(extent, 0, "ltr")).toBe(0);
    expect(karaokeFillFront(extent, 1, "ltr")).toBe(40);
    expect(karaokeFillFront(extent, 0, "rtl")).toBe(40);
    expect(karaokeFillFront(extent, 1, "rtl")).toBe(0);
  });

  it("clamps out-of-range fractions", () => {
    expect(karaokeFillFront(extent, 2, "ltr")).toBe(40);
    expect(karaokeFillFront(extent, -1, "ltr")).toBe(0);
    expect(karaokeFillFront(extent, 2, "rtl")).toBe(0);
    expect(karaokeFillFront(extent, -1, "rtl")).toBe(40);
  });

  it("honours a negative left bearing / advance overshoot in the span", () => {
    const wide: FillExtent = { left: -6, right: 46, top: -30, bottom: 12 };
    // Half-swept front is the midpoint of the full [-6, 46] span.
    expect(karaokeFillFront(wide, 0.5, "ltr")).toBe(20);
    expect(karaokeFillFront(wide, 0.5, "rtl")).toBe(20);
  });
});
