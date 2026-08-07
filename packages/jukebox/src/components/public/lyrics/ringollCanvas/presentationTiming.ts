import type { LyricsSegment } from "../../../../hooks/useActiveLyricsRanges";
import type { GlyphLyricSegment } from "../glyph/lyricSegments";

/** Normal lead-in for a line that originally follows a gap, in seconds. */
export const PRESENTATION_LEAD_IN_SECONDS = 0.6;
/** Lead-in attempted when a line already overlaps the previous line. */
export const OVERLAP_PRESENTATION_LEAD_IN_SECONDS = 0.4;
/** Earliest overlap boundary, as a fraction of the previous line's duration. */
export const OVERLAP_SAFE_BOUNDARY_RATIO = 0.3;

function hasContent(segment: GlyphLyricSegment): boolean {
  return segment.content.trim().length > 0;
}

/**
 * Builds AMLL-style presentation timing without mutating authored timestamps.
 *
 * Only non-empty lines participate in the lead-in calculation. Blank rows keep
 * their authored schedule and do not constrain the surrounding visible lines,
 * matching Ringoll's treatment of them as instrumental gap content.
 */
export function buildPresentationSegments(
  segments: readonly GlyphLyricSegment[],
): LyricsSegment[] {
  const presentation = segments.map((segment) => ({
    lineIndex: segment.lineIndex,
    start: segment.startTime,
    end: segment.endTime,
  }));

  let previousStart = 0;
  let previousEnd = 0;
  let previousGroupStart = 0;
  let previousGroupEnd = 0;
  let hasPrevious = false;

  segments.forEach((segment, index) => {
    if (!hasContent(segment)) return;

    const originalStart = segment.startTime;
    const originalEnd = segment.endTime;
    if (
      !Number.isFinite(originalStart) ||
      !Number.isFinite(originalEnd) ||
      originalEnd < originalStart
    ) {
      return;
    }

    let leadIn = PRESENTATION_LEAD_IN_SECONDS;
    let safeBoundary = 0;
    if (hasPrevious) {
      if (originalStart >= previousEnd) {
        safeBoundary = previousGroupEnd;
      } else {
        leadIn = OVERLAP_PRESENTATION_LEAD_IN_SECONDS;
        safeBoundary =
          previousStart +
          (previousEnd - previousStart) * OVERLAP_SAFE_BOUNDARY_RATIO;
      }
    }

    presentation[index]!.start = Math.min(
      originalStart,
      Math.max(safeBoundary, originalStart - leadIn),
    );

    if (hasPrevious) {
      const overlapsPreviousGroup =
        originalStart < previousGroupEnd && originalEnd > previousGroupStart;
      if (overlapsPreviousGroup) {
        previousGroupStart = Math.min(previousGroupStart, originalStart);
        previousGroupEnd = Math.max(previousGroupEnd, originalEnd);
      } else {
        previousGroupStart = originalStart;
        previousGroupEnd = originalEnd;
      }
    } else {
      previousGroupStart = originalStart;
      previousGroupEnd = originalEnd;
    }

    previousStart = originalStart;
    previousEnd = originalEnd;
    hasPrevious = true;
  });

  return presentation;
}
