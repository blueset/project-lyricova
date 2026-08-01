import { describe, expect, it } from "vitest";
import {
  buildClusters,
  buildLine,
  makeSourceRange,
} from "./testFixtures";
import {
  clustersInRange,
  computeAdjustedLineMetrics,
  computeBaseGroupBounds,
  findLinesForRange,
} from "./linePlacement";

describe("findLinesForRange", () => {
  it("finds the single line overlapping a range", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    const lineB = buildLine(
      buildClusters([{ char: "B", advance: 10 }], 1),
      { top: 10 },
    );

    expect(findLinesForRange([lineA, lineB], 0, 1)).toEqual([0]);
    expect(findLinesForRange([lineA, lineB], 1, 2)).toEqual([1]);
  });

  it("returns every line a range straddles", () => {
    // Simulates an inconsistent/buggy layout where a supposedly atomic base
    // range [0, 2) is reported as spanning two lines.
    const lineA = buildLine(
      makeCustomClusters(0, 1, 10),
      { top: 0 },
    );
    const lineB = buildLine(makeCustomClusters(1, 2, 10), { top: 10 });

    expect(findLinesForRange([lineA, lineB], 0, 2)).toEqual([0, 1]);
  });

  it("returns an empty array when nothing overlaps", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    expect(findLinesForRange([lineA], 5, 6)).toEqual([]);
  });

  function makeCustomClusters(utf16Start: number, utf16End: number, advance: number) {
    return [
      {
        source: makeSourceRange(utf16Start, utf16End),
        fontId: 0,
        direction: "ltr" as const,
        script: "Latn",
        level: 0,
        glyphs: [],
        x: 0,
        advance,
        bounds: { xMin: 0, xMax: advance, yMin: 0, yMax: 0 },
        isWhitespace: false,
      },
    ];
  }
});

describe("clustersInRange / computeBaseGroupBounds", () => {
  it("selects only clusters fully within the requested range", () => {
    const clusters = buildClusters([
      { char: "A", advance: 10 },
      { char: "B", advance: 12 },
      { char: "C", advance: 8 },
    ]);
    const line = buildLine(clusters);

    const inRange = clustersInRange(line, 1, 3);
    expect(inRange.map((c) => c.source.utf16Start)).toEqual([1, 2]);

    const bounds = computeBaseGroupBounds(line, 1, 3);
    expect(bounds).toEqual({
      xStart: 10,
      xEnd: 30,
      clusters: inRange,
    });
  });

  it("returns null when no cluster falls within the range", () => {
    const clusters = buildClusters([{ char: "A", advance: 10 }]);
    const line = buildLine(clusters);
    expect(computeBaseGroupBounds(line, 5, 6)).toBeNull();
  });
});

describe("computeAdjustedLineMetrics", () => {
  it("leaves metrics untouched when no line has ruby", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    const lineB = buildLine(
      buildClusters([{ char: "B", advance: 10 }], 1),
      { top: 10 },
    );

    const result = computeAdjustedLineMetrics([lineA, lineB], new Map());

    expect(result).toEqual([
      { lineIndex: 0, top: 0, baseline: 8, height: 10 },
      { lineIndex: 1, top: 10, baseline: 18, height: 10 },
    ]);
  });

  it("grows a line's own box for its ruby row without moving its own top", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));

    const [result] = computeAdjustedLineMetrics([line], new Map([[0, 5]]));

    expect(result).toEqual({
      lineIndex: 0,
      top: 0, // unshifted: nothing precedes it
      baseline: 0 + 5 + 8, // extent + original ascent offset
      height: 10 + 5, // original height + extent
    });
  });

  it("pushes every following line down by a preceding line's ruby extent", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0), {
      top: 0,
    });
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });
    const lineC = buildLine(buildClusters([{ char: "C", advance: 10 }], 2), {
      top: 20,
    });

    const result = computeAdjustedLineMetrics(
      [lineA, lineB, lineC],
      new Map([[0, 5]]),
    );

    expect(result[0]).toEqual({ lineIndex: 0, top: 0, baseline: 13, height: 15 });
    // lineB's own top isn't touched by its own (absent) ruby, but is pushed
    // down by lineA's extent (5): original top 10 + 5 = 15.
    expect(result[1]).toEqual({ lineIndex: 1, top: 15, baseline: 23, height: 10 });
    // lineC keeps being pushed by the same cumulative growth (still just 5,
    // since lineB contributed no extent of its own).
    expect(result[2]).toEqual({ lineIndex: 2, top: 25, baseline: 33, height: 10 });
  });

  it("accumulates growth across multiple ruby lines", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0), {
      top: 0,
    });
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });

    const result = computeAdjustedLineMetrics(
      [lineA, lineB],
      new Map([
        [0, 4],
        [1, 6],
      ]),
    );

    expect(result[0]).toEqual({ lineIndex: 0, top: 0, baseline: 12, height: 14 });
    // lineB is pushed down by lineA's extent (4), then grows its own box by 6.
    expect(result[1]).toEqual({ lineIndex: 1, top: 14, baseline: 28, height: 16 });
  });
});
