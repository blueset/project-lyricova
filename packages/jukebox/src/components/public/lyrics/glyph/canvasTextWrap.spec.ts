import { describe, expect, it } from "vitest";
import type { LineBreak } from "@lyricova/glyph-renderer";
import {
  canvasTextDirection,
  wrapCanvasText,
  type CanvasTextLayout,
} from "./canvasTextWrap";

const measure = (text: string) => [...text].length * 10;

function breaks(
  allowed: number[],
  end: number,
  mandatory: number[] = [],
): LineBreak[] {
  return [
    ...allowed.map((utf16Index) => ({
      utf8Index: utf16Index,
      utf16Index,
      mandatory: false,
    })),
    ...mandatory.map((utf16Index) => ({
      utf8Index: utf16Index,
      utf16Index,
      mandatory: true,
    })),
    ...(mandatory.includes(end)
      ? []
      : [{ utf8Index: end, utf16Index: end, mandatory: true }]),
  ];
}

describe("wrapCanvasText", () => {
  it("wraps words at legal UAX-style boundaries and trims trailing spaces", () => {
    const text = "hello world again";
    const layout = wrapCanvasText({
      text,
      maxWidth: 70,
      lineHeight: 12,
      measureText: measure,
      breaks: breaks([6, 12], text.length),
      wrapStrategy: "greedy",
    });

    expect(layout.lines.map((line) => line.text)).toEqual([
      "hello",
      "world",
      "again",
    ]);
    expect(layout.height).toBe(36);
  });

  it("uses grapheme emergency breaks for a token wider than the line", () => {
    const text = "abcdefgh";
    const layout = wrapCanvasText({
      text,
      maxWidth: 30,
      lineHeight: 10,
      measureText: measure,
      breaks: breaks([], text.length),
      wrapStrategy: "greedy",
    });

    expect(layout.lines.map((line) => line.text)).toEqual(["abc", "def", "gh"]);
  });

  it("preserves mandatory newlines as line boundaries", () => {
    const text = "ab\ncd";
    const layout = wrapCanvasText({
      text,
      maxWidth: 100,
      lineHeight: 10,
      measureText: measure,
      breaks: breaks([], text.length, [3, text.length]),
    });

    expect(layout.lines.map((line) => line.text)).toEqual(["ab", "cd"]);
  });

  it("removes U+0085 NEXT LINE from measured and rendered text", () => {
    const text = "ab\u0085cd";
    const layout = wrapCanvasText({
      text,
      maxWidth: 100,
      lineHeight: 10,
      measureText: measure,
      breaks: breaks([], text.length, [3, text.length]),
    });

    expect(layout.lines.map((line) => line.text)).toEqual(["ab", "cd"]);
    expect(layout.lines.map((line) => line.width)).toEqual([20, 20]);
  });

  it("balances line widths without changing the greedy line count", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta";
    const opportunities = Array.from(
      text.matchAll(/ /gu),
      (match) => Number(match.index) + 1,
    );
    const spread = (widths: number[]) =>
      Math.max(...widths) - Math.min(...widths);
    let improvement:
      { greedy: CanvasTextLayout; balanced: CanvasTextLayout } | undefined;

    for (let maxWidth = 120; maxWidth <= 300; maxWidth += 10) {
      const greedy = wrapCanvasText({
        text,
        maxWidth,
        lineHeight: 10,
        measureText: measure,
        breaks: breaks(opportunities, text.length),
        wrapStrategy: "greedy",
      });
      const balanced = wrapCanvasText({
        text,
        maxWidth,
        lineHeight: 10,
        measureText: measure,
        breaks: breaks(opportunities, text.length),
        wrapStrategy: "balanced",
      });
      if (
        balanced.lines.length === greedy.lines.length &&
        spread(balanced.lines.map((line) => line.width)) <
          spread(greedy.lines.map((line) => line.width))
      ) {
        improvement = { greedy, balanced };
        break;
      }
    }

    expect(improvement).toBeDefined();
    expect(improvement!.balanced.lines).toHaveLength(
      improvement!.greedy.lines.length,
    );
  });

  it("prefers phrase boundaries but falls back inside an overlong phrase", () => {
    const text = "あいうえお";
    const allBreaks = [1, 2, 3, 4];
    const fitting = wrapCanvasText({
      text,
      maxWidth: 25,
      lineHeight: 10,
      measureText: measure,
      breaks: breaks(allBreaks, text.length),
      wrapStrategy: "balanced",
      phraseRanges: [[1, 3]],
    });
    expect(fitting.lines.map((line) => line.sourceRange[1])).not.toContain(2);

    const overlong = wrapCanvasText({
      text,
      maxWidth: 20,
      lineHeight: 10,
      measureText: measure,
      breaks: breaks(allBreaks, text.length),
      wrapStrategy: "balanced",
      phraseRanges: [[0, 5]],
    });
    expect(overlong.lines.length).toBeGreaterThan(1);
    expect(overlong.lines.every((line) => line.width <= 20)).toBe(true);
  });

  it("returns an empty layout for empty text", () => {
    expect(
      wrapCanvasText({
        text: "",
        maxWidth: 100,
        lineHeight: 10,
        measureText: measure,
        breaks: [],
      }),
    ).toEqual({ lines: [], width: 0, height: 0, lineHeight: 10 });
  });
});

describe("canvasTextDirection", () => {
  it("uses the first strong character for mixed-direction text", () => {
    expect(canvasTextDirection("Hello שלום")).toBe("ltr");
    expect(canvasTextDirection("שלום, world!")).toBe("rtl");
    expect(canvasTextDirection("123 العربية.")).toBe("rtl");
    expect(canvasTextDirection("١٢٣ Hello")).toBe("ltr");
    expect(canvasTextDirection("١٢٣ العربية")).toBe("rtl");
  });
});
