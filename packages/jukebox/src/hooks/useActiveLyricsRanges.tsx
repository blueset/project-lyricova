import { usePlayerLyricsState } from "./usePlayerLyricsState";
import type { PlayerLyricsKeyframe, PlayerLyricsState } from "./types";
import type { LyricsKitLyricsLine } from "@lyricova/components/gql/schema";
import type { RefObject } from "react";
import { useMemo } from "react";
import type { LyricsLine } from "lyrics-kit/core";

export interface LyricsSegment {
  /** Index of the line after the input has been sorted by `position`. */
  lineIndex: number;
  /** Inclusive segment start time, in seconds. */
  start: number;
  /** Segment end time, in seconds. Always greater than or equal to `start`. */
  end: number;
}

interface LyricsKeyframeInfo {
  /** Line indexes whose segments include the current playback time. */
  activeSegments: number[];
  /** Inclusive start of the cumulative line range to render. */
  rangeStart: number;
  /** Exclusive end of the cumulative line range to render. */
  rangeEnd: number;
}

/**
 * Convert lyric lines into playback segments ordered by start time, then end
 * time.
 *
 * Lines are first ordered by `position`, so each returned `lineIndex` refers
 * to that ordered list rather than the original input order. A segment starts
 * at the line position (or at zero when the position is `NaN`) and ends at the
 * last attached time tag, the next line's position, or one second after its
 * start, in that order of availability. End times are clamped to the segment
 * start so malformed timing data cannot produce a negative duration.
 *
 * @param lines Lyric lines containing absolute line positions and optional
 * word-level time tags.
 * @returns A new array of normalized playback segments. The input is not
 * mutated.
 */
export function lyricsToSegments(
  lines: LyricsKitLyricsLine[] | LyricsLine[],
): LyricsSegment[] {
  const segments: LyricsSegment[] = lines
    .toSorted((a, b) => a.position - b.position)
    .map((line, index, lines) => {
      const start = Number.isNaN(line.position) ? 0 : line.position;
      const lastTag = line.attachments?.timeTag?.tags?.at(-1);
      const nextLine = lines[index + 1];
      const end = Math.max(
        lastTag
          ? start + lastTag.timeTag
          : nextLine
            ? nextLine.position
            : start + 1,
        start,
      );
      return {
        lineIndex: index,
        start,
        end,
      };
    });
  segments.sort((a, b) =>
    a.start !== b.start ? a.start - b.start : a.end - b.end,
  );
  return segments;
}

/**
 * Build timeline keyframes from segment start and end events.
 *
 * Each keyframe records the line indexes active at that instant and a
 * half-open `[rangeStart, rangeEnd)` window suitable for rendering or
 * virtualizing lyrics. The range advances monotonically as playback moves
 * through the timeline; it is not limited to the currently active segments.
 * Events sharing a timestamp are folded into a single keyframe.
 */
function segmentsToKeyframes(
  segments: LyricsSegment[],
): PlayerLyricsKeyframe<LyricsKeyframeInfo>[] {
  const START = 0,
    END = 1;
  const actions = segments.flatMap((segment) => [
    { time: segment.start, action: START, lineIndex: segment.lineIndex },
    { time: segment.end, action: END, lineIndex: segment.lineIndex },
  ]);
  actions.sort((a, b) => a.time - b.time);

  const keyframes: PlayerLyricsKeyframe<LyricsKeyframeInfo>[] = [];
  actions.forEach(({ time, lineIndex, action }) => {
    if (keyframes.length && keyframes[keyframes.length - 1]!.start === time) {
      // If the keyframe already exists at the same time, update the keyframe.
      const lastKeyFrame = keyframes[keyframes.length - 1]!;
      if (action === START) {
        lastKeyFrame.data.activeSegments.push(lineIndex);
        lastKeyFrame.data.rangeEnd = lineIndex + 1;
        if (lastKeyFrame.data.activeSegments.length === 1) {
          lastKeyFrame.data.rangeStart = lineIndex;
        }
      } else {
        lastKeyFrame.data.activeSegments =
          lastKeyFrame.data.activeSegments.filter(
            (index) => index !== lineIndex,
          );
        lastKeyFrame.data.rangeStart = Math.max(
          lastKeyFrame.data.rangeStart,
          lastKeyFrame.data.activeSegments?.[0] ?? lineIndex + 1,
        );
      }
    } else {
      // If the keyframe does not exist at the same time, create a new keyframe.
      let lastKeyframeIndexes = keyframes.length
        ? [...keyframes[keyframes.length - 1]!.data.activeSegments]
        : [];
      let rangeStart = keyframes.at(-1)?.data.rangeStart ?? 0;
      let rangeEnd = keyframes.at(-1)?.data.rangeEnd ?? 1;
      if (action === START) {
        lastKeyframeIndexes.push(lineIndex);
        rangeStart = Math.max(rangeStart, lastKeyframeIndexes[0] ?? lineIndex);
        rangeEnd = Math.max(rangeEnd, lineIndex + 1);
      } else {
        lastKeyframeIndexes = lastKeyframeIndexes.filter(
          (index) => index !== lineIndex,
        );
        rangeStart = Math.max(
          rangeStart,
          lastKeyframeIndexes[0] ?? lineIndex + 1,
        );
        rangeEnd = Math.max(
          rangeEnd,
          (lastKeyframeIndexes.at(-1) ?? 0) + 1,
          rangeStart + 1,
        );
      }
      keyframes.push({
        start: time,
        data: {
          activeSegments: lastKeyframeIndexes,
          rangeStart,
          rangeEnd,
        },
      });
    }
  });

  return keyframes;
}

/**
 * Track the active lyric segments and render range for an audio element.
 *
 * Segment keyframes are recomputed only when the `segments` array identity
 * changes. The returned frame data contains active segment indexes and the
 * cumulative half-open range of line indexes to render.
 *
 * @param segments Timed lyric segments, with `lineIndex` values matching the
 * consumer's line order.
 * @param playerRef Ref to the audio element that supplies the playback clock.
 * @returns The current player-driven keyframe state together with the same
 * `segments` array.
 */
export function useActiveLyricsSegmentRanges(
  segments: LyricsSegment[],
  playerRef: RefObject<HTMLAudioElement>,
): PlayerLyricsState<LyricsKeyframeInfo> & { segments: LyricsSegment[] } {
  const keyframes = useMemo(() => segmentsToKeyframes(segments), [segments]);
  const result = usePlayerLyricsState(keyframes, playerRef);
  return { segments, ...result };
}

/**
 * Convert lyric lines to segments and track their active playback range.
 *
 * Conversion is recomputed only when the `lines` array identity changes. The
 * returned segments use indexes from the position-sorted line order; callers
 * should use that same ordering when resolving frame indexes back to lines.
 *
 * @param lines Lyric lines to normalize and synchronize with playback.
 * @param playerRef Ref to the audio element that supplies the playback clock.
 * @returns The current player-driven keyframe state and normalized segments.
 */
export function useActiveLyrcsRanges(
  lines: LyricsKitLyricsLine[] | LyricsLine[],
  playerRef: RefObject<HTMLAudioElement>,
): PlayerLyricsState<LyricsKeyframeInfo> & { segments: LyricsSegment[] } {
  const segments = useMemo(() => lyricsToSegments(lines), [lines]);
  return useActiveLyricsSegmentRanges(segments, playerRef);
}
