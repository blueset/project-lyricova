import { describe, expect, it } from "vitest";
import { buildWords, wordProgress, type LyricWord } from "./wordModel";
import type { RevealTag } from "../glyph/karaokeTiming";

describe("buildWords", () => {
  it("returns no words for an untimed line (fewer than one tag)", () => {
    expect(buildWords([], 10, 5)).toEqual([]);
  });

  it("bounds a single tag against contentLength / lineEndTime", () => {
    const words = buildWords([{ index: 2, time: 5 }], 6, 10);
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({
      index: 0,
      utf16Range: [2, 6],
      startTime: 5,
      endTime: 10,
      duration: 5,
      isLast: true,
    });
  });

  it("drops the final tag when it would bound an empty range", () => {
    // The lone tag already sits at contentLength -> the closing range is empty.
    expect(buildWords([{ index: 6, time: 5 }], 6, 10)).toEqual([]);
  });

  it("maps consecutive tags to half-open ranges and the last against the line end", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 100 },
      { index: 4, time: 102 },
      { index: 10, time: 110 },
    ];
    const words = buildWords(tags, 12, 115);
    expect(words).toHaveLength(3);
    expect(words[0]).toMatchObject({
      index: 0,
      utf16Range: [0, 4],
      startTime: 100,
      endTime: 102,
      duration: 2,
      isLast: false,
    });
    expect(words[1]).toMatchObject({
      index: 1,
      utf16Range: [4, 10],
      startTime: 102,
      endTime: 110,
      duration: 8,
      isLast: false,
    });
    // Final word closes against contentLength (12) and lineEndTime (115).
    expect(words[2]).toMatchObject({
      index: 2,
      utf16Range: [10, 12],
      startTime: 110,
      endTime: 115,
      duration: 5,
      isLast: true,
    });
  });

  it("does not synthesize a word before the first tag", () => {
    // The [0, 2) prefix is revealed before the first keyframe: not a word.
    const words = buildWords([{ index: 2, time: 5 }], 5, 10);
    expect(words[0].utf16Range[0]).toBe(2);
  });

  it("drops zero-width ranges yet keeps word indices contiguous", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 0 },
      { index: 3, time: 1 },
      { index: 3, time: 2 }, // zero-width against the previous tag
      { index: 7, time: 3 },
    ];
    const words = buildWords(tags, 10, 5);
    expect(words.map((w) => w.utf16Range)).toEqual([
      [0, 3],
      [3, 7],
      [7, 10],
    ]);
    expect(words.map((w) => w.index)).toEqual([0, 1, 2]);
    expect(words.map((w) => w.isLast)).toEqual([false, false, true]);
  });

  it("keeps zero-duration words (equal start/end time), marking duration 0", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 5 },
      { index: 3, time: 5 }, // same time, non-empty range -> instant word
    ];
    const words = buildWords(tags, 6, 10);
    expect(words[0]).toMatchObject({
      utf16Range: [0, 3],
      startTime: 5,
      endTime: 5,
      duration: 0,
    });
    expect(words[1].duration).toBe(5);
  });

  it("normalises non-monotonic tag times with a running max (never negative duration)", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 5 },
      { index: 3, time: 2 }, // time decreases -> normalised up to 5
      { index: 6, time: 8 },
    ];
    const words = buildWords(tags, 8, 10);
    for (const word of words) {
      expect(word.duration).toBeGreaterThanOrEqual(0);
      expect(word.endTime).toBeGreaterThanOrEqual(word.startTime);
    }
    // The stray backward time collapses its word to zero duration, not negative.
    expect(words[0]).toMatchObject({ startTime: 5, endTime: 5, duration: 0 });
    expect(words[1]).toMatchObject({ startTime: 5, endTime: 8 });
  });

  it("clamps the final word's end up to the running max when lineEndTime precedes it", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 5 },
      { index: 4, time: 20 },
    ];
    // lineEndTime (10) is earlier than the last tag time (20): the sentinel is
    // pulled up to 20 so the final word is zero-duration, never negative.
    const words = buildWords(tags, 8, 10);
    expect(words[1]).toMatchObject({
      utf16Range: [4, 8],
      startTime: 20,
      endTime: 20,
      duration: 0,
      isLast: true,
    });
  });

  it("never throws on a decreasing index; the inverted range is simply dropped", () => {
    const tags: RevealTag[] = [
      { index: 5, time: 1 },
      { index: 2, time: 2 }, // index decreases -> inverted range [5, 2)
    ];
    let words: LyricWord[] = [];
    expect(() => {
      words = buildWords(tags, 8, 10);
    }).not.toThrow();
    // Only the surviving [2, 8) range remains, and it is the (new) last word.
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ utf16Range: [2, 8], isLast: true });
  });

  it("marks only the final retained word as last", () => {
    const words = buildWords(
      [
        { index: 0, time: 0 },
        { index: 2, time: 1 },
        { index: 5, time: 2 },
      ],
      8,
      3,
    );
    expect(words.filter((w) => w.isLast)).toHaveLength(1);
    expect(words[words.length - 1].isLast).toBe(true);
  });
});

describe("wordProgress", () => {
  const word: LyricWord = {
    index: 0,
    utf16Range: [0, 4],
    startTime: 10,
    endTime: 14,
    duration: 4,
    isLast: false,
  };

  it("is 0 before the word and 1 after it", () => {
    expect(wordProgress(word, 9)).toBe(0);
    expect(wordProgress(word, 10)).toBe(0);
    expect(wordProgress(word, 14)).toBe(1);
    expect(wordProgress(word, 100)).toBe(1);
  });

  it("ramps linearly across the word with no easing", () => {
    expect(wordProgress(word, 11)).toBeCloseTo(0.25, 6);
    expect(wordProgress(word, 12)).toBeCloseTo(0.5, 6);
    expect(wordProgress(word, 13)).toBeCloseTo(0.75, 6);
  });

  it("steps 0 -> 1 at startTime for a zero-duration word", () => {
    const instant: LyricWord = {
      index: 0,
      utf16Range: [0, 1],
      startTime: 10,
      endTime: 10,
      duration: 0,
      isLast: false,
    };
    expect(wordProgress(instant, 9.999)).toBe(0);
    expect(wordProgress(instant, 10)).toBe(1);
    expect(wordProgress(instant, 11)).toBe(1);
  });

  it("takes the step branch for a negative or non-finite duration (finite output)", () => {
    // Only reachable via a hand-built word (buildWords normalises), but the
    // guard must never divide to a non-finite result.
    const negative: LyricWord = {
      index: 0,
      utf16Range: [0, 1],
      startTime: 10,
      endTime: 8,
      duration: -2,
      isLast: false,
    };
    const nan: LyricWord = {
      index: 0,
      utf16Range: [0, 1],
      startTime: 10,
      endTime: 14,
      duration: Number.NaN,
      isLast: false,
    };
    for (const w of [negative, nan]) {
      expect(wordProgress(w, 9)).toBe(0); // before startTime -> 0
      expect(wordProgress(w, 20)).toBe(1); // at/after startTime -> 1
      expect(Number.isFinite(wordProgress(w, 20))).toBe(true);
    }
  });
});
