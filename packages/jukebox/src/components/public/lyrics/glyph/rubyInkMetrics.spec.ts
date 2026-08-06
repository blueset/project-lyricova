import { describe, expect, it } from "vitest";
import {
  combineRubyInkMetrics,
  lookupGlyphOutline,
  measureRubyInkHorizontalExtent,
  measureRubyInkMetrics,
} from "./rubyInkMetrics";
import type { GlyphOutlineCache } from "./rubyInkMetrics";
import type {
  GlyphOutline,
  GlyphOutlineRequest,
} from "@lyricova/glyph-renderer";
import type { RubyRun } from "./types";

function fakeShaper(
  resolve: (request: GlyphOutlineRequest) => GlyphOutline | null,
) {
  const calls: GlyphOutlineRequest[] = [];
  return {
    calls,
    glyphOutline: (request: GlyphOutlineRequest): GlyphOutline | null => {
      calls.push(request);
      return resolve(request);
    },
  };
}

function outline(yMin: number, yMax: number): GlyphOutline {
  return {
    commands: [],
    bounds: { xMin: 0, xMax: 10, yMin, yMax },
    unitsPerEm: 1000,
    fontSize: 10,
    scale: 0.01,
  };
}

function outlineX(xMin: number, xMax: number): GlyphOutline {
  return {
    commands: [],
    bounds: { xMin, xMax, yMin: 0, yMax: 10 },
    unitsPerEm: 1000,
    fontSize: 10,
    scale: 0.01,
  };
}

/** Builds a minimal `RubyRun` with one glyph at local `x` within the run. */
function makeRun(runX: number, width: number, glyphX = 0): RubyRun {
  return {
    contentRange: [0, 1],
    width,
    x: runX,
    glyphs: [
      {
        glyphId: 1,
        fontId: 0,
        cluster: 0,
        clusterEnd: 1,
        clusterUtf16: 0,
        clusterEndUtf16: 1,
        xAdvance: width,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0,
        x: glyphX,
      },
    ],
  };
}

describe("measureRubyInkMetrics", () => {
  it("returns the glyph's own ascent/descent for a single glyph", () => {
    const shaper = fakeShaper(() => outline(-2, 8));
    const result = measureRubyInkMetrics(
      shaper,
      [{ fontId: 0, glyphId: 1 }],
      10,
    );
    expect(result).toEqual({ ascent: 8, descent: 2 });
  });

  it("treats a positive-yMin glyph (no descender) as zero descent, never negative", () => {
    const shaper = fakeShaper(() => outline(0, 8));
    const result = measureRubyInkMetrics(
      shaper,
      [{ fontId: 0, glyphId: 1 }],
      10,
    );
    expect(result.descent).toBe(0);
  });

  it("takes the max ascent and max descent across multiple glyphs", () => {
    const outlines = new Map<number, GlyphOutline>([
      [1, outline(-1, 5)],
      [2, outline(-6, 3)],
      [3, outline(-2, 9)],
    ]);
    const shaper = fakeShaper((request) => outlines.get(request.glyphId)!);
    const result = measureRubyInkMetrics(
      shaper,
      [
        { fontId: 0, glyphId: 1 },
        { fontId: 0, glyphId: 2 },
        { fontId: 0, glyphId: 3 },
      ],
      10,
    );
    expect(result).toEqual({ ascent: 9, descent: 6 });
  });

  it("skips outline-less glyphs (null) without crashing or producing NaN", () => {
    const shaper = fakeShaper((request) =>
      request.glyphId === 1 ? null : outline(-3, 7),
    );
    const result = measureRubyInkMetrics(
      shaper,
      [
        { fontId: 0, glyphId: 1 },
        { fontId: 0, glyphId: 2 },
      ],
      10,
    );
    expect(result).toEqual({ ascent: 7, descent: 3 });
    expect(Number.isNaN(result.ascent)).toBe(false);
    expect(Number.isNaN(result.descent)).toBe(false);
  });

  it("returns zero metrics for an empty glyph list", () => {
    const shaper = fakeShaper(() => outline(-5, 10));
    expect(measureRubyInkMetrics(shaper, [], 10)).toEqual({
      ascent: 0,
      descent: 0,
    });
  });

  it("returns zero metrics when every glyph has no outline", () => {
    const shaper = fakeShaper(() => null);
    const result = measureRubyInkMetrics(
      shaper,
      [
        { fontId: 0, glyphId: 1 },
        { fontId: 0, glyphId: 2 },
      ],
      10,
    );
    expect(result).toEqual({ ascent: 0, descent: 0 });
  });

  it("distinguishes metrics by fontId (a distinct ruby fallback font)", () => {
    const shaper = fakeShaper((request) =>
      request.fontId === 7 ? outline(-4, 12) : outline(-1, 3),
    );
    const rubyFontGlyphs = measureRubyInkMetrics(
      shaper,
      [{ fontId: 7, glyphId: 1 }],
      10,
    );
    const baseFontGlyphs = measureRubyInkMetrics(
      shaper,
      [{ fontId: 0, glyphId: 1 }],
      10,
    );
    expect(rubyFontGlyphs).toEqual({ ascent: 12, descent: 4 });
    expect(baseFontGlyphs).toEqual({ ascent: 3, descent: 1 });
  });

  it("passes matching variations through to glyphOutline (per its documented contract)", () => {
    let seenVariations: readonly string[] | undefined;
    const shaper = fakeShaper((request) => {
      seenVariations = request.variations;
      return outline(-1, 5);
    });
    measureRubyInkMetrics(shaper, [{ fontId: 0, glyphId: 1 }], 10, [
      "wght=700",
    ]);
    expect(seenVariations).toEqual(["wght=700"]);
  });
});

