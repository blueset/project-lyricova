import type { RefObject } from "react";
import type { PlayerState } from "./types";
import { useNamedState } from "./useNamedState";
import { useMediaClock } from "./useMediaClock";

/**
 * Derive stable paused or playing state from an audio element's media clock.
 *
 * Paused state preserves exact progress and playback rate; playing state uses
 * a performance-time origin while suppressing insignificant event updates.
 */
export function usePlayerState(playerRef: RefObject<HTMLAudioElement>) {
  const [playerState, setPlayerState] = useNamedState<PlayerState>(
    { state: "paused", progress: 0, rate: 1 },
    "playerState",
  );

  useMediaClock(
    playerRef,
    (snapshot) => {
      if (snapshot.state === "paused") {
        setPlayerState((value) => {
          if (
            value.state === "paused" &&
            Math.abs(value.progress - snapshot.currentTime) < 0.01 &&
            value.rate === snapshot.playbackRate
          ) {
            return value;
          }
          return {
            state: "paused",
            progress: snapshot.currentTime,
            rate: snapshot.playbackRate,
          };
        });
        return;
      }

      const rate = snapshot.playbackRate;
      const startingAt =
        performance.now() - (snapshot.currentTime * 1000) / rate;
      setPlayerState((v) => {
        if (
          v.state === "playing" &&
          Math.abs(v.startingAt - startingAt) < 100 &&
          v.rate === rate
        ) {
          return v;
        }
        return { state: "playing", startingAt, rate };
      });
    },
    { animationFrames: false },
  );

  return playerState;
}
