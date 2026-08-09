import { describe, expect, it } from "vitest";
import {
  buildLyricsLayoutProjection,
  resolveLyricsViewportPadding,
} from "./lyricsLayoutProjection";

describe("resolveLyricsViewportPadding", () => {
  it("resolves layout padding from the measured viewport", () => {
    expect(
      resolveLyricsViewportPadding(
        ({ height }) => ({ bottom: height * 0.25 }),
        { width: 800, height: 400 },
      ),
    ).toEqual({ bottom: 100 });
  });
});

describe("buildLyricsLayoutProjection", () => {
  it("packs sparse active rows while preserving their natural heights", () => {
    const projection = buildLyricsLayoutProjection({
      rowAccumulateHeight: [0, 40, 80, 120, 160, 200],
      rowCount: 5,
      activeRows: [0, 4],
      rangeEnd: 5,
      viewportHeight: 100,
      compact: true,
    });

    expect(projection.rows).toEqual([0, 4]);
    expect(projection.compactedRows).toEqual([1, 2, 3]);
    expect(projection.rowAccumulateHeight).toEqual([0, 40, 80]);
    expect(projection.rowTopBySource).toEqual([0, 40, 40, 40, 40]);
    expect(projection.activeRows).toEqual([0, 4]);
    expect(projection.activeStartSlot).toBe(0);
    expect(projection.activeEndSlot).toBe(2);
    expect(projection.newestActiveSlot).toBe(1);
    expect(projection.isRangeOverflowing).toBe(true);
    expect(projection.isCompacted).toBe(true);
    expect(projection.toNaturalCoordinate(20)).toBe(20);
    expect(projection.toNaturalCoordinate(40)).toBe(160);
    expect(projection.toNaturalCoordinate(60)).toBe(180);
  });

  it("keeps rows outside the active envelope in the projected document", () => {
    const projection = buildLyricsLayoutProjection({
      rowAccumulateHeight: [0, 20, 40, 60, 80, 100, 120],
      rowCount: 6,
      activeRows: [1, 4],
      rangeEnd: 5,
      viewportHeight: 50,
      compact: true,
    });

    expect(projection.rows).toEqual([0, 1, 4, 5]);
    expect(projection.rowAccumulateHeight).toEqual([0, 20, 40, 60, 80]);
    expect(projection.activeStartSlot).toBe(1);
    expect(projection.activeEndSlot).toBe(3);
  });

  it("uses document order for layout and activation order for overflow", () => {
    const projection = buildLyricsLayoutProjection({
      rowAccumulateHeight: [0, 50, 100, 150, 200, 250],
      rowCount: 5,
      activeRows: [4, 0],
      rangeEnd: 5,
      viewportHeight: 100,
      compact: true,
    });

    expect(projection.activeRows).toEqual([0, 4]);
    expect(projection.rows).toEqual([0, 4]);
    expect(projection.newestActiveSlot).toBe(0);
  });

  it("ignores duplicate and invalid active indexes", () => {
    const projection = buildLyricsLayoutProjection({
      rowAccumulateHeight: [0, 30, 60, 90],
      rowCount: 3,
      activeRows: [0, 99, 2, 2, -1, 1.5],
      rangeEnd: 3,
      viewportHeight: 50,
      compact: true,
    });

    expect(projection.activeRows).toEqual([0, 2]);
    expect(projection.rows).toEqual([0, 2]);
    expect(projection.newestActiveSlot).toBe(1);
  });

  it("keeps natural geometry when compaction is disabled or unnecessary", () => {
    const natural = [0, 25, 50, 75];
    const disabled = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 3,
      activeRows: [0, 2],
      rangeEnd: 3,
      viewportHeight: 25,
      compact: false,
    });
    const consecutive = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 3,
      activeRows: [0, 1],
      rangeEnd: 2,
      viewportHeight: 25,
      compact: true,
    });

    expect(disabled.rows).toEqual([0, 1, 2]);
    expect(disabled.isCompacted).toBe(false);
    expect(consecutive.rows).toEqual([0, 1, 2]);
    expect(consecutive.isCompacted).toBe(false);
  });

  it("keeps the natural active envelope when it fits in the viewport", () => {
    const projection = buildLyricsLayoutProjection({
      rowAccumulateHeight: [0, 40, 80, 120, 160, 200, 240],
      rowCount: 6,
      activeRows: [1, 4],
      rangeEnd: 5,
      viewportHeight: 160,
      compact: true,
    });

    expect(projection.rows).toEqual([0, 1, 2, 3, 4, 5]);
    expect(projection.compactedRows).toEqual([]);
    expect(projection.isRangeOverflowing).toBe(false);
    expect(projection.isCompacted).toBe(false);
  });

  it("keeps passed overlap rows compacted between adjacent short lines", () => {
    const natural = [0, 50, 100, 150, 200, 250];
    const beforeGap = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 5,
      activeRows: [0, 2],
      rangeEnd: 3,
      viewportHeight: 100,
      compact: true,
    });
    const duringGap = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 5,
      activeRows: [0],
      rangeEnd: 3,
      viewportHeight: 100,
      compact: true,
    });
    const afterGap = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 5,
      activeRows: [0, 3],
      rangeEnd: 4,
      viewportHeight: 100,
      compact: true,
    });

    expect(beforeGap.rows).toEqual([0, 2, 3, 4]);
    expect(duringGap.rows).toEqual([0, 3, 4]);
    expect(duringGap.compactedRows).toEqual([1, 2]);
    expect(afterGap.rows).toEqual([0, 3, 4]);
  });

  it("uses layout-specific top and bottom guards around the preferred range", () => {
    const natural = [0, 40, 80, 120];
    const unguarded = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 3,
      activeRows: [0, 2],
      rangeEnd: 3,
      viewportHeight: 200,
      align: "start",
      alignAnchor: 0.1,
      compact: true,
    });
    const bottomGuarded = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 3,
      activeRows: [0, 2],
      rangeEnd: 3,
      viewportHeight: 200,
      viewportPadding: { bottom: 62 },
      align: "start",
      alignAnchor: 0.1,
      compact: true,
    });
    const topGuarded = buildLyricsLayoutProjection({
      rowAccumulateHeight: natural,
      rowCount: 3,
      activeRows: [0, 2],
      rangeEnd: 3,
      viewportHeight: 200,
      viewportPadding: { top: 22 },
      align: "start",
      alignAnchor: 0.1,
      compact: true,
    });

    expect(unguarded.isCompacted).toBe(false);
    expect(bottomGuarded.isCompacted).toBe(true);
    expect(topGuarded.isCompacted).toBe(true);
  });
});
