import _ from "lodash";
import { RefObject, useRef, useMemo, useCallback, useEffect } from "react";
import { PlayerLyricsKeyframe, PlayerLyricsState } from "./types";
import { useNamedState } from "./useNamedState";
import { usePlayerState } from "./usePlayerState";
import { usePlayerStateRAF } from "./usePlayerStateRAF";

/** Use player lyrics state backed by `requireAnimationFrame` */
export function usePlayerLyricsStateRAF<T>(
  keyframes: PlayerLyricsKeyframe<T>[],
  playerRef: RefObject<HTMLAudioElement>
): PlayerLyricsState<T> {
  const playerState = usePlayerState(playerRef);

  /**
   * Current frame can be anything in [-1, keyframe.length - 1].
   * -1 means before the first frame starts. Final frame lasts forever.
   */
  const [currentFrameId, setCurrentFrameId] = useNamedState(
    -1,
    "currentFrameId"
  );
  const currentFrameIdRef = useRef<number>();
  currentFrameIdRef.current = currentFrameId;

  /**
   * `endTimes[i + 1]` is when frame `i` ends, in seconds.
   * Last value is the end of the track.
   */
  const endTimes = useMemo(() => {
    const endTimes = [];
    keyframes.forEach((v, idx) => {
      endTimes[idx] = v.start;
    });

    if (playerRef.current)
      endTimes[keyframes.length] = playerRef.current.duration;
    else if (keyframes.length > 0)
      endTimes[keyframes.length] = keyframes[keyframes.length - 1].start + 10;
    else endTimes[keyframes.length] = 0;

    return endTimes;
  }, [keyframes, playerRef]);

  const startTimes = useMemo(() => keyframes.map((v) => v.start), [keyframes]);

  // Advance a frame when the current frame ends
  const onFrame = useCallback(
    (time: number) => {
      const currentFrameId = currentFrameIdRef.current;
      const end = endTimes[currentFrameId + 1];

      if (time > end) {
        setCurrentFrameId(currentFrameId + 1);
      }
    },
    [endTimes, setCurrentFrameId]
  );

  usePlayerStateRAF(playerRef, onFrame);

  // Search for the frame for current time
  const restartFrameCallback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    // Find current frame
    setCurrentFrameId(_.sortedLastIndex(startTimes, player.currentTime) - 1);
  }, [playerRef, setCurrentFrameId, startTimes]);

  useEffect(() => restartFrameCallback(), [playerState, restartFrameCallback]);

  return {
    playerState,
    currentFrameId,
    currentFrame: currentFrameId >= 0 ? keyframes[currentFrameId] : null,
    endTime: endTimes[currentFrameId + 1],
    startTimes,
    endTimes,
  };
}