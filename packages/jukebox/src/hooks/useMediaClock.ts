import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import type { PlaybackSnapshot } from "./types";

const MEDIA_EVENTS: (keyof HTMLMediaElementEventMap)[] = [
  "durationchange",
  "emptied",
  "loadedmetadata",
  "canplay",
  "pause",
  "play",
  "playing",
  "ratechange",
  "seeked",
  "seeking",
  "stalled",
  "timeupdate",
  "waiting",
];

export function readPlaybackSnapshot(
  player: HTMLMediaElement,
): PlaybackSnapshot {
  return {
    currentTime: Number.isFinite(player.currentTime) ? player.currentTime : 0,
    duration: player.duration,
    playbackRate: player.playbackRate,
    state:
      player.paused ||
      player.ended ||
      player.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
        ? "paused"
        : "playing",
  };
}

export function findActiveKeyframeIndex(
  startTimes: readonly number[],
  currentTime: number,
): number {
  let low = 0;
  let high = startTimes.length;

  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (startTimes[middle]! <= currentTime) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low - 1;
}

export function useMediaClock(
  playerRef: RefObject<HTMLMediaElement | null>,
  onSnapshot: (snapshot: PlaybackSnapshot) => void,
  { animationFrames = true }: { animationFrames?: boolean } = {},
) {
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    let animationFrame: number | null = null;

    const emit = () => {
      const snapshot = readPlaybackSnapshot(player);
      onSnapshotRef.current(snapshot);
      return snapshot;
    };
    const stopAnimationFrames = () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };
    const onAnimationFrame = () => {
      animationFrame = null;
      const snapshot = emit();
      if (snapshot.state === "playing") {
        animationFrame = requestAnimationFrame(onAnimationFrame);
      }
    };
    const startAnimationFrames = () => {
      if (
        animationFrames &&
        animationFrame === null &&
        readPlaybackSnapshot(player).state === "playing"
      ) {
        animationFrame = requestAnimationFrame(onAnimationFrame);
      }
    };
    const synchronize = () => {
      const snapshot = emit();
      if (snapshot.state === "paused") {
        stopAnimationFrames();
      } else {
        startAnimationFrames();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") synchronize();
    };

    MEDIA_EVENTS.forEach((event) =>
      player.addEventListener(event, synchronize),
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    synchronize();

    return () => {
      stopAnimationFrames();
      MEDIA_EVENTS.forEach((event) =>
        player.removeEventListener(event, synchronize),
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [animationFrames, playerRef]);
}
