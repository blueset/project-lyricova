import {
  PlayerLyricsKeyframe,
  usePlayerLyricsState,
} from "../../../../frontendUtils/hooks";
import type {
  LyricsKitLyricsLine,
} from "../../../../graphql/LyricsKitObjects";
import { RefObject, useMemo } from "react";

interface LyricsSegments {
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
  lines: LyricsKitLyricsLine[]
): LyricsSegments[] {
  const segments: LyricsSegments[] = lines.map((line, index, lines) => {
    const start = line.position;
    const end = line.attachments?.timeTag?.tags?.length
      ? start + line.attachments.timeTag.tags.at(-1).timeTag
      : index + 1 < lines.length
      ? lines[index + 1].position
      : start + 1;
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
  segments: LyricsSegments[]
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
      } else {
        lastKeyFrame.data.activeSegments =
          lastKeyFrame.data.activeSegments.filter(
            (index) => index !== lineIndex
          );
        lastKeyFrame.data.rangeStart = Math.max(lastKeyFrame.data.rangeStart, lastKeyFrame.data.activeSegments?.[0] ?? (lineIndex + 1));
      }
    } else {
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
        rangeStart = Math.max(rangeStart, (lastKeyframeIndexes[0] ?? lineIndex + 1));
        rangeEnd = Math.max(rangeEnd, (lastKeyframeIndexes.at(-1) ?? 0) + 1, rangeStart + 1);
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

export function useActiveLyrcsRange(
  lines: LyricsKitLyricsLine[],
  playerRef: RefObject<HTMLAudioElement>
) {
  const keyframes = useMemo(() => {
    const segments = lyricsToSegments(lines);
    const keyframes = segmentsToKeyframes(segments);
    console.log("segments:", segments, ", keyframes:", keyframes);
    return keyframes;
  }, [lines]);
  const result = usePlayerLyricsState(keyframes, playerRef);
  // console.log("useActiveLyrcsRange result:", result.currentFrame?.data?.activeSegments, ", rangeStart:", result.currentFrame?.data?.rangeStart, ", rangeEnd:", result.currentFrame?.data?.rangeEnd);
  return result;
}
