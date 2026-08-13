import { describe, expect, it } from "vitest";
import { estimateJsonArrayLength } from "./estimateJsonArrayLength";

describe("estimateJsonArrayLength", () => {
  it("counts completed root items regardless of indentation", () => {
    expect(
      estimateJsonArrayLength(
        '[{"original":"one","aligned":"uno"},{"original":"two","aligned":"dos"}',
      ),
    ).toBe(2);
    expect(
      estimateJsonArrayLength(`
        [
          {
            "original": "one",
            "aligned": "uno"
          },
          {
            "original": "two",
            "aligned": "dos"
          }
      `),
    ).toBe(2);
  });

  it("ignores JSON punctuation inside strings and nested values", () => {
    expect(
      estimateJsonArrayLength(
        '[{"original":"[,]","aligned":"quote: \\"}, {\\"","metadata":[1,2]}',
      ),
    ).toBe(1);
  });

  it("does not count an incomplete root item", () => {
    expect(
      estimateJsonArrayLength(
        '[{"original":"one","aligned":"uno"},{"original":"two',
      ),
    ).toBe(1);
  });

  it("counts primitive root values when their delimiter arrives", () => {
    expect(estimateJsonArrayLength('[true, null, "done", 42]')).toBe(4);
  });
});
