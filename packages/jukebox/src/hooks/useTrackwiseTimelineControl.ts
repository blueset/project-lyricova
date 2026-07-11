import type { RefObject } from "react";
import { useEffect } from "react";
import type { PlaybackSnapshot, PlayerState } from "./types";
import { readPlaybackSnapshot } from "./useMediaClock";

type Timeline = gsap.core.Timeline;

/**
 * Seek a GSAP timeline to a media snapshot and match its rate and play state.
 *
 * @param offset Seconds to subtract when the timeline is local to a segment.
 */
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
 * Synchronize a track-wide GSAP timeline with the media element.
 *
 * `playerState` invalidates the effect, while the media element remains the
 * source of truth for the exact time, playback rate, and paused state.
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
