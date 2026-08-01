import { describe, expect, it } from "vitest";
import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/components/gql/schema";
import {
  alignmentForRole,
  buildLyricSegments,
  selectActiveSegments,
} from "./lyricSegments";

interface LineOptions {
  role?: number;
  minor?: boolean;
  furigana?: { content: string; leftIndex: number; rightIndex: number }[];
  timeTag?: { duration?: number | null; tags: { index: number; timeTag: number }[] };
  translation?: string | null;
  translations?: Record<string, string>;
}

function makeLine(
  content: string,
  position: number,
  options: LineOptions = {},
): LyricsKitLyricsLine {
  return {
    content,
    position,
    attachments: {
      furigana: options.furigana ?? null,
      romaji: null,
      minor: options.minor ?? false,
      role: options.role ?? 0,
      timeTag: options.timeTag ?? null,
      translation: options.translation ?? null,
      translations: options.translations ?? {},
    },
  } as unknown as LyricsKitLyricsLine;
}

function makeLyrics(
  lines: LyricsKitLyricsLine[],
  translationLanguages: string[] = [],
  length: number | null = null,
): LyricsKitLyrics {
  return {
    lines,
    translationLanguages,
    length,
    quality: null,
  } as unknown as LyricsKitLyrics;
}

describe("alignmentForRole", () => {
  it("maps roles to horizontal alignment", () => {
    expect(alignmentForRole(0)).toBe("start");
    expect(alignmentForRole(1)).toBe("end");
    expect(alignmentForRole(2)).toBe("center");
    expect(alignmentForRole(9)).toBe("start");
  });
});

describe("buildLyricSegments", () => {
  it("derives absolute times, alignment, minor flag and furigana", () => {
    const lyrics = makeLyrics([
      makeLine("こんにちは", 1, {
        role: 2,
        minor: true,
        furigana: [{ content: "こん", leftIndex: 0, rightIndex: 1 }],
      }),
      makeLine("world", 5),
    ]);

    const segments = buildLyricSegments(lyrics);
    expect(segments).toHaveLength(2);

    const first = segments[0]!;
    expect(first.startTime).toBe(1);
    // No own duration/tags -> ends at the next line's start.
    expect(first.endTime).toBe(5);
    expect(first.alignment).toBe("center");
    expect(first.minor).toBe(true);
    expect(first.furigana).toEqual([
      { content: "こん", leftIndex: 0, rightIndex: 1 },
    ]);
  });

  it("converts time tags to absolute time in logical order", () => {
    const lyrics = makeLyrics([
      makeLine("hello", 10, {
        timeTag: {
          duration: 2,
          tags: [
            { index: 0, timeTag: 0 },
            { index: 3, timeTag: 1 },
          ],
        },
      }),
    ]);

    const [segment] = buildLyricSegments(lyrics);
    expect(segment!.timeTags).toEqual([
      { index: 0, time: 10 },
      { index: 3, time: 11 },
    ]);
    // duration = 2 => ends at position + duration.
    expect(segment!.endTime).toBe(12);
  });

  it("uses the maximum finite tag time, not the last tag, when tags are unsorted/decreasing", () => {
    const lyrics = makeLyrics([
      makeLine("out of order", 10, {
        // No explicit duration: falls back to the largest tag time. The last
        // array entry (0.5) is smaller than an earlier one (5) - the wrong
        // "last tag" heuristic would truncate this to 10.5, cutting the line
        // off while it's still supposed to be active.
        timeTag: {
          tags: [
            { index: 0, timeTag: 0 },
            { index: 2, timeTag: 5 },
            { index: 4, timeTag: 0.5 },
          ],
        },
      }),
    ]);
    const [segment] = buildLyricSegments(lyrics);
    expect(segment!.endTime).toBe(15);
  });

  it("ignores non-finite tag times when deriving the implicit end time", () => {
    const lyrics = makeLyrics([
      makeLine("has invalid tag", 0, {
        timeTag: {
          tags: [
            { index: 0, timeTag: 1 },
            { index: 1, timeTag: Number.NaN },
            { index: 2, timeTag: 3 },
            { index: 3, timeTag: Number.POSITIVE_INFINITY },
          ],
        },
      }),
    ]);
    const [segment] = buildLyricSegments(lyrics);
    // Only the finite tags (1, 3) count -> ends at position + 3.
    expect(segment!.endTime).toBe(3);
  });

  it("falls through to the default duration when every tag time is non-finite", () => {
    const lyrics = makeLyrics([
      makeLine("all invalid", 2, {
        timeTag: {
          tags: [
            { index: 0, timeTag: Number.NaN },
            { index: 1, timeTag: Number.POSITIVE_INFINITY },
          ],
        },
      }),
    ]);
    const [segment] = buildLyricSegments(lyrics);
    expect(segment!.endTime).toBeGreaterThan(2);
  });

  it("lets a line's own timed duration overlap the next line", () => {
    const lyrics = makeLyrics([
      makeLine("long line", 0, { timeTag: { duration: 8, tags: [] } }),
      makeLine("overlapping", 3),
    ]);
    const segments = buildLyricSegments(lyrics);
    // First line ends at 8 even though the next starts at 3 -> they overlap.
    expect(segments[0]!.endTime).toBe(8);
    expect(segments[1]!.startTime).toBe(3);
  });

  it("selects the translation for the chosen language, falling back to `translation`", () => {
    const lyrics = makeLyrics(
      [
        makeLine("a", 0, {
          translation: "fallback",
          translations: { en: "english", zh: "中文" },
        }),
        makeLine("b", 1, { translation: "only-fallback" }),
      ],
      ["en", "zh"],
    );

    const withZh = buildLyricSegments(lyrics, { translationLanguage: "zh" });
    expect(withZh[0]!.translation).toBe("中文");
    // No zh translation on line b -> falls back to attachments.translation.
    expect(withZh[1]!.translation).toBe("only-fallback");

    const noLang = buildLyricSegments(lyrics, { translationLanguage: null });
    expect(noLang[0]!.translation).toBe("fallback");
  });

  it("bounds the final untimed line by track duration then a default", () => {
    const withTrack = buildLyricSegments(
      makeLyrics([makeLine("last", 10)], [], 25),
    );
    expect(withTrack[0]!.endTime).toBe(25);

    const withoutTrack = buildLyricSegments(
      makeLyrics([makeLine("last", 10)]),
    );
    expect(withoutTrack[0]!.endTime).toBeGreaterThan(10);
  });
});

describe("selectActiveSegments", () => {
  const lyrics = makeLyrics([
    makeLine("A", 0, { timeTag: { duration: 6, tags: [] } }), // [0, 6)
    makeLine("B", 3, { timeTag: { duration: 4, tags: [] } }), // [3, 7)
    makeLine("C", 8, { timeTag: { duration: 2, tags: [] } }), // [8, 10)
  ]);
  const segments = buildLyricSegments(lyrics);

  it("returns all overlapping active segments, sorted by start time", () => {
    const active = selectActiveSegments(segments, 4);
    expect(active.map((s) => s.content)).toEqual(["A", "B"]);
  });

  it("uses a half-open interval [start, end)", () => {
    // At t=6, A has ended (exclusive) but B is still active.
    expect(selectActiveSegments(segments, 6).map((s) => s.content)).toEqual([
      "B",
    ]);
    // At exactly t=8, C becomes active (inclusive start).
    expect(selectActiveSegments(segments, 8).map((s) => s.content)).toEqual([
      "C",
    ]);
  });

  it("returns nothing in a gap between segments", () => {
    expect(selectActiveSegments(segments, 7.5)).toEqual([]);
  });
});
