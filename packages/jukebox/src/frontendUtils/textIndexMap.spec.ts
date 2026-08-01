import { describe, expect, it } from "vitest";
import { TextIndexMap } from "./textIndexMap";

describe("TextIndexMap", () => {
  it("maps ASCII text across UTF-16, code-point, and grapheme boundaries", () => {
    const map = new TextIndexMap("hello");

    expect(map.utf16Length).toBe(5);
    expect(map.codePointLength).toBe(5);
    expect(map.graphemeLength).toBe(5);
    expect(map.boundaryFromUtf16(3)).toEqual({
      utf16: 3,
      codePoint: 3,
      grapheme: 3,
    });
    expect(map.boundaryFromCodePoint(4)).toEqual({
      utf16: 4,
      codePoint: 4,
      grapheme: 4,
    });
    expect(map.sourceRangeFromGrapheme(1, 4)).toEqual({
      text: "ell",
      utf16: [1, 4],
      codePoint: [1, 4],
      grapheme: [1, 4],
      graphemeCoverage: [1, 4],
    });
  });

  it("rejects UTF-16 offsets that split surrogate pairs", () => {
    const map = new TextIndexMap("A😀B");

    expect(map.inspectUtf16(2)).toEqual({
      utf16: 2,
      codePoint: null,
      grapheme: null,
      isCodePointBoundary: false,
      isGraphemeBoundary: false,
      containingGrapheme: {
        text: "😀",
        utf16: [1, 3],
        codePoint: [1, 2],
        grapheme: [1, 2],
      },
    });
    expect(() => map.utf16ToCodePoint(2)).toThrow(
      /Unicode code-point boundary/,
    );
    expect(() => map.sourceRangeFromUtf16(2, 3)).toThrow(
      /Unicode code-point boundary/,
    );
    expect(map.sourceRangeFromUtf16(1, 3)).toEqual({
      text: "😀",
      utf16: [1, 3],
      codePoint: [1, 2],
      grapheme: [1, 2],
      graphemeCoverage: [1, 2],
    });
  });

  it("treats combining sequences as one grapheme with interior code-point boundaries", () => {
    const map = new TextIndexMap("e\u0301x");

    expect(map.boundaryFromGrapheme(1)).toEqual({
      utf16: 2,
      codePoint: 2,
      grapheme: 1,
    });
    expect(map.inspectCodePoint(1)).toEqual({
      utf16: 1,
      codePoint: 1,
      grapheme: null,
      isGraphemeBoundary: false,
      containingGrapheme: {
        text: "e\u0301",
        utf16: [0, 2],
        codePoint: [0, 2],
        grapheme: [0, 1],
      },
    });
    expect(() => map.codePointToGrapheme(1)).toThrow(
      /extended grapheme cluster boundary/,
    );
    expect(map.sourceRangeFromCodePoint(0, 1)).toEqual({
      text: "e",
      utf16: [0, 1],
      codePoint: [0, 1],
      grapheme: null,
      graphemeCoverage: [0, 1],
    });
    expect(map.sourceRangeFromCodePoint(1, 1)).toEqual({
      text: "",
      utf16: [1, 1],
      codePoint: [1, 1],
      grapheme: null,
      graphemeCoverage: [0, 1],
    });
    expect(map.sourceRangeFromGrapheme(0, 1)).toEqual({
      text: "e\u0301",
      utf16: [0, 2],
      codePoint: [0, 2],
      grapheme: [0, 1],
      graphemeCoverage: [0, 1],
    });
  });

  it("keeps regional-indicator flags on grapheme boundaries only", () => {
    const map = new TextIndexMap("🇯🇵x");

    expect(map.utf16ToCodePoint(2)).toBe(1);
    expect(() => map.utf16ToGrapheme(2)).toThrow(
      /extended grapheme cluster boundary/,
    );
    expect(map.sourceRangeFromCodePoint(0, 1)).toEqual({
      text: "🇯",
      utf16: [0, 2],
      codePoint: [0, 1],
      grapheme: null,
      graphemeCoverage: [0, 1],
    });
  });

  it("keeps emoji ZWJ sequences on grapheme boundaries only", () => {
    const map = new TextIndexMap("👨‍👩‍👧‍👦!");

    expect(map.codePointLength).toBe(8);
    expect(map.graphemeLength).toBe(2);
    expect(() => map.codePointToGrapheme(1)).toThrow(
      /extended grapheme cluster boundary/,
    );
    expect(map.boundaryFromCodePoint(7)).toEqual({
      utf16: 11,
      codePoint: 7,
      grapheme: 1,
    });
    expect(map.sourceRangeFromCodePoint(0, 7)).toEqual({
      text: "👨‍👩‍👧‍👦",
      utf16: [0, 11],
      codePoint: [0, 7],
      grapheme: [0, 1],
      graphemeCoverage: [0, 1],
    });
    expect(map.sourceRangeFromCodePoint(1, 2)).toEqual({
      text: "‍",
      utf16: [2, 3],
      codePoint: [1, 2],
      grapheme: null,
      graphemeCoverage: [0, 1],
    });
  });

  it("exposes mixed-text grapheme ranges for shaped-cluster correlation", () => {
    const map = new TextIndexMap("A😀e\u0301🇯🇵👨‍👩‍👧‍👦Z");

    expect(
      map.graphemeRanges.map(({ text, utf16, codePoint, grapheme }) => ({
        text,
        utf16,
        codePoint,
        grapheme,
      })),
    ).toEqual([
      { text: "A", utf16: [0, 1], codePoint: [0, 1], grapheme: [0, 1] },
      { text: "😀", utf16: [1, 3], codePoint: [1, 2], grapheme: [1, 2] },
      { text: "e\u0301", utf16: [3, 5], codePoint: [2, 4], grapheme: [2, 3] },
      { text: "🇯🇵", utf16: [5, 9], codePoint: [4, 6], grapheme: [3, 4] },
      {
        text: "👨‍👩‍👧‍👦",
        utf16: [9, 20],
        codePoint: [6, 13],
        grapheme: [4, 5],
      },
      { text: "Z", utf16: [20, 21], codePoint: [13, 14], grapheme: [5, 6] },
    ]);
    expect(map.sourceRangeFromUtf16(3, 9)).toEqual({
      text: "e\u0301🇯🇵",
      utf16: [3, 9],
      codePoint: [2, 6],
      grapheme: [2, 4],
      graphemeCoverage: [2, 4],
    });
  });
});
