import { describe, expect, it } from "vitest";
import type { GlyphLyricSegment } from "../glyph/lyricSegments";
import {
  buildPresentationSegments,
  OVERLAP_PRESENTATION_LEAD_IN_SECONDS,
  PRESENTATION_LEAD_IN_SECONDS,
} from "./presentationTiming";
import { findInterludeGaps } from "./interlude";

function segment(
  lineIndex: number,
  content: string,
  startTime: number,
  endTime: number,
): GlyphLyricSegment {
  return {
    lineIndex,
    content,
    startTime,
    endTime,
    role: 0,
    minor: false,
    alignment: "start",
    furigana: [],
    timeTags: [],
    translation: null,
  };
}

describe("buildPresentationSegments", () => {
  it("advances visible lines without changing their authored end times", () => {
    const authored = [
      segment(0, "first", 10, 12),
      segment(1, "second", 20, 22),
    ];

    const presentation = buildPresentationSegments(authored);

    expect(presentation[0]).toEqual({
      lineIndex: 0,
      start: 10 - PRESENTATION_LEAD_IN_SECONDS,
      end: 12,
    });
    expect(presentation[1]).toEqual({
      lineIndex: 1,
      start: 20 - PRESENTATION_LEAD_IN_SECONDS,
      end: 22,
    });
    expect(
      authored.map(({ startTime, endTime }) => [startTime, endTime]),
    ).toEqual([
      [10, 12],
      [20, 22],
    ]);
  });

  it("does not advance through the previous visible line's end", () => {
    const presentation = buildPresentationSegments([
      segment(0, "first", 0, 4),
      segment(1, "second", 4.2, 6),
    ]);

    expect(presentation[1]!.start).toBe(4);
  });

  it("uses the shorter AMLL overlap advance for overlapping lines", () => {
    const presentation = buildPresentationSegments([
      segment(0, "first", 0, 10),
      segment(1, "overlap", 8, 12),
    ]);

    expect(presentation[1]!.start).toBe(
      8 - OVERLAP_PRESENTATION_LEAD_IN_SECONDS,
    );
  });

  it("leaves blank rows authored and excludes them from lead-in boundaries", () => {
    const presentation = buildPresentationSegments([
      segment(0, "first", 0, 2),
      segment(1, "   ", 10, 11.8),
      segment(2, "second", 12, 14),
    ]);

    expect(presentation[1]!.start).toBe(10);
    expect(presentation[2]!.start).toBe(12 - PRESENTATION_LEAD_IN_SECONDS);
  });

  it("leaves authored timestamps available for the fixed dot countdown", () => {
    const authored = [segment(0, "first", 0, 2), segment(1, "second", 10, 12)];
    const presentation = buildPresentationSegments(authored);
    const gaps = findInterludeGaps(
      authored.map(({ startTime, endTime, content }) => ({
        startTime,
        endTime,
        content,
      })),
    );

    expect(presentation[1]!.start).toBe(9.4);
    expect(gaps[0]!.endTime).toBe(9.75);
  });
});
