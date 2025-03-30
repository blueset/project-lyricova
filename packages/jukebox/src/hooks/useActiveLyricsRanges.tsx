import { usePlayerLyricsState } from "./usePlayerLyricsState";
import type { PlayerLyricsKeyframe, PlayerLyricsState } from "./types";
import type { LyricsKitLyricsLine } from "@lyricova/api/graphql/types";
import { RefObject, useMemo } from "react";
import type { LyricsLine } from "lyrics-kit/core";

export interface LyricsSegment {
  lineIndex: number;
  /** start time in seconds */
  start: number;
  /** end time in seconds */
  end: number;
}

interface LyricsKeyframeInfo {
  activeSegments: number[];
  rangeStart: number;
  rangeEnd: number;
}

/** Convert lyrics to time segments, and sort by start the end time. */
export function lyricsToSegments(
  lines: LyricsKitLyricsLine[] | LyricsLine[]
): LyricsSegment[] {
  const segments: LyricsSegment[] = lines
    .toSorted((a, b) => a.position - b.position)
    .map((line, index, lines) => {
      const start = line.position;
      const end = Math.max(
        line.attachments?.timeTag?.tags?.length
          ? start + line.attachments.timeTag.tags.at(-1).timeTag
          : index + 1 < lines.length
          ? lines[index + 1].position
          : start + 1,
        start
      );
      return {
        lineIndex: index,
        start,
        end,
      };
    });
  segments.sort((a, b) =>
    a.start !== b.start ? a.start - b.start : a.end - b.end
  );
  return segments;
}

/** convert segments to a list of keyframes where the data is the array of line IDs in the keyframe. */
export function segmentsToKeyframes(
  segments: LyricsSegment[]
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
    if (keyframes.length && keyframes.at(-1).start === time) {
      // If the keyframe already exists at the same time, update the keyframe.
      const lastKeyFrame = keyframes.at(-1);
      if (action === START) {
        lastKeyFrame.data.activeSegments.push(lineIndex);
        lastKeyFrame.data.rangeEnd = lineIndex + 1;
        if (lastKeyFrame.data.activeSegments.length === 1) {
          lastKeyFrame.data.rangeStart = lineIndex;
        }
      } else {
        lastKeyFrame.data.activeSegments =
          lastKeyFrame.data.activeSegments.filter(
            (index) => index !== lineIndex
          );
        lastKeyFrame.data.rangeStart = Math.max(
          lastKeyFrame.data.rangeStart,
          lastKeyFrame.data.activeSegments?.[0] ?? lineIndex + 1
        );
      }
    } else {
      // If the keyframe does not exist at the same time, create a new keyframe.
      let lastKeyframeIndexes = keyframes.length
        ? [...keyframes.at(-1).data.activeSegments]
        : [];
      let rangeStart = keyframes.at(-1)?.data.rangeStart ?? 0;
      let rangeEnd = keyframes.at(-1)?.data.rangeEnd ?? 1;
      if (action === START) {
        lastKeyframeIndexes.push(lineIndex);
        rangeStart = Math.max(rangeStart, lastKeyframeIndexes[0]);
        rangeEnd = Math.max(rangeEnd, lineIndex + 1);
      } else {
        lastKeyframeIndexes = lastKeyframeIndexes.filter(
          (index) => index !== lineIndex
        );
        // rangeStart = Math.max(rangeStart, (lastKeyframeIndexes[0] ?? lineIndex + 1));
        rangeEnd = Math.max(
          rangeEnd,
          (lastKeyframeIndexes.at(-1) ?? 0) + 1,
          rangeStart + 1
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

export function useActiveLyrcsRanges(
  lines: LyricsKitLyricsLine[] | LyricsLine[],
  playerRef: RefObject<HTMLAudioElement>
): PlayerLyricsState<LyricsKeyframeInfo> & { segments: LyricsSegment[] } {
  const { segments, keyframes } = useMemo(() => {
    const segments = lyricsToSegments(lines);
    const keyframes = segmentsToKeyframes(segments);
    // console.log("segments:", segments, ", keyframes:", keyframes);
    return { segments, keyframes };
  }, [lines]);
  const result = usePlayerLyricsState(keyframes, playerRef);
  // console.log("useActiveLyrcsRange result:", result.currentFrame?.data?.activeSegments, ", rangeStart:", result.currentFrame?.data?.rangeStart, ", rangeEnd:", result.currentFrame?.data?.rangeEnd);
  return { segments, ...result };
}
