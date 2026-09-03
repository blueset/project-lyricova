import type { RefObject } from "react";
import { useEffect } from "react";
import type { PlaybackSnapshot, PlayerState } from "./types";
import { readPlaybackSnapshot, useMediaClock } from "./useMediaClock";

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
 * Seek a GSAP timeline from media-clock snapshots without starting GSAP's
 * opener-window ticker.
 */
export function seekGsapTimeline(
  timeline: Timeline,
  snapshot: PlaybackSnapshot,
  offset = 0,
) {
  timeline.timeScale(snapshot.playbackRate);
  timeline.pause(snapshot.currentTime - offset, false);
}

/**
 * Drive a track-wide GSAP timeline directly from the media element.
 *
 * The timeline stays paused and is sought on the active presentation window's
 * media-clock frames, so a visible PiP window does not depend on the opener's
 * potentially throttled GSAP ticker.
 */
export function useTrackwiseTimelineControl(
  playerRef: RefObject<HTMLMediaElement>,
  playerState: PlayerState,
  timeline: Timeline | null,
) {
  useMediaClock(
    playerRef,
    (snapshot) => {
      if (timeline) seekGsapTimeline(timeline, snapshot);
    },
    { animationFrames: timeline !== null },
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !timeline) return;
    seekGsapTimeline(timeline, readPlaybackSnapshot(player));
  }, [playerRef, playerState, timeline]);
}
