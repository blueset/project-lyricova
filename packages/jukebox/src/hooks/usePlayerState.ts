import { RefObject, useCallback, useEffect, useRef } from "react";
import type { PlayerState } from "./types";
import { useNamedState } from "./useNamedState";

export function usePlayerState(playerRef: RefObject<HTMLAudioElement>) {
  const [playerState, setPlayerState] = useNamedState<PlayerState>(
    { state: "paused", progress: 0 },
    "playerState"
  );
  const playerStateRef = useRef<PlayerState>(playerState);
  playerStateRef.current = playerState;

  const updatePlayerState = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) {
      setPlayerState((v) => {
        if (
          v.state === "paused" &&
          Math.abs(v.progress - player.currentTime) < 0.01
        ) {
          return v;
        }
        return { state: "paused", progress: player.currentTime };
      });
    } else {
      const rate = player.playbackRate;
      const startingAt = performance.now() - (player.currentTime * 1000) / rate;
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
    }
  }, [playerRef, setPlayerState]);

  // Register event listeners
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.addEventListener("play", updatePlayerState);
    player.addEventListener("timeupdate", updatePlayerState);
    player.addEventListener("pause", updatePlayerState);
    player.addEventListener("seeked", updatePlayerState);
    player.addEventListener("ratechange", updatePlayerState);
    updatePlayerState();

    return () => {
      player.removeEventListener("play", updatePlayerState);
      player.removeEventListener("timeupdate", updatePlayerState);
      player.removeEventListener("pause", updatePlayerState);
      player.removeEventListener("seeked", updatePlayerState);
      player.removeEventListener("ratechange", updatePlayerState);
    };
  }, [playerRef, updatePlayerState]);

  return playerState;
}
