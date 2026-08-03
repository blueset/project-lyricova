import { describe, expect, it } from "vitest";
import {
  GLYPH_WEIGHT,
  OPSZ_MAX,
  OPSZ_MIN,
  glyphVariations,
} from "./fontVariations";

/** Parses `opsz=<n>` out of an axis list. */
function opszOf(axes: readonly string[]): number {
  const hit = axes.find((axis) => axis.startsWith("opsz="));
  return Number(hit?.slice("opsz=".length));
}

describe("glyphVariations", () => {
  it("always pins the shared weight", () => {
    for (const size of [10, 22, 40, 56]) {
      expect(glyphVariations(size)).toContain(`wght=${GLYPH_WEIGHT}`);
    }
  });

  it("tracks the optical size to the size being rendered", () => {
    // The whole point: `opsz` follows the used font size, as CSS
    // `font-optical-sizing: auto` does. Leaving Mona Sans at its `0` default
    // rendered Latin looser and lighter than the font was designed for.
    expect(opszOf(glyphVariations(22))).toBe(22);
    expect(opszOf(glyphVariations(40))).toBe(40);
    expect(opszOf(glyphVariations(56))).toBe(56);
  });

  it("gives ruby a smaller optical size than its base", () => {
    // Ruby renders at roughly half the base size, so sharing the base's axes
    // would render it at an optical size meant for much larger text.
    expect(opszOf(glyphVariations(12))).toBeLessThan(
      opszOf(glyphVariations(48)),
    );
  });

  it("clamps to the axis range instead of emitting an invalid value", () => {
    expect(opszOf(glyphVariations(5000))).toBe(OPSZ_MAX);
    expect(opszOf(glyphVariations(-10))).toBe(OPSZ_MIN);
  });

  it("falls back to the axis minimum for unusable sizes", () => {
    for (const bad of [0, Number.NaN, Number.POSITIVE_INFINITY * 0]) {
      expect(opszOf(glyphVariations(bad))).toBe(OPSZ_MIN);
    }
  });

  it("returns a stable, frozen array for the same size", () => {
    // Painting calls this per cluster per frame, and the glyph-outline cache
    // keys on the joined list, so identity must not churn.
    const a = glyphVariations(40);
    const b = glyphVariations(40);
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(() => (a as string[]).push("wdth=75")).toThrow();
  });

  it("rounds sub-pixel sizes onto shared keys", () => {
    // A responsive font size can be fractional; without rounding every frame
    // could mint a new cache key.
    expect(glyphVariations(40.001)).toBe(glyphVariations(40.002));
  });
});
