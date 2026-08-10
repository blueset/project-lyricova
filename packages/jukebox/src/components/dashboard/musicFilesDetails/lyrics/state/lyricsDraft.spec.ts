import { beforeEach, describe, expect, it } from "vitest";
import {
  isLyricsDraftStale,
  loadLyricsDraft,
  lyricsDraftKey,
  LYRICS_DRAFT_VERSION,
  persistLyricsDraft,
} from "./lyricsDraft";

describe("lyrics draft storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isolates records by music file ID", () => {
    expect(lyricsDraftKey(12)).not.toBe(lyricsDraftKey(13));

    persistLyricsDraft(
      localStorage,
      12,
      { lrc: "draft", lrcx: "draft-x" },
      { lrc: "saved", lrcx: "saved-x" },
      new Date("2026-08-10T00:00:00Z"),
    );

    expect(loadLyricsDraft(localStorage, 12)).toMatchObject({
      fileId: 12,
      lrc: "draft",
      lrcx: "draft-x",
    });
    expect(loadLyricsDraft(localStorage, 13)).toBeNull();
  });

  it("removes the record when content returns to the saved baseline", () => {
    const base = { lrc: "saved", lrcx: "saved-x" };
    persistLyricsDraft(
      localStorage,
      12,
      { lrc: "draft", lrcx: "draft-x" },
      base,
    );

    expect(persistLyricsDraft(localStorage, 12, base, base)).toBeNull();
    expect(localStorage.getItem(lyricsDraftKey(12))).toBeNull();
  });

  it.each([
    "not-json",
    JSON.stringify({ version: LYRICS_DRAFT_VERSION + 1 }),
    JSON.stringify({
      version: LYRICS_DRAFT_VERSION,
      fileId: 99,
      baseLrc: "",
      baseLrcx: "",
      lrc: "draft",
      lrcx: "draft",
      updatedAt: "2026-08-10T00:00:00Z",
    }),
  ])("removes an invalid stored record", (serialized) => {
    localStorage.setItem(lyricsDraftKey(12), serialized);

    expect(loadLyricsDraft(localStorage, 12)).toBeNull();
    expect(localStorage.getItem(lyricsDraftKey(12))).toBeNull();
  });

  it("detects when the saved lyrics changed after drafting began", () => {
    const draft = persistLyricsDraft(
      localStorage,
      12,
      { lrc: "draft", lrcx: "draft-x" },
      { lrc: "old", lrcx: "old-x" },
    )!;

    expect(isLyricsDraftStale(draft, { lrc: "old", lrcx: "old-x" })).toBe(
      false,
    );
    expect(isLyricsDraftStale(draft, { lrc: "new", lrcx: "new-x" })).toBe(true);
  });
});
