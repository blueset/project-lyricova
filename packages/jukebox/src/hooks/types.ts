import type { LyricsKitLyrics } from "../graphql/LyricsKitObjects";

export type LyricsFrameCallback = (
  thisLine: number,
  lyrics: LyricsKitLyrics,
  player: HTMLAudioElement,
  start: number | null,
  end: number | null
) => void;

export type PlayerState =
  | {
      state: "playing";
      /**
       * `performance.now()` formatted number (millisecond) adjusted the progress music.
       *
       * e.g. `performance.now() - (player.currentTime * 1000)`.
       */
      startingAt: number;
      /** Playback rate of the player, defaulted to 1. */
      rate: number;
    }
  | {
      state: "paused";
      /** Progress of the current player (seconds). */
      progress: number;
    };

export interface PlayerLyricsKeyframe<T> {
  /** Start of the frame, in seconds. */
  start: number;
  data: T;
}

export interface PlayerLyricsState<T> {
  playerState: PlayerState;
  /**
   * Current frame can be anything in [-1, keyframe.length - 1].
   * -1 means before the first frame starts. Final frame lasts forever.
   */
  currentFrameId: number;
  /** The current frame content. `null` when frame ID is -1. */
  currentFrame: null | PlayerLyricsKeyframe<T>;
  /** End time of current frame (in seconds). End of track for the last frame. */
  endTime: number;
  /** `startTimes[i]` is when frame `i` starts, in seconds. */
  startTimes: number[];
  /**
   * `endTimes[i + 1]` is when frame `i` ends, in seconds.
   * Last value is the end of the track.
   */
  endTimes: number[];
}

export type WebAudioPlayerState = {
  rate: number;
} & (
  | {
      state: "playing";
      startingOffset: number;
      bufferSource: AudioBufferSourceNode;
    }
  | { state: "paused"; progress: number }
);