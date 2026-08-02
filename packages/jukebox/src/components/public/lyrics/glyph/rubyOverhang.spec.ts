import { describe, expect, it } from "vitest";
import { DEFAULT_RUBY_OVERHANG } from "./jlreqCharClass";
import {
  capBudgetToGlyph,
  isFixedWidthRun,
  isRunWhitespace,
  resolveOverhangBudget,
  resolveOverhangTable,
} from "./rubyOverhang";

const TABLE = resolveOverhangTable();

describe("resolveOverhangTable", () => {
  it("defaults to the JLReq-recommended budgets", () => {
    expect(resolveOverhangTable()).toEqual(DEFAULT_RUBY_OVERHANG);
  });

  it("merges caller overrides over the defaults", () => {
    const table = resolveOverhangTable({ ideographic: 0.5 });
    expect(table.ideographic).toBe(0.5);
    expect(table.hiragana).toBe(DEFAULT_RUBY_OVERHANG.hiragana);
  });

  it("ignores malformed overrides rather than producing negative geometry", () => {
    const table = resolveOverhangTable({
      hiragana: -1,
      katakana: NaN,
      western: Infinity,
    });
    expect(table.hiragana).toBe(DEFAULT_RUBY_OVERHANG.hiragana);
    expect(table.katakana).toBe(DEFAULT_RUBY_OVERHANG.katakana);
    expect(table.western).toBe(DEFAULT_RUBY_OVERHANG.western);
  });
});

describe("resolveOverhangBudget", () => {
  it("grants one ruby em next to kana and nothing next to an ideograph", () => {
    // 「の山字」: hiragana on the left, ideograph on the right.
    expect(resolveOverhangBudget("の山字", 1, 2, 10, TABLE)).toEqual({
      left: 10,
      right: 0,
    });
  });

  it("resolves the two sides independently", () => {
    expect(resolveOverhangBudget("字山の", 1, 2, 8, TABLE)).toEqual({
      left: 0,
      right: 8,
    });
  });

  it("grants nothing next to western characters", () => {
    // A fully romanized line: every neighbour is a Latin letter.
    expect(resolveOverhangBudget("BAD", 1, 2, 10, TABLE)).toEqual({
      left: 0,
      right: 0,
    });
  });

  it("is unbounded at a paragraph edge, where ruby is line-aligned", () => {
    // JLReq sets the line head/end ruby-aligned, so an edge annotation may
    // hang out freely and is only constrained by the line's content box.
    expect(resolveOverhangBudget("山の", 0, 1, 10, TABLE)).toEqual({
      left: Infinity,
      right: 10,
    });
    expect(resolveOverhangBudget("の山", 1, 2, 10, TABLE)).toEqual({
      left: 10,
      right: Infinity,
    });
  });

  it("grants a budget next to brackets and punctuation", () => {
    expect(resolveOverhangBudget("＜歌＞", 1, 2, 10, TABLE)).toEqual({
      left: 10,
      right: 10,
    });
    expect(resolveOverhangBudget("字山。", 1, 2, 10, TABLE).right).toBe(10);
  });
});

describe("capBudgetToGlyph", () => {
  it("never lets ruby hang past a bracket, full stop or comma glyph", () => {
    expect(capBudgetToGlyph(10, "openingBracket", 3)).toBe(3);
    expect(capBudgetToGlyph(10, "closingBracket", 3)).toBe(3);
    expect(capBudgetToGlyph(10, "fullStop", 4)).toBe(4);
    expect(capBudgetToGlyph(10, "comma", 4)).toBe(4);
  });

  it("leaves a wider glyph's budget at the class limit", () => {
    expect(capBudgetToGlyph(10, "openingBracket", 32)).toBe(10);
  });

  it("does not cap classes ruby may hang across", () => {
    expect(capBudgetToGlyph(10, "hiragana", 3)).toBe(10);
    expect(capBudgetToGlyph(10, "katakana", 3)).toBe(10);
  });

  it("passes the budget through when there is no adjacent glyph", () => {
    expect(capBudgetToGlyph(10, null, 3)).toBe(10);
    expect(capBudgetToGlyph(10, "openingBracket", null)).toBe(10);
  });
});

describe("isFixedWidthRun", () => {
  it("accepts fixed-width Japanese runs, which may be letterspaced", () => {
    expect(isFixedWidthRun("接続")).toBe(true);
    expect(isFixedWidthRun("つながり")).toBe(true);
    expect(isFixedWidthRun("ストーリィ")).toBe(true); // incl. ー and small ィ
    expect(isFixedWidthRun("＜最高速の喜びの歌＞")).toBe(true);
    expect(isFixedWidthRun("行")).toBe(true);
  });

  it("rejects proportional runs, which must be set solid", () => {
    // Latin, Cyrillic, Hangul and digits all come from the real lyrics data.
    expect(isFixedWidthRun("Voc.")).toBe(false);
    expect(isFixedWidthRun("BAD")).toBe(false);
    expect(isFixedWidthRun("Khot’")).toBe(false);
    expect(isFixedWidthRun("Хоть")).toBe(false);
    expect(isFixedWidthRun("등")).toBe(false);
    expect(isFixedWidthRun("0")).toBe(false);
  });

  it("rejects a mixed run, so a single Latin letter is never letterspaced", () => {
    expect(isFixedWidthRun("接A続")).toBe(false);
  });

  it("treats an empty or all-whitespace run as proportional", () => {
    expect(isFixedWidthRun("")).toBe(false);
    expect(isFixedWidthRun("  ")).toBe(false);
  });

  it("ignores whitespace when classifying an otherwise Japanese run", () => {
    expect(isFixedWidthRun("接 続")).toBe(true);
  });
});

describe("isRunWhitespace", () => {
  it("recognises the separators that appear in lyrics data", () => {
    expect(isRunWhitespace(" ")).toBe(true);
    expect(isRunWhitespace("\u3000")).toBe(true);
    expect(isRunWhitespace("\u00a0")).toBe(true);
    expect(isRunWhitespace("\t")).toBe(true);
  });

  it("rejects anything with ink", () => {
    expect(isRunWhitespace("a")).toBe(false);
    expect(isRunWhitespace(" a ")).toBe(false);
    expect(isRunWhitespace("")).toBe(false);
  });
});
