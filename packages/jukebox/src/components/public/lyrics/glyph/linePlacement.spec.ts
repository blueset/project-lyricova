import { describe, expect, it } from "vitest";
import { buildClusters, buildLine, makeSourceRange } from "./testFixtures";
import {
  clustersInRange,
  computeAdjustedLineMetrics,
  computeBaseGroupBounds,
  findLinesForRange,
} from "./linePlacement";

describe("findLinesForRange", () => {
  it("finds the single line overlapping a range", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });

    expect(findLinesForRange([lineA, lineB], 0, 1)).toEqual([0]);
    expect(findLinesForRange([lineA, lineB], 1, 2)).toEqual([1]);
  });

  it("returns every line a range straddles", () => {
    // Simulates an inconsistent/buggy layout where a supposedly atomic base
    // range [0, 2) is reported as spanning two lines.
    const lineA = buildLine(makeCustomClusters(0, 1, 10), { top: 0 });
    const lineB = buildLine(makeCustomClusters(1, 2, 10), { top: 10 });

    expect(findLinesForRange([lineA, lineB], 0, 2)).toEqual([0, 1]);
  });

  it("returns an empty array when nothing overlaps", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    expect(findLinesForRange([lineA], 5, 6)).toEqual([]);
  });

  function makeCustomClusters(
    utf16Start: number,
    utf16End: number,
    advance: number,
  ) {
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
        leadingSpace: 0,
        trailingSpace: 0,
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
  it("leaves metrics untouched when the document reserves no ruby row", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });

    expect(computeAdjustedLineMetrics([lineA, lineB], 0)).toEqual([
      { lineIndex: 0, top: 0, baseline: 8, height: 10 },
      { lineIndex: 1, top: 10, baseline: 18, height: 10 },
    ]);
  });

  it("reserves the row uniformly on every line, annotated or not", () => {
    const lineA = buildLine(buildClusters([{ char: "A", advance: 10 }], 0), {
      top: 0,
    });
    const lineB = buildLine(buildClusters([{ char: "B", advance: 10 }], 1), {
      top: 10,
    });
    const lineC = buildLine(buildClusters([{ char: "C", advance: 10 }], 2), {
      top: 20,
    });

    const result = computeAdjustedLineMetrics([lineA, lineB, lineC], 5);

    // Every line grows by the same extent and is shifted by the extent of
    // every line before it, so line advance is constant (15) throughout - the
    // whole point of reserving the row at document level rather than per line.
    expect(result[0]).toEqual({
      lineIndex: 0,
      top: 0,
      baseline: 13,
      height: 15,
    });
    expect(result[1]).toEqual({
      lineIndex: 1,
      top: 15,
      baseline: 28,
      height: 15,
    });
    expect(result[2]).toEqual({
      lineIndex: 2,
      top: 30,
      baseline: 43,
      height: 15,
    });
    expect(result[1]!.baseline - result[0]!.baseline).toBe(
      result[2]!.baseline - result[1]!.baseline,
    );
  });

  it("clamps a negative reservation to zero rather than shrinking lines", () => {
    const line = buildLine(buildClusters([{ char: "A", advance: 10 }], 0));
    expect(computeAdjustedLineMetrics([line], -5)).toEqual([
      { lineIndex: 0, top: 0, baseline: 8, height: 10 },
    ]);
  });
});

describe("computeBaseGroupBounds with base expansion", () => {
  it("includes the JLReq edge gaps injected around an expanded base range", () => {
    // "B" carries 3 units of leading and trailing expansion, so the ruby box
    // is the expanded [10, 28) - not the shaped cluster's own [13, 25).
    const clusters = buildClusters([
      { char: "A", advance: 10 },
      { char: "B", advance: 12, leadingSpace: 3, trailingSpace: 3 },
      { char: "C", advance: 8 },
    ]);
    const line = buildLine(clusters);

    expect(clusters[1]!.x).toBe(13);
    expect(computeBaseGroupBounds(line, 1, 2)).toMatchObject({
      xStart: 10,
      xEnd: 28,
    });
  });
});
