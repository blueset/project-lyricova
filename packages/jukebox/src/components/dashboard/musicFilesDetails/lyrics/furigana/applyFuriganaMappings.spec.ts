import { describe, expect, it } from "vitest";
import { applyFuriganaMappingsToLine } from "./applyFuriganaMappings";

describe("applyFuriganaMappingsToLine", () => {
  it("splits an existing multi-character furigana when the mapping matches", () => {
    expect(
      applyFuriganaMappingsToLine(
        "未来",
        [{ content: "みらい", range: [0, 2] }],
        [
          ["未", "み"],
          ["来", "らい"],
        ],
      ),
    ).toEqual([
      ["未", "み"],
      ["来", "らい"],
    ]);
  });

  it("leaves existing single-character furigana unchanged", () => {
    expect(
      applyFuriganaMappingsToLine(
        "未来",
        [
          { content: "み", range: [0, 1] },
          { content: "らい", range: [1, 2] },
        ],
        [
          ["未", "み"],
          ["来", "らい"],
        ],
      ),
    ).toEqual([
      ["未", "み"],
      ["来", "らい"],
    ]);
  });

  it("leaves a multi-character furigana unchanged when readings differ", () => {
    expect(
      applyFuriganaMappingsToLine(
        "未来",
        [{ content: "あした", range: [0, 2] }],
        [
          ["未", "み"],
          ["来", "らい"],
        ],
      ),
    ).toEqual([["未来", "あした"]]);
  });
});
