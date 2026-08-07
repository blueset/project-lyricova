import { describe, expect, it } from "vitest";
import { getSelectedTranslation } from "./translation";

describe("getSelectedTranslation", () => {
  it("uses the empty-string key for an untagged translation", () => {
    expect(getSelectedTranslation({ "": "翻訳" }, "")).toBe("翻訳");
  });

  it("returns no translation when no language is selected", () => {
    expect(getSelectedTranslation({ en: "Translation" }, null)).toBeUndefined();
    expect(
      getSelectedTranslation({ en: "Translation" }, undefined),
    ).toBeUndefined();
  });
});
