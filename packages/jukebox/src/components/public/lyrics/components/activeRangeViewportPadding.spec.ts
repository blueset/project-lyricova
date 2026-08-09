import { describe, expect, it } from "vitest";
import {
  bottomFutureLineViewportPadding,
  centeredFutureLineViewportPadding,
} from "./activeRangeViewportPadding";

describe("active range viewport padding", () => {
  it("reserves row padding, one main line, and the bottom mask guard", () => {
    const padding = bottomFutureLineViewportPadding(40, 500);

    expect(padding.top).toBe(0);
    expect(padding.bottom).toBeCloseTo(16 + 40 + 500 * (0.7 * 0.2));
  });

  it("uses symmetric guards for a center-aligned layout", () => {
    const padding = centeredFutureLineViewportPadding(24, 500);
    const expected = 16 + 24 + 500 * (0.7 * 0.2);

    expect(padding.top).toBeCloseTo(expected);
    expect(padding.bottom).toBeCloseTo(expected);
  });

  it("does not reserve space before the viewport has been measured", () => {
    expect(bottomFutureLineViewportPadding(40, 0)).toEqual({
      top: 0,
      bottom: 0,
    });
    expect(centeredFutureLineViewportPadding(24, 0)).toEqual({
      top: 0,
      bottom: 0,
    });
  });
});
