import { describe, expect, it } from "vitest";
import {
  clusterEntrance,
  clusterEntranceProgress,
  smoothstep,
} from "./clusterAnimation";

describe("smoothstep", () => {
  it("clamps and eases", () => {
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 6);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(2)).toBe(1);
  });
});

describe("clusterEntrance", () => {
  it("is fully faded/translated/scaled at progress 0", () => {
    const style = clusterEntrance(0);
    expect(style.opacity).toBeCloseTo(0.2, 6);
    expect(style.transform.scale).toBeCloseTo(0.94, 6);
    expect(style.transform.translate!.y).toBeGreaterThan(0);
    // LTR default enters from the left (negative x).
    expect(style.transform.translate!.x).toBeLessThan(0);
  });

  it("settles to the identity pose at progress 1", () => {
    const style = clusterEntrance(1);
    expect(style.opacity).toBeCloseTo(1, 6);
    expect(style.transform.scale).toBeCloseTo(1, 6);
    expect(style.transform.translate!.x).toBeCloseTo(0, 6);
    expect(style.transform.translate!.y).toBeCloseTo(0, 6);
  });

  it("is deterministic for a given progress", () => {
    expect(clusterEntrance(0.42)).toEqual(clusterEntrance(0.42));
  });

  it("enters from the right for RTL fill direction", () => {
    const rtl = clusterEntrance(0, "rtl");
    expect(rtl.transform.translate!.x).toBeGreaterThan(0);
    const ltr = clusterEntrance(0, "ltr");
    expect(ltr.transform.translate!.x).toBeLessThan(0);
    expect(rtl.transform.translate!.x).toBeCloseTo(-ltr.transform.translate!.x, 6);
  });

  it("honors configurable distances/opacity", () => {
    const style = clusterEntrance(0, "ltr", {
      translateY: 40,
      translateX: 0,
      minScale: 0.5,
      minOpacity: 0,
    });
    expect(style.opacity).toBe(0);
    expect(style.transform.translate!.y).toBeCloseTo(40, 6);
    expect(style.transform.translate!.x).toBeCloseTo(0, 6);
    expect(style.transform.scale).toBeCloseTo(0.5, 6);
  });
});

describe("clusterEntranceProgress", () => {
  it("ramps 0 -> 1 across the lead window before the front reaches the cluster", () => {
    const lead = 4;
    expect(
      clusterEntranceProgress({ revealed: 0, clusterStartUtf16: 10, lead }),
    ).toBe(0);
    // Halfway through the lead window (front at 8, cluster start 10, lead 4).
    expect(
      clusterEntranceProgress({ revealed: 8, clusterStartUtf16: 10, lead }),
    ).toBeCloseTo(0.5, 6);
    // Front has reached the cluster start -> fully entered.
    expect(
      clusterEntranceProgress({ revealed: 10, clusterStartUtf16: 10, lead }),
    ).toBe(1);
    expect(
      clusterEntranceProgress({ revealed: 20, clusterStartUtf16: 10, lead }),
    ).toBe(1);
  });

  it("degrades to a step when lead is non-positive", () => {
    expect(
      clusterEntranceProgress({ revealed: 9, clusterStartUtf16: 10, lead: 0 }),
    ).toBe(0);
    expect(
      clusterEntranceProgress({ revealed: 10, clusterStartUtf16: 10, lead: 0 }),
    ).toBe(1);
  });
});
