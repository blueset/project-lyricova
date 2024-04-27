import { RefObject, useRef, useCallback, useEffect } from "react";
import { PlayerState } from "./types";
import { usePlayerState } from "./usePlayerState";

export function usePlayerStateRAF(
  playerRef: RefObject<HTMLAudioElement>,
  callback: (time: number, state: "playing" | "paused") => void
) {
  const playerState = usePlayerState(playerRef);
  const playerStateRef = useRef<PlayerState>();
  playerStateRef.current = playerState;

  const frameCallbackRef = useRef<number>();
  
  // Added to prevent operation on unmounted components
  const thisLifespan = useRef<boolean>();

  // Advance a frame when the current frame ends
  const onFrame = useCallback(
    (timestamp: number) => {
      // Out of current lifespan, stop.
      if (!thisLifespan.current) return;

      const playerState = playerStateRef.current;

      let time;
      if (playerState.state === "paused") {
        time = playerState.progress;
      } else {
        time = (timestamp - playerState.startingAt) / 1000;
      }

      callback(time, playerState.state);

      if (playerState.state === "playing") {
        frameCallbackRef.current = requestAnimationFrame(onFrame);
      }
    },
    [callback]
  );

  // Search for the frame for current time
  const restartFrameCallback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    // Clear existing loop.
    if (frameCallbackRef.current !== null) {
      cancelAnimationFrame(frameCallbackRef.current);
    }

    // Start a new loop.
    frameCallbackRef.current = requestAnimationFrame(onFrame);
  }, [onFrame, playerRef]);

  useEffect(() => restartFrameCallback(), [playerState, restartFrameCallback]);

  // Update this lifespan
  useEffect(() => {
    thisLifespan.current = true;

    return () => {
      thisLifespan.current = false;
    };
  }, [playerRef]);
}
