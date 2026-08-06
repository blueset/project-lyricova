import { describe, expect, it } from "vitest";
import {
  assertFiniteNonNegative,
  assertFinitePositiveSize,
} from "./layoutOptionsValidation";
import { RubyLayoutOptionsError } from "./types";

describe("assertFinitePositiveSize", () => {
  it("accepts finite positive numbers", () => {
    expect(() => assertFinitePositiveSize(1, "fontSize")).not.toThrow();
    expect(() => assertFinitePositiveSize(0.001, "fontSize")).not.toThrow();
  });

  it.each([0, -1, NaN, Infinity, -Infinity])("rejects %s", (value) => {
    expect(() => assertFinitePositiveSize(value, "fontSize")).toThrow(
      RubyLayoutOptionsError,
    );
  });

  it("includes the field name and value in the error message", () => {
    expect(() => assertFinitePositiveSize(NaN, "rubyFontSize")).toThrow(
      /rubyFontSize must be a finite, positive number \(got NaN\)/,
    );
  });
});

describe("assertFiniteNonNegative", () => {
  it("accepts zero and finite positive numbers", () => {
    expect(() => assertFiniteNonNegative(0, "rubyGap")).not.toThrow();
    expect(() => assertFiniteNonNegative(5, "rubyGap")).not.toThrow();
  });

  it.each([-1, -0.001, NaN, Infinity, -Infinity])("rejects %s", (value) => {
    expect(() => assertFiniteNonNegative(value, "rubyGap")).toThrow(
      RubyLayoutOptionsError,
    );
  });
});
