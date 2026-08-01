import { describe, expect, it } from "vitest";
import {
  groupGlyphsByCluster,
  isMonoEligible,
  placeGroupRuby,
  placeMonoRuby,
} from "./rubyPlacement";
import type { MonoRubyGraphemeInput } from "./rubyPlacement";
import { buildClusters, makeSourceRange } from "./testFixtures";
import type { PositionedRubyGlyph } from "./types";
import type { ResolvedShapeRun } from "./glyphMetrics";
import type { ShapedCluster } from "@lyricova/glyph-renderer";

function glyph(
  overrides: Partial<PositionedRubyGlyph> & { x: number; xAdvance: number },
): PositionedRubyGlyph {
  return {
    glyphId: 0,
    fontId: 0,
    cluster: 0,
    clusterEnd: 1,
    clusterUtf16: 0,
    clusterEndUtf16: 1,
    yAdvance: 0,
    xOffset: 0,
    yOffset: 0,
    ...overrides,
  };
}

/** A run of glyphs, one per grapheme, each `advance` wide, contiguous clusters. */
function singleClusterRun(advance: number, clusterUtf16 = 0): ResolvedShapeRun {
  return {
    glyphs: [
      glyph({
        x: 0,
        xAdvance: advance,
        clusterUtf16,
        clusterEndUtf16: clusterUtf16 + 1,
      }),
    ],
    width: advance,
  };
}

describe("isMonoEligible", () => {
  it("is eligible when base graphemes, base clusters, and ruby graphemes all match", () => {
    expect(isMonoEligible(2, 2, 2)).toBe(true);
  });

  it("is not eligible when ruby grapheme count differs from base", () => {
    expect(isMonoEligible(2, 2, 3)).toBe(false);
  });

  it("is not eligible when a ligature merged base graphemes into fewer clusters", () => {
    expect(isMonoEligible(2, 1, 2)).toBe(false);
  });

  it("is not eligible for an empty base", () => {
    expect(isMonoEligible(0, 0, 0)).toBe(false);
  });
});

describe("groupGlyphsByCluster", () => {
  it("groups consecutive glyphs that share the same source cluster", () => {
    // Two glyphs forming a ligature-like single cluster [0,1), then a
    // second, separate cluster [1,2).
    const glyphs: PositionedRubyGlyph[] = [
      glyph({ x: 0, xAdvance: 4, clusterUtf16: 0, clusterEndUtf16: 1 }),
      glyph({ x: 4, xAdvance: 3, clusterUtf16: 0, clusterEndUtf16: 1 }),
      glyph({ x: 7, xAdvance: 6, clusterUtf16: 1, clusterEndUtf16: 2 }),
    ];

    const groups = groupGlyphsByCluster(glyphs);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ contentRange: [0, 1], width: 7 });
    expect(groups[0]!.glyphs.map((g) => g.x)).toEqual([0, 4]);
    expect(groups[1]).toMatchObject({ contentRange: [1, 2], width: 6 });
    // Re-based to 0 at the group's own pen start.
    expect(groups[1]!.glyphs.map((g) => g.x)).toEqual([0]);
  });

  it("returns an empty array for no glyphs", () => {
    expect(groupGlyphsByCluster([])).toEqual([]);
  });
});

describe("placeMonoRuby", () => {
  it("centers each ruby grapheme over its corresponding base cluster", () => {
    // Base clusters "A" (0..10) and "B" (10..25, wider).
    const baseClusters = buildClusters([
      { char: "A", advance: 10 },
      { char: "B", advance: 15 },
    ]);
    const graphemes: MonoRubyGraphemeInput[] = [
      { contentRange: [0, 1], run: singleClusterRun(4) },
      { contentRange: [1, 2], run: singleClusterRun(8) },
    ];

    const { runs, baseX } = placeMonoRuby(baseClusters, graphemes);

    expect(baseX).toEqual([0, 25]);
    expect(runs).toHaveLength(2);
    // Cluster "A" spans [0,10), center 5; ruby run width 4 -> x = 3.
    expect(runs[0]).toMatchObject({ contentRange: [0, 1], width: 4, x: 3 });
    // Cluster "B" spans [10,25), center 17.5; ruby run width 8 -> x = 13.5.
    expect(runs[1]).toMatchObject({ contentRange: [1, 2], width: 8, x: 13.5 });
  });

  it("pairs base clusters with ruby graphemes by logical source order, not visual x", () => {
    // Two base clusters whose visual x order is the *reverse* of their
    // logical source order (as could happen under bidi reordering): cluster
    // "first" starts earliest in the source but is drawn furthest right.
    const first: ShapedCluster = {
      source: makeSourceRange(0, 1),
      fontId: 0,
      direction: "ltr",
      script: "Latn",
      level: 0,
      glyphs: [],
      x: 10,
      advance: 5,
      bounds: { xMin: 0, xMax: 5, yMin: 0, yMax: 0 },
      isWhitespace: false,
    };
    const second: ShapedCluster = {
      source: makeSourceRange(1, 2),
      fontId: 0,
      direction: "ltr",
      script: "Latn",
      level: 0,
      glyphs: [],
      x: 0,
      advance: 5,
      bounds: { xMin: 0, xMax: 5, yMin: 0, yMax: 0 },
      isWhitespace: false,
    };
    // Passed in visual (x-ascending) order: [second, first].
    const baseClusters = [second, first];
    const graphemes: MonoRubyGraphemeInput[] = [
      { contentRange: [0, 1], run: singleClusterRun(1) }, // logically first grapheme
      { contentRange: [1, 2], run: singleClusterRun(1) }, // logically second grapheme
    ];

    const { runs } = placeMonoRuby(baseClusters, graphemes);

    // Grapheme 0 (contentRange [0,1)) must pair with `first` (source starts
    // at 0), centered at x=10+2.5-0.5=12 - not with `second` (visual x=0).
    const runForGrapheme0 = runs.find(
      (r) => r.contentRange[0] === 0 && r.contentRange[1] === 1,
    )!;
    expect(runForGrapheme0.x).toBeCloseTo(12, 5);
    const runForGrapheme1 = runs.find(
      (r) => r.contentRange[0] === 1 && r.contentRange[1] === 2,
    )!;
    expect(runForGrapheme1.x).toBeCloseTo(2, 5);
  });

  it("throws when base cluster count and grapheme count differ", () => {
    const baseClusters = buildClusters([{ char: "A", advance: 10 }]);
    const graphemes: MonoRubyGraphemeInput[] = [
      { contentRange: [0, 1], run: singleClusterRun(4) },
      { contentRange: [1, 2], run: singleClusterRun(4) },
    ];

    expect(() => placeMonoRuby(baseClusters, graphemes)).toThrow(
      /one base cluster per ruby grapheme/,
    );
  });
});

