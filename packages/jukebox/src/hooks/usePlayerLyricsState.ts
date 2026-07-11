import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerLyricsKeyframe, PlayerLyricsState } from "./types";
import { useNamedState } from "./useNamedState";
import { usePlayerState } from "./usePlayerState";
import {
  findActiveKeyframeIndex,
  readPlaybackSnapshot,
  useMediaClock,
} from "./useMediaClock";

/** Select the current lyrics frame from the media element's playback clock. */
export function usePlayerLyricsState<T>(
  keyframes: PlayerLyricsKeyframe<T>[],
  playerRef: RefObject<HTMLAudioElement>,
): PlayerLyricsState<T> {
  const playerState = usePlayerState(playerRef);

  /**
   * Current frame can be anything in [-1, keyframe.length - 1].
   * -1 means before the first frame starts. Final frame lasts forever.
   */
  const [currentFrameId, setCurrentFrameId] = useNamedState(
    -1,
    "currentFrameId",
  );
  const [mediaDuration, setMediaDuration] = useState(() => {
    const duration = playerRef.current?.duration;
    return duration !== undefined && Number.isFinite(duration)
      ? duration
      : null;
  });

  /**
   * `endTimes[i + 1]` is when frame `i` ends, in seconds.
   * Last value is the end of the track.
   */
  const endTimes = useMemo(() => {
    const endTimes = [];
    keyframes.forEach((v, idx) => {
      endTimes[idx] = v.start;
    });

    if (mediaDuration !== null) endTimes[keyframes.length] = mediaDuration;
    else if (keyframes.length > 0)
      endTimes[keyframes.length] = keyframes[keyframes.length - 1]!.start + 10;
    else endTimes[keyframes.length] = 0;

    return endTimes;
  }, [keyframes, mediaDuration]);

  const startTimes = useMemo(() => keyframes.map((v) => v.start), [keyframes]);
  const schedulableKeyframes = useMemo(
    () =>
      startTimes
        .map((start, index) => ({ index, start }))
        .filter(({ start }) => Number.isFinite(start))
        .toSorted(
          (left, right) => left.start - right.start || left.index - right.index,
        ),
    [startTimes],
  );
  const schedulableStartTimes = useMemo(
    () => schedulableKeyframes.map(({ start }) => start),
    [schedulableKeyframes],
  );

  const synchronizeFrame = useCallback(
    (snapshot: ReturnType<typeof readPlaybackSnapshot>) => {
      if (Number.isFinite(snapshot.duration)) {
        setMediaDuration((duration) =>
          duration === snapshot.duration ? duration : snapshot.duration,
        );
      }

      const scheduleIndex = findActiveKeyframeIndex(
        schedulableStartTimes,
        snapshot.currentTime,
      );
      const nextFrameId =
        scheduleIndex >= 0
          ? (schedulableKeyframes[scheduleIndex]?.index ?? -1)
          : -1;
      setCurrentFrameId((frameId) =>
        frameId === nextFrameId ? frameId : nextFrameId,
      );
    },
    [schedulableKeyframes, schedulableStartTimes, setCurrentFrameId],
  );
  useMediaClock(playerRef, synchronizeFrame);
  useEffect(() => {
    const player = playerRef.current;
    if (player) synchronizeFrame(readPlaybackSnapshot(player));
  }, [playerRef, synchronizeFrame]);

  return {
    playerState,
    currentFrameId,
    currentFrame:
      currentFrameId >= 0 ? (keyframes[currentFrameId] ?? null) : null,
    endTime: endTimes[currentFrameId + 1] ?? 0,
    startTimes,
    endTimes,
  };
}
