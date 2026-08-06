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
  it("is eligible for a single annotated grapheme that shaped to one cluster", () => {
    expect(isMonoEligible(1, 1)).toBe(true);
  });

  it("is not eligible for a multi-grapheme base, even when ruby counts would match", () => {
    // Ruby type comes from the input data: upstream splits mono ruby into one
    // annotation per grapheme, so anything wider is deliberately group ruby.
    expect(isMonoEligible(2, 2)).toBe(false);
  });

  it("is not eligible when the single grapheme shaped to more than one cluster", () => {
    expect(isMonoEligible(1, 2)).toBe(false);
  });

  it("is not eligible for an empty base", () => {
    expect(isMonoEligible(0, 0)).toBe(false);
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
      leadingSpace: 0,
      trailingSpace: 0,
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
      leadingSpace: 0,
      trailingSpace: 0,
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
  const opts = (rubyFontSize = 6, spaceable = true) => ({
    rubyFontSize,
    spaceable,
  });

  it("distributes a narrower-than-base run 2:1:1 (nakatsuki) across its own clusters", () => {
    // Two ruby clusters, 5 wide each (10 total), over a 20-wide base.
    const run: ResolvedShapeRun = {
      glyphs: [
        glyph({ x: 0, xAdvance: 5, clusterUtf16: 0, clusterEndUtf16: 1 }),
        glyph({ x: 5, xAdvance: 5, clusterUtf16: 1, clusterEndUtf16: 2 }),
      ],
      width: 10,
    };

    const runs = placeGroupRuby([0, 20], run, "ab", opts());

    expect(runs).toHaveLength(2);
    // slack 10, n = 2 -> inter-cluster gap 5, edge gaps 2.5 (the 2:1:1 ratio).
    expect(runs.map((r) => r.x)).toEqual([2.5, 12.5]);
    expect(runs.map((r) => r.contentRange)).toEqual([
      [0, 1],
      [1, 2],
    ]);
    const [first, last] = runs;
    expect(first!.x - 0).toBeCloseTo(20 - (last!.x + last!.width), 5);
    // Edge gap is exactly half the inter-cluster gap.
    const interGap = last!.x - (first!.x + first!.width);
    expect(first!.x - 0).toBeCloseTo(interGap / 2, 5);
  });

  it("clamps each edge gap to one ruby em and redistributes the remainder inward", () => {
    // 4 kana over a much wider base (the `<けつまつ,9,20>` shape): without the
    // clamp the ruby would drift a long way from the characters it annotates.
    const run: ResolvedShapeRun = {
      glyphs: [0, 1, 2, 3].map((i) =>
        glyph({
          x: i * 5,
          xAdvance: 5,
          clusterUtf16: i,
          clusterEndUtf16: i + 1,
        }),
      ),
      width: 20,
    };

    const runs = placeGroupRuby([0, 100], run, "けつまつ", opts(6));

    // slack 80, n = 4 -> nominal edge gap 10, clamped to 1.0 x 6 = 6.
    expect(runs[0]!.x).toBeCloseTo(6, 5);
    expect(100 - (runs[3]!.x + runs[3]!.width)).toBeCloseTo(6, 5);
    // The clamped remainder is absorbed by the 3 inter-cluster gaps.
    const interGap = runs[1]!.x - (runs[0]!.x + runs[0]!.width);
    expect(interGap).toBeCloseTo((80 - 12) / 3, 5);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i]!.x - (runs[i - 1]!.x + runs[i - 1]!.width)).toBeCloseTo(
        interGap,
        5,
      );
    }
  });

  it("centers a single cluster even when that beats the edge clamp", () => {
    // n === 1 has no inter-cluster gap to absorb a clamped remainder, so
    // centring wins over the edge clamp.
    const run = singleClusterRun(4);

    const runs = placeGroupRuby([0, 100], run, "き", opts(6));

    expect(runs).toHaveLength(1);
    expect(runs[0]!.x).toBeCloseTo(48, 5);
  });

  it("keeps a wider-than-base run as one contextually shaped block, centered with symmetric overhang", () => {
    const run: ResolvedShapeRun = {
      glyphs: [
        glyph({ x: 0, xAdvance: 6, clusterUtf16: 0, clusterEndUtf16: 1 }),
        glyph({ x: 6, xAdvance: 6, clusterUtf16: 1, clusterEndUtf16: 2 }),
        glyph({ x: 12, xAdvance: 6, clusterUtf16: 2, clusterEndUtf16: 3 }),
      ],
      width: 18,
    };

    const runs = placeGroupRuby([100, 112], run, "abc", opts());

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ contentRange: [0, 3], width: 18, x: 97 });
    expect(runs[0]!.glyphs).toHaveLength(3);
    const overhangLeft = 100 - runs[0]!.x;
    const overhangRight = runs[0]!.x + runs[0]!.width - 112;
    expect(overhangLeft).toBeCloseTo(overhangRight, 5);
  });

  it("centers a run exactly as wide as the base as a single block (no distribution)", () => {
    const runs = placeGroupRuby([0, 10], singleClusterRun(10), "a", opts());

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ contentRange: [0, 1], width: 10, x: 0 });
  });

  it("handles an empty ruby run by centering a zero-width block", () => {
    const run: ResolvedShapeRun = { glyphs: [], width: 0 };
    const runs = placeGroupRuby([0, 10], run, "", opts());
    expect(runs).toEqual([
      { contentRange: [0, 0], glyphs: [], width: 0, x: 5 },
    ]);
  });

  it("never letterspaces a proportional ruby run without inter-word space", () => {
    // Latin romanization ruby (`Khot'`, `dung`, `xing`): JLReq sets
    // proportional runs solid, so a narrower-than-base run is centred as one
    // block instead of having its letters pulled apart.
    const run: ResolvedShapeRun = {
      glyphs: [0, 1, 2].map((i) =>
        glyph({
          x: i * 4,
          xAdvance: 4,
          clusterUtf16: i,
          clusterEndUtf16: i + 1,
        }),
      ),
      width: 12,
    };

    const runs = placeGroupRuby([0, 40], run, "abc", opts(6, false));

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ width: 12, x: 14 });
  });

  it("stretches a proportional ruby run's inter-word space instead of its letters", () => {
    // "a b": only the interior whitespace cluster absorbs the slack.
    const run: ResolvedShapeRun = {
      glyphs: [
        glyph({ x: 0, xAdvance: 4, clusterUtf16: 0, clusterEndUtf16: 1 }),
        glyph({ x: 4, xAdvance: 2, clusterUtf16: 1, clusterEndUtf16: 2 }),
        glyph({ x: 6, xAdvance: 4, clusterUtf16: 2, clusterEndUtf16: 3 }),
      ],
      width: 10,
    };

    const runs = placeGroupRuby([0, 30], run, "a b", opts(6, false));

    expect(runs).toHaveLength(3);
    // Set flush at the line-relative base origin, with the whole 20 units of
    // slack going into the gap that follows the space cluster.
    expect(runs.map((r) => r.x)).toEqual([0, 4, 26]);
  });

  it("never produces a negative inter-cluster gap regardless of width ratio", () => {
    const narrow: ResolvedShapeRun = {
      glyphs: [0, 1, 2].map((i) =>
        glyph({
          x: i * 3,
          xAdvance: 3,
          clusterUtf16: i,
          clusterEndUtf16: i + 1,
        }),
      ),
      width: 9,
    };

    const runs = placeGroupRuby([0, 30], narrow, "abc", opts());

    for (let i = 1; i < runs.length; i++) {
      const gap = runs[i]!.x - (runs[i - 1]!.x + runs[i - 1]!.width);
      expect(gap).toBeGreaterThanOrEqual(0);
    }
  });
});
