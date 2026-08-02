import { describe, expect, it } from "vitest";
import {
  autoPhraseRanges,
  type AutoPhraseParsers,
  type PhraseParser,
} from "./autoPhrase";

function parser(boundaries: number[]): PhraseParser {
  return { parseBoundaries: () => boundaries };
}

function parsers(
  overrides: Partial<AutoPhraseParsers> = {},
): AutoPhraseParsers {
  return {
    ja: parser([]),
    "zh-hans": parser([]),
    "zh-hant": parser([]),
    th: parser([]),
    ...overrides,
  };
}

describe("autoPhraseRanges", () => {
  it("leaves an entirely non-CJT line on ordinary UAX #14 wrapping", () => {
    expect(autoPhraseRanges("Hello world 123 😀")).toEqual({
      phraseRanges: [],
      runs: [],
    });
  });

  it("uses Japanese for Han-only text by default", () => {
    const result = autoPhraseRanges("東京", {
      parsers: parsers({ ja: parser([1]) }),
    });

    expect(result.runs).toEqual([
      { language: "ja", utf16Range: [0, 2], text: "東京" },
    ]);
    expect(result.phraseRanges).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it.each([
    ["zh-Hans", "zh-hans"],
    ["zh-CN", "zh-hans"],
    ["zh-Hant", "zh-hant"],
    ["zh-TW", "zh-hant"],
  ] as const)("uses %s for Han-only text", (language, expected) => {
    const result = autoPhraseRanges("天气", {
      language,
      parsers: parsers({ [expected]: parser([1]) }),
    });
    expect(result.runs[0]?.language).toBe(expected);
  });

  it("selects Thai by script even when the Han default is Japanese", () => {
    const result = autoPhraseRanges("วันนี้อากาศดี", {
      parsers: parsers({ th: parser([3, 6]) }),
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.language).toBe("th");
    expect(result.phraseRanges.length).toBeGreaterThan(1);
  });

  it("segments CJT runs in mixed text without constraining spaced Latin text", () => {
    const text = "今日は Hatsune Miku です";
    const latinStart = text.indexOf("Hatsune");
    const latinEnd = text.indexOf(" です");
    const result = autoPhraseRanges(text, {
      parsers: parsers({ ja: parser([1]) }),
    });

    expect(result.runs.map((run) => run.text)).toEqual(["今日は", "です"]);
    expect(
      result.phraseRanges.every(
        ([start, end]) => end <= latinStart || start >= latinEnd,
      ),
    ).toBe(true);
  });

  it("can include unspaced Latin text inside an adjacent CJT phrase run", () => {
    const result = autoPhraseRanges("AI時代", {
      parsers: parsers({ ja: parser([2]) }),
    });
    expect(result.runs).toEqual([
      { language: "ja", utf16Range: [0, 4], text: "AI時代" },
    ]);
  });

  it("drops BudouX boundaries that split a surrogate pair or grapheme", () => {
    const result = autoPhraseRanges("𠀀日", {
      parsers: parsers({ ja: parser([1, 2]) }),
    });
    expect(result.phraseRanges).toEqual([
      [0, 2],
      [2, 3],
    ]);
  });

  it("uses the real Japanese model for its documented sample", () => {
    const result = autoPhraseRanges("今日は天気です。");
    expect(result.phraseRanges).toEqual([
      [0, 3],
      [3, 8],
    ]);
  });

  it.each([
    ["zh-Hans", "是今天的天气。"],
    ["zh-Hant", "是今天的天氣。"],
  ] as const)(
    "uses the real %s model when explicitly hinted",
    (language, text) => {
      const result = autoPhraseRanges(text, { language });
      expect(result.phraseRanges).toEqual([
        [0, 1],
        [1, 3],
        [3, 4],
        [4, 7],
      ]);
    },
  );
});
