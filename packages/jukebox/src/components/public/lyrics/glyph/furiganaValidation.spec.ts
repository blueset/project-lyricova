import { describe, expect, it } from "vitest";
import { validateFuriganaAnnotations } from "./furiganaValidation";
import type { FuriganaAnnotationInput } from "./types";

describe("validateFuriganaAnnotations", () => {
  it("accepts clean, non-overlapping annotations sorted by position", () => {
    const base = "ABCD";
    const annotations: FuriganaAnnotationInput[] = [
      { content: "cd", leftIndex: 2, rightIndex: 4 },
      { content: "ab", leftIndex: 0, rightIndex: 2 },
    ];

    const { valid, issues } = validateFuriganaAnnotations(base, annotations);

    expect(issues).toEqual([]);
    expect(valid).toHaveLength(2);
    expect(valid[0]).toMatchObject({
      content: "ab",
      utf16Range: [0, 2],
      graphemeRange: [0, 2],
      sourceIndex: 1,
    });
    expect(valid[1]).toMatchObject({
      content: "cd",
      utf16Range: [2, 4],
      graphemeRange: [2, 4],
      sourceIndex: 0,
    });
  });

  it("rejects out-of-range indices", () => {
    const base = "AB";
    const annotations: FuriganaAnnotationInput[] = [
      { content: "x", leftIndex: -1, rightIndex: 1 },
      { content: "y", leftIndex: 0, rightIndex: 5 },
    ];

    const { valid, issues } = validateFuriganaAnnotations(base, annotations);

    expect(valid).toEqual([]);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({ kind: "outOfRange", index: -1 });
    expect(issues[1]).toMatchObject({ kind: "outOfRange", index: 5 });
  });

  it("rejects annotations with empty content as emptyContent", () => {
    const base = "AB";
    const empty: FuriganaAnnotationInput = {
      content: "",
      leftIndex: 0,
      rightIndex: 2,
    };
    const clean: FuriganaAnnotationInput = {
      content: "xy",
      leftIndex: 0,
      rightIndex: 2,
    };

    const { valid, issues } = validateFuriganaAnnotations(base, [empty]);
    expect(valid).toEqual([]);
    expect(issues).toEqual([
      {
        kind: "emptyContent",
        annotation: empty,
        reason: expect.stringContaining("must not be empty"),
      },
    ]);

    // Doesn't interfere with an otherwise-valid annotation.
    const second = validateFuriganaAnnotations(base, [clean]);
    expect(second.issues).toEqual([]);
    expect(second.valid).toHaveLength(1);
  });

  it("rejects non-integer and reversed/empty ranges as invalidRange", () => {
    const base = "ABCD";
    const annotations: FuriganaAnnotationInput[] = [
      { content: "x", leftIndex: 1.5, rightIndex: 2 },
      { content: "y", leftIndex: 2, rightIndex: 1 },
      { content: "z", leftIndex: 2, rightIndex: 2 },
    ];

    const { valid, issues } = validateFuriganaAnnotations(base, annotations);

    expect(valid).toEqual([]);
    expect(issues).toHaveLength(3);
    expect(issues.map((issue) => issue.kind)).toEqual([
      "invalidRange",
      "invalidRange",
      "invalidRange",
    ]);
  });

  it("rejects indices that split an astral surrogate pair (mid-surrogate)", () => {
    // "A" (1 unit) + "\u{1F600}" (surrogate pair, 2 units) + "B" (1 unit)
    const base = "A\u{1F600}B";

    const splitLeft: FuriganaAnnotationInput = {
      content: "x",
      leftIndex: 2,
      rightIndex: 3,
    };
    const splitRight: FuriganaAnnotationInput = {
      content: "y",
      leftIndex: 0,
      rightIndex: 2,
    };
    const clean: FuriganaAnnotationInput = {
      content: "z",
      leftIndex: 0,
      rightIndex: 3,
    };

    const { valid, issues } = validateFuriganaAnnotations(base, [
      splitLeft,
      splitRight,
      clean,
    ]);

    expect(issues).toEqual([
      { kind: "midSurrogate", annotation: splitLeft, side: "left" },
      { kind: "midSurrogate", annotation: splitRight, side: "right" },
    ]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      content: "z",
      utf16Range: [0, 3],
      graphemeRange: [0, 2],
    });
  });

  it("rejects indices that land inside a combining-mark grapheme cluster", () => {
    // "e" + U+0301 (combining acute) forms one grapheme "é"; "f" follows.
    const base = "e\u0301f";

    const midGrapheme: FuriganaAnnotationInput = {
      content: "x",
      leftIndex: 1,
      rightIndex: 3,
    };
    const clean: FuriganaAnnotationInput = {
      content: "y",
      leftIndex: 0,
      rightIndex: 2,
    };

    const { valid, issues } = validateFuriganaAnnotations(base, [
      midGrapheme,
      clean,
    ]);

    expect(issues).toEqual([
      { kind: "nonGraphemeBoundary", annotation: midGrapheme, side: "left" },
    ]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({ content: "y", utf16Range: [0, 2] });
  });

  it("rejects overlapping annotations, keeping the earlier-starting one", () => {
    const base = "ABCDEF";
    const first: FuriganaAnnotationInput = {
      content: "one",
      leftIndex: 0,
      rightIndex: 3,
    };
    const overlapping: FuriganaAnnotationInput = {
      content: "two",
      leftIndex: 2,
      rightIndex: 5,
    };
    const disjoint: FuriganaAnnotationInput = {
      content: "three",
      leftIndex: 5,
      rightIndex: 6,
    };

    const { valid, issues } = validateFuriganaAnnotations(base, [
      first,
      overlapping,
      disjoint,
    ]);

    expect(valid.map((a) => a.content)).toEqual(["one", "three"]);
    expect(issues).toEqual([
      { kind: "overlapping", annotation: overlapping, other: first },
    ]);
  });

  it("allows adjacent (non-overlapping, touching) annotations", () => {
    const base = "ABCD";
    const annotations: FuriganaAnnotationInput[] = [
      { content: "ab", leftIndex: 0, rightIndex: 2 },
      { content: "cd", leftIndex: 2, rightIndex: 4 },
    ];

    const { valid, issues } = validateFuriganaAnnotations(base, annotations);

    expect(issues).toEqual([]);
    expect(valid).toHaveLength(2);
  });
});
