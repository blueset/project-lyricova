import type { RefObject } from "react";
import { useEffect } from "react";
import type { PlaybackSnapshot, PlayerState } from "./types";
import { readPlaybackSnapshot } from "./useMediaClock";

type Timeline = gsap.core.Timeline;

export function synchronizeGsapTimeline(
  timeline: Timeline,
  snapshot: PlaybackSnapshot,
  offset = 0,
) {
  const progress = snapshot.currentTime - offset;
  timeline.timeScale(snapshot.playbackRate);
  if (snapshot.state === "playing") {
    timeline.play(progress, false);
  } else {
    timeline.pause(progress, false);
  }
}

/**
 * Control a GSAP timeline which covers the entire track according to the player state.
 */
export function useTrackwiseTimelineControl(
  playerRef: RefObject<HTMLMediaElement>,
  playerState: PlayerState,
  timeline: Timeline | null,
) {
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !timeline) return;
    synchronizeGsapTimeline(timeline, readPlaybackSnapshot(player));
  }, [playerRef, playerState, timeline]);
}
