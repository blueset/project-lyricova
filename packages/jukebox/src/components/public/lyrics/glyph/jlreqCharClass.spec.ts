import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUBY_OVERHANG,
  isOverhangGlyphLimited,
  jlreqCharClass,
  jlreqCharClassAt,
  type JlreqCharClass,
} from "./jlreqCharClass";

/** Convenience: classify the first code point of a (BMP) character literal. */
function classOf(char: string): JlreqCharClass {
  return jlreqCharClass(char.codePointAt(0)!);
}

describe("jlreqCharClass", () => {
  it("classifies each modelled class with a real character", () => {
    expect(classOf("（")).toBe("openingBracket"); // cl-01 fullwidth paren
    expect(classOf("）")).toBe("closingBracket"); // cl-02
    expect(classOf("・")).toBe("middleDot"); // cl-05 katakana middle dot
    expect(classOf("。")).toBe("fullStop"); // cl-06
    expect(classOf("、")).toBe("comma"); // cl-07
    expect(classOf("…")).toBe("inseparable"); // cl-08 ellipsis
    expect(classOf("ー")).toBe("prolongedSoundMark"); // cl-10 chōonpu
    expect(classOf("っ")).toBe("smallKana"); // cl-11
    expect(classOf("き")).toBe("hiragana"); // cl-15
    expect(classOf("ボ")).toBe("katakana"); // cl-16
    expect(classOf("行")).toBe("ideographic"); // cl-19 Han
    expect(classOf("A")).toBe("western"); // cl-27
    expect(classOf("등")).toBe("other"); // Hangul is NOT cl-19
  });

  it("covers the other inseparable leaders/dashes", () => {
    expect(classOf("‥")).toBe("inseparable"); // U+2025 two-dot leader
    expect(classOf("—")).toBe("inseparable"); // U+2014 em dash
    expect(classOf("―")).toBe("inseparable"); // U+2015 horizontal bar
  });

  describe("precedence of narrow classes over broad ranges", () => {
    it("treats small kana as smallKana, not hiragana/katakana", () => {
      // Small kana share the U+30xx / U+30xx blocks with ordinary kana; the
      // specific class must win.
      expect(classOf("っ")).toBe("smallKana");
      expect(classOf("ャ")).toBe("smallKana");
    });

    it("treats the prolonged sound mark as prolongedSoundMark, not katakana", () => {
      // ー sits inside the U+30A0–U+30FF katakana block.
      expect(jlreqCharClass(0x30fc)).toBe("prolongedSoundMark");
    });

    it("treats the katakana middle dot as middleDot, not katakana", () => {
      // ・ (U+30FB) also sits inside the katakana block.
      expect(jlreqCharClass(0x30fb)).toBe("middleDot");
    });
  });

  describe("real lyric data cases", () => {
    it("classifies fullwidth angle brackets used as bracket pairs", () => {
      // Lyrics use ＜…＞ as angle-bracket pairs; ruby must not overhang past them.
      expect(classOf("＜")).toBe("openingBracket");
      expect(classOf("＞")).toBe("closingBracket");
    });

    it("classifies white corner brackets and CJK punctuation", () => {
      expect(classOf("『")).toBe("openingBracket");
      expect(classOf("』")).toBe("closingBracket");
      expect(classOf("。")).toBe("fullStop");
      expect(classOf("、")).toBe("comma");
    });

    it("treats a romanized abbreviation `Voc.` as western", () => {
      for (const char of "Voc.") expect(classOf(char)).toBe("western");
    });

    it("treats the apostrophe in `Khot’` as western, not a closing bracket", () => {
      // U+2019 is a typographic apostrophe here, not the RIGHT SINGLE QUOTE
      // closer — otherwise ruby would wrongly clamp against it.
      expect(jlreqCharClass(0x2019)).toBe("western");
      for (const char of "Khot’") expect(classOf(char)).toBe("western");
    });

    it("treats Cyrillic `Хоть` as western", () => {
      for (const char of "Хоть") expect(classOf(char)).toBe("western");
    });

    it("treats a bare Hangul syllable as other", () => {
      expect(classOf("등")).toBe("other");
    });

    it("classifies a Han character and an ASCII digit", () => {
      expect(classOf("行")).toBe("ideographic");
      expect(classOf("0")).toBe("western");
    });

    it("classifies ordinary kana", () => {
      expect(classOf("き")).toBe("hiragana");
      expect(classOf("ボ")).toBe("katakana");
    });
  });

  it("treats the ideographic space and Hangul Jamo as other, not ideographic", () => {
    expect(jlreqCharClass(0x3000)).toBe("other"); // IDEOGRAPHIC SPACE
    expect(jlreqCharClass(0x1100)).toBe("other"); // Hangul Jamo
  });
});

