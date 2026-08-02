import { describe, expect, it } from "vitest";
import {
  KaraokeTimingError,
  clusterFill,
  revealedOffset,
  validateRevealTags,
  type RevealTag,
} from "./karaokeTiming";

describe("validateRevealTags", () => {
  it("accepts monotonic, in-range integer indices", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 0 },
      { index: 2, time: 1 },
      { index: 5, time: 2 },
    ];
    expect(() => validateRevealTags(tags, 5)).not.toThrow();
  });

  it("rejects a non-integer index", () => {
    expect(() => validateRevealTags([{ index: 1.5, time: 0 }], 5)).toThrow(
      KaraokeTimingError,
    );
  });

  it("rejects an index past the content length", () => {
    expect(() => validateRevealTags([{ index: 6, time: 0 }], 5)).toThrow(
      /out of range/,
    );
  });

  it("rejects a decreasing index (would corrupt the reveal)", () => {
    expect(() =>
      validateRevealTags(
        [
          { index: 3, time: 0 },
          { index: 1, time: 1 },
        ],
        5,
      ),
    ).toThrow(/decreases/);
  });

  it("rejects a non-finite time", () => {
    expect(() =>
      validateRevealTags([{ index: 1, time: Number.NaN }], 5),
    ).toThrow(/time must be finite/);
  });

  it("rejects a negative content length", () => {
    expect(() => validateRevealTags([], -1)).toThrow(KaraokeTimingError);
  });
});

describe("revealedOffset", () => {
  const base = { contentLength: 10, startTime: 100, endTime: 110 };

  it("returns 0 before the segment starts", () => {
    expect(revealedOffset({ ...base, tags: [], currentTime: 99 })).toBe(0);
  });

  it("returns the full length at/after the segment end", () => {
    expect(revealedOffset({ ...base, tags: [], currentTime: 110 })).toBe(10);
    expect(revealedOffset({ ...base, tags: [], currentTime: 200 })).toBe(10);
  });

  it("reveals linearly when there are no tags", () => {
    expect(revealedOffset({ ...base, tags: [], currentTime: 105 })).toBeCloseTo(
      5,
      6,
    );
  });

  it("interpolates piecewise-linearly between tags", () => {
    const tags: RevealTag[] = [
      { index: 0, time: 100 },
      { index: 4, time: 102 },
      { index: 10, time: 110 },
    ];
    // Halfway between t=100 (idx0) and t=102 (idx4).
    expect(revealedOffset({ ...base, tags, currentTime: 101 })).toBeCloseTo(
      2,
      6,
    );
    // Halfway between t=102 (idx4) and t=110 (idx10) => idx 4 + 3 = 7.
    expect(revealedOffset({ ...base, tags, currentTime: 106 })).toBeCloseTo(
      7,
      6,
    );
  });

  it("anchors segment start at 0 when the first tag index is not 0", () => {
    const tags: RevealTag[] = [{ index: 4, time: 104 }];
    // From startTime=100 (idx0) to t=104 (idx4): at t=102 => idx 2.
    expect(revealedOffset({ ...base, tags, currentTime: 102 })).toBeCloseTo(
      2,
      6,
    );
  });

  it("steps across a zero-duration tag interval instead of dividing by zero", () => {
    const tags: RevealTag[] = [
      { index: 2, time: 105 },
      { index: 6, time: 105 },
    ];
    // At exactly t=105 the step resolves to the later index bound.
    const offset = revealedOffset({ ...base, tags, currentTime: 105 });
    expect(offset).toBeGreaterThanOrEqual(2);
    expect(offset).toBeLessThanOrEqual(6);
  });

  it("degrades a stray out-of-order time to a monotonic forward step (never backwards)", () => {
    const tags: RevealTag[] = [
      { index: 2, time: 106 },
      { index: 5, time: 104 }, // time decreases but index is still valid
    ];
    // Reveal must never move backwards as time advances, despite the stray tag.
    const early = revealedOffset({ ...base, tags, currentTime: 104.5 });
    const later = revealedOffset({ ...base, tags, currentTime: 107 });
    expect(early).toBeGreaterThanOrEqual(0);
    expect(later).toBeGreaterThanOrEqual(early);
    expect(later).toBeLessThanOrEqual(10);
  });

  it("surfaces invalid tag indices instead of silently clamping", () => {
    expect(() =>
      revealedOffset({
        ...base,
        tags: [{ index: 42, time: 105 }],
        currentTime: 105,
      }),
    ).toThrow(KaraokeTimingError);
  });
});

describe("clusterFill", () => {
  it("is 0 fully before and 1 fully after the reveal front", () => {
    expect(clusterFill(1, 3, 6)).toBe(0);
    expect(clusterFill(9, 3, 6)).toBe(1);
  });

  it("fills proportionally inside a multi-character / ligature cluster", () => {
    // Cluster spans UTF-16 [3, 6) (e.g. a 3-unit ligature). Front at 4.5 => 50%.
    expect(clusterFill(4.5, 3, 6)).toBeCloseTo(0.5, 6);
    expect(clusterFill(4, 3, 6)).toBeCloseTo(1 / 3, 6);
  });

  it("steps a zero-width cluster from 0 to 1 at its start", () => {
    expect(clusterFill(2.9, 3, 3)).toBe(0);
    expect(clusterFill(3, 3, 3)).toBe(1);
  });
});