describe("measureRubyInkHorizontalExtent", () => {
  it("matches the advance box when the glyph's ink stays within it", () => {
    const shaper = fakeShaper(() => outlineX(0, 10));
    const run = makeRun(0, 10);
    const result = measureRubyInkHorizontalExtent(shaper, [run], 10);
    expect(result).toEqual({ left: 0, right: 10 });
  });

  it("extends left for negative left side bearing (ink starting before the pen origin)", () => {
    // Glyph ink starts at x=-3 relative to its own pen (run.x=5, glyph.x=0),
    // i.e. line-relative x=2 - narrower than the run's advance box [5, 15)
    // would suggest.
    const shaper = fakeShaper(() => outlineX(-3, 10));
    const run = makeRun(5, 10);
    const result = measureRubyInkHorizontalExtent(shaper, [run], 10);
    expect(result.left).toBe(2);
    expect(result.right).toBe(15); // advance box still wins on the right
  });

  it("extends right for ink overhanging past the advance width", () => {
    const shaper = fakeShaper(() => outlineX(0, 14));
    const run = makeRun(5, 10);
    const result = measureRubyInkHorizontalExtent(shaper, [run], 10);
    expect(result.left).toBe(5); // advance box still wins on the left
    expect(result.right).toBe(19); // 5 (run.x) + 14 (xMax)
  });

  it("unions negative left bearing and right overhang together across one glyph", () => {
    const shaper = fakeShaper(() => outlineX(-4, 13));
    const run = makeRun(5, 10);
    const result = measureRubyInkHorizontalExtent(shaper, [run], 10);
    expect(result.left).toBe(1); // 5 + (-4)
    expect(result.right).toBe(18); // 5 + 13
  });

  it("takes the min/max across multiple runs", () => {
    const shaper = fakeShaper((request) =>
      request.glyphId === 1 ? outlineX(-2, 8) : outlineX(0, 12),
    );
    const runA = makeRun(0, 8);
    const runB: RubyRun = {
      ...makeRun(20, 10),
      glyphs: [{ ...makeRun(20, 10).glyphs[0]!, glyphId: 2 }],
    };
    const result = measureRubyInkHorizontalExtent(shaper, [runA, runB], 10);
    expect(result.left).toBe(-2); // runA: 0 + (-2)
    expect(result.right).toBe(32); // runB: 20 + 12
  });

  it("falls back to the advance box when the glyph has no drawable outline", () => {
    const shaper = fakeShaper(() => null);
    const run = makeRun(3, 7);
    const result = measureRubyInkHorizontalExtent(shaper, [run], 10);
    expect(result).toEqual({ left: 3, right: 10 });
  });

  it("returns zero extent for an empty run list", () => {
    const shaper = fakeShaper(() => outlineX(0, 10));
    expect(measureRubyInkHorizontalExtent(shaper, [], 10)).toEqual({
      left: 0,
      right: 0,
    });
  });

  it("uses a supplied cache to avoid re-querying the same glyph", () => {
    const shaper = fakeShaper(() => outlineX(0, 10));
    const cache: GlyphOutlineCache = new Map();
    const run = makeRun(0, 10);
    measureRubyInkHorizontalExtent(shaper, [run], 10, [], cache);
    measureRubyInkHorizontalExtent(shaper, [run], 10, [], cache);
    expect(shaper.calls).toHaveLength(1);
  });
});

describe("lookupGlyphOutline caching", () => {
  it("memoizes repeated lookups for the same (fontId, glyphId, fontSize, variations)", () => {
    const shaper = fakeShaper(() => outline(-1, 5));
    const cache: GlyphOutlineCache = new Map();
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10, [], cache);
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10, [], cache);
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10, [], cache);
    expect(shaper.calls).toHaveLength(1);
  });

  it("caches a null (outline-less) result too, without re-querying", () => {
    const shaper = fakeShaper(() => null);
    const cache: GlyphOutlineCache = new Map();
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10, [], cache);
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10, [], cache);
    expect(shaper.calls).toHaveLength(1);
  });

  it("treats a different fontId/glyphId/fontSize/variations as a distinct cache entry", () => {
    const shaper = fakeShaper(() => outline(-1, 5));
    const cache: GlyphOutlineCache = new Map();
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10, [], cache);
    lookupGlyphOutline(shaper, { fontId: 1, glyphId: 1 }, 10, [], cache);
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 2 }, 10, [], cache);
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 12, [], cache);
    lookupGlyphOutline(
      shaper,
      { fontId: 0, glyphId: 1 },
      10,
      ["wght=700"],
      cache,
    );
    expect(shaper.calls).toHaveLength(5);
  });

  it("skips caching entirely when no cache is supplied", () => {
    const shaper = fakeShaper(() => outline(-1, 5));
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10);
    lookupGlyphOutline(shaper, { fontId: 0, glyphId: 1 }, 10);
    expect(shaper.calls).toHaveLength(2);
  });
});

describe("combineRubyInkMetrics", () => {
  it("combines several annotations into the single max ascent/max descent a line needs", () => {
    const result = combineRubyInkMetrics([
      { ascent: 9, descent: 1 },
      { ascent: 3, descent: 6 },
      { ascent: 5, descent: 5 },
    ]);
    expect(result).toEqual({ ascent: 9, descent: 6 });
  });

  it("returns zero metrics for an empty list", () => {
    expect(combineRubyInkMetrics([])).toEqual({ ascent: 0, descent: 0 });
  });

  it("returns the single entry unchanged for a one-annotation line", () => {
    expect(combineRubyInkMetrics([{ ascent: 4, descent: 2 }])).toEqual({
      ascent: 4,
      descent: 2,
    });
  });
});