describe("jlreqCharClassAt", () => {
  it("returns null past either end of the string", () => {
    const text = "行";
    expect(jlreqCharClassAt(text, -1)).toBeNull();
    expect(jlreqCharClassAt(text, text.length)).toBeNull();
  });

  it("classifies the character at a UTF-16 offset", () => {
    // "き行" — hiragana then ideograph, both BMP (one UTF-16 unit each).
    expect(jlreqCharClassAt("き行", 0)).toBe("hiragana");
    expect(jlreqCharClassAt("き行", 1)).toBe("ideographic");
  });

  it("handles a surrogate pair at both of its UTF-16 offsets", () => {
    // U+20000 𠀀 is a supplementary-plane ideograph occupying two UTF-16 units;
    // both offsets must resolve to the same (ideographic) class.
    const supplementaryIdeograph = String.fromCodePoint(0x20000);
    expect(supplementaryIdeograph).toHaveLength(2);
    expect(jlreqCharClassAt(supplementaryIdeograph, 0)).toBe("ideographic");
    expect(jlreqCharClassAt(supplementaryIdeograph, 1)).toBe("ideographic");
    expect(jlreqCharClassAt(supplementaryIdeograph, 2)).toBeNull();
  });
});

describe("DEFAULT_RUBY_OVERHANG", () => {
  it("has an entry for every JlreqCharClass member", () => {
    // Exhaustive: adding a class without a budget must fail this test.
    const expected: Record<JlreqCharClass, number> = {
      openingBracket: 1.0,
      closingBracket: 1.0,
      middleDot: 1.0,
      fullStop: 1.0,
      comma: 1.0,
      inseparable: 1.0,
      prolongedSoundMark: 1.0,
      smallKana: 1.0,
      hiragana: 1.0,
      katakana: 1.0,
      ideographic: 0,
      western: 0,
      other: 0,
    };
    expect(DEFAULT_RUBY_OVERHANG).toEqual(expected);
    expect(Object.keys(DEFAULT_RUBY_OVERHANG).sort()).toEqual(
      Object.keys(expected).sort(),
    );
  });

  it("denies overhang for ideographic/western/other and grants it for kana", () => {
    expect(DEFAULT_RUBY_OVERHANG.ideographic).toBe(0);
    expect(DEFAULT_RUBY_OVERHANG.western).toBe(0);
    expect(DEFAULT_RUBY_OVERHANG.other).toBe(0);
    expect(DEFAULT_RUBY_OVERHANG.hiragana).toBe(1.0);
  });
});

describe("isOverhangGlyphLimited", () => {
  it("is true for brackets, full stops and commas", () => {
    expect(isOverhangGlyphLimited("openingBracket")).toBe(true);
    expect(isOverhangGlyphLimited("closingBracket")).toBe(true);
    expect(isOverhangGlyphLimited("fullStop")).toBe(true);
    expect(isOverhangGlyphLimited("comma")).toBe(true);
  });

  it("is false for kana, ideographic, western and other", () => {
    expect(isOverhangGlyphLimited("hiragana")).toBe(false);
    expect(isOverhangGlyphLimited("katakana")).toBe(false);
    expect(isOverhangGlyphLimited("smallKana")).toBe(false);
    expect(isOverhangGlyphLimited("prolongedSoundMark")).toBe(false);
    expect(isOverhangGlyphLimited("middleDot")).toBe(false);
    expect(isOverhangGlyphLimited("inseparable")).toBe(false);
    expect(isOverhangGlyphLimited("ideographic")).toBe(false);
    expect(isOverhangGlyphLimited("western")).toBe(false);
    expect(isOverhangGlyphLimited("other")).toBe(false);
  });
});
