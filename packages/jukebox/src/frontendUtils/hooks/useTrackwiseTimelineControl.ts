import { useEffect } from "react";
import { PlayerState } from "./types";

type Timeline = gsap.core.Timeline;

/**
 * Control a GSAP timeline which covers the entire track according to the player state.
 */
export function useTrackwiseTimelineControl(
  playerState: PlayerState,
  timeline: Timeline
) {
  // Controls the progress of timeline
  useEffect(() => {
    const now = performance.now();
    if (!timeline) return;
    if (playerState.state === "playing") {
      const progress = (now - playerState.startingAt) / 1000;
      timeline.play(progress, false);
    } else {
      timeline.pause(playerState.progress, false);
    }
  }, [playerState, timeline]);

  // Kill a timeline when its lifespan ends.
  useEffect(() => {
    const tl = timeline;
    if (!tl) return;
    return () => {
      tl.kill();
    };
  }, [timeline]);
}