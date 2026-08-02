import { describe, expect, it } from "vitest";
import { alignmentOffset, stackSegmentPositions } from "./glyphCanvasLayout";

describe("alignmentOffset", () => {
  it("hugs the left edge for start alignment", () => {
    expect(alignmentOffset("start", 100, 40)).toBe(0);
  });

  it("hugs the right edge for end alignment", () => {
    expect(alignmentOffset("end", 100, 40)).toBe(60);
  });

  it("centers within the available width", () => {
    expect(alignmentOffset("center", 100, 40)).toBe(30);
  });

  it("overflows symmetrically when the line is wider than available", () => {
    expect(alignmentOffset("center", 40, 100)).toBe(-30);
    // start never pushes left of 0.
    expect(alignmentOffset("start", 40, 100)).toBe(0);
  });
});

describe("stackSegmentPositions", () => {
  it("returns nothing for an empty stack", () => {
    expect(stackSegmentPositions([], 100, 10)).toEqual([]);
  });

  it("centers a single item", () => {
    const [pos] = stackSegmentPositions([{ height: 40 }], 100, 10);
    expect(pos!.top).toBe(30);
  });

  it("stacks multiple items with a constant gap, centered as a block", () => {
    // Two 20px items + one 10px gap = 50px block; centered in 100 => top 25.
    const positions = stackSegmentPositions(
      [{ height: 20 }, { height: 20 }],
      100,
      10,
    );
    expect(positions[0]!.top).toBe(25);
    expect(positions[1]!.top).toBe(25 + 20 + 10);
  });

  it("overflows symmetrically (negative top) when taller than the container", () => {
    const positions = stackSegmentPositions(
      [{ height: 80 }, { height: 80 }],
      100,
      20,
    );
    // total = 180, (100-180)/2 = -40.
    expect(positions[0]!.top).toBe(-40);
  });
});