describe("placeGroupRuby", () => {
  it("distributes a narrower-than-base run across its own clusters with non-negative space-around", () => {
    // Two ruby clusters, 5 wide each (10 total), over a 20-wide base.
    const run: ResolvedShapeRun = {
      glyphs: [
        glyph({ x: 0, xAdvance: 5, clusterUtf16: 0, clusterEndUtf16: 1 }),
        glyph({ x: 5, xAdvance: 5, clusterUtf16: 1, clusterEndUtf16: 2 }),
      ],
      width: 10,
    };

    const runs = placeGroupRuby([0, 20], run, 2);

    expect(runs).toHaveLength(2);
    // gap = (20 - 10) / 2 = 5 (non-negative); cursor starts at 0 + gap/2 = 2.5.
    expect(runs.map((r) => r.x)).toEqual([2.5, 12.5]);
    expect(runs.map((r) => r.contentRange)).toEqual([
      [0, 1],
      [1, 2],
    ]);
    // Symmetric margins on both sides of the base range, never negative.
    const [first, last] = runs;
    expect(first!.x).toBeGreaterThanOrEqual(0);
    expect(first!.x - 0).toBeCloseTo(20 - (last!.x + last!.width), 5);
  });

  it("keeps a wider-than-base run as one contextually shaped block, centered with symmetric overhang", () => {
    // Three ruby clusters, 6 wide each (18 total), over a 12-wide base.
    const run: ResolvedShapeRun = {
      glyphs: [
        glyph({ x: 0, xAdvance: 6, clusterUtf16: 0, clusterEndUtf16: 1 }),
        glyph({ x: 6, xAdvance: 6, clusterUtf16: 1, clusterEndUtf16: 2 }),
        glyph({ x: 12, xAdvance: 6, clusterUtf16: 2, clusterEndUtf16: 3 }),
      ],
      width: 18,
    };

    const runs = placeGroupRuby([100, 112], run, 3);

    expect(runs).toHaveLength(1);
    // Centered as a single block: x = 100 + (12 - 18) / 2 = 97; overhangs by
    // 3 on each side, and shaping (all 3 glyphs) stays in one intact run.
    expect(runs[0]).toMatchObject({ contentRange: [0, 3], width: 18, x: 97 });
    expect(runs[0]!.glyphs).toHaveLength(3);
    // Symmetric overhang: equal margin past both edges of the base range.
    const overhangLeft = 100 - runs[0]!.x;
    const overhangRight = runs[0]!.x + runs[0]!.width - 112;
    expect(overhangLeft).toBeCloseTo(overhangRight, 5);
  });

  it("centers a run exactly as wide as the base as a single block (no distribution)", () => {
    const run = singleClusterRun(10);

    const runs = placeGroupRuby([0, 10], run, 1);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ contentRange: [0, 1], width: 10, x: 0 });
  });

  it("centers a narrower run with only a single cluster (nothing to distribute)", () => {
    const run = singleClusterRun(4);

    const runs = placeGroupRuby([0, 10], run, 1);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ contentRange: [0, 1], width: 4, x: 3 });
  });

  it("handles an empty ruby run by centering a zero-width block", () => {
    const run: ResolvedShapeRun = { glyphs: [], width: 0 };
    const runs = placeGroupRuby([0, 10], run, 0);
    expect(runs).toEqual([{ contentRange: [0, 0], glyphs: [], width: 0, x: 5 }]);
  });

  it("never produces a negative inter-cluster gap regardless of width ratio", () => {
    const narrow: ResolvedShapeRun = {
      glyphs: [
        glyph({ x: 0, xAdvance: 3, clusterUtf16: 0, clusterEndUtf16: 1 }),
        glyph({ x: 3, xAdvance: 3, clusterUtf16: 1, clusterEndUtf16: 2 }),
        glyph({ x: 6, xAdvance: 3, clusterUtf16: 2, clusterEndUtf16: 3 }),
      ],
      width: 9,
    };

    const runs = placeGroupRuby([0, 30], narrow, 3);

    for (let i = 1; i < runs.length; i++) {
      const gap = runs[i]!.x - (runs[i - 1]!.x + runs[i - 1]!.width);
      expect(gap).toBeGreaterThanOrEqual(0);
    }
  });
});

