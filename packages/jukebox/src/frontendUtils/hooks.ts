import { useState, useDebugValue, useEffect, RefObject, useCallback, useRef, useMemo } from "react";
import { LyricsKitLyrics, LyricsKitLyricsLine } from "../graphql/LyricsKitObjects";
import _ from "lodash";
import { AnimatedWord } from "../utils/typingSequence";
import { gql, QueryResult, useQuery } from "@apollo/client";
import gsap from "gsap";
import { TextPlugin } from "gsap/dist/TextPlugin";

type Timeline = gsap.core.Timeline;

export function useNamedState<T>(initialValue: T, name: string) {
  const ret = useState<T>(initialValue);
  useDebugValue(`${name}: ${ret[0]}`);
  return ret;
}

export function getStartEnd(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, line: number): [number, number] {
  if (playerRef.current === null || lyrics.lines.length === 0) {
    return [null, null];
  }
  if (line === null || !lyrics.lines[line]) {
    if (lyrics?.lines?.length > 0) {
      return [0, lyrics.lines[0].position];
    }
    return [0, playerRef.current.duration];
  }
  if (line + 1 >= lyrics.lines.length) {
    return [lyrics.lines[line].position, playerRef.current.duration];
  }
  return [lyrics.lines[line].position, lyrics.lines[line + 1].position];
}

export type LyricsFrameCallback = (thisLine: number, lyrics: LyricsKitLyrics, player: HTMLAudioElement, start: number | null, end: number | null) => void;

export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, callback?: LyricsFrameCallback): number {
  const [line, setLine] = useNamedState<number | null>(null, "line");
  const lineRef = useRef<number>();
  lineRef.current = line;

  const onTimeUpdate = useCallback((recur: boolean = true) => {
    const player = playerRef.current;
    if (player !== null) {
      const time = player.currentTime;
      const [start, end] = getStartEnd(playerRef, lyrics, lineRef.current);
      if (start > time || time >= end) {
        const thisLineIndex = _.sortedIndexBy<{ position: number }>(lyrics.lines, { position: time }, "position");
        if (thisLineIndex === 0) {
          if (lineRef.current !== null) setLine(null);
          callback && callback(null, lyrics, player, start, end);
        } else {
          const thisLine =
            (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position > time) ?
              thisLineIndex - 1 :
              thisLineIndex;
          if (thisLine != lineRef.current) {
            setLine(thisLine);
          }
          callback && callback(thisLine, lyrics, player, start, end);
        }
      } else {
        callback && callback(lineRef.current, lyrics, player, start, end);
      }
      if (recur && !player.paused) {
        window.requestAnimationFrame(() => onTimeUpdate());
      }
    } else {
      setLine(null);
    }
  }, [playerRef, lyrics, lyrics.lines, callback]);

  const onPlay = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate());
  }, [playerRef, onTimeUpdate]);
  const onTimeChange = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate(/* recur */false));
  }, [playerRef, onTimeUpdate]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      onTimeUpdate();
      player.addEventListener("play", onPlay);
      player.addEventListener("timeupdate", onTimeChange);
      if (!player.paused) {
        onPlay();
      }
      return () => {
        player.removeEventListener("play", onPlay);
        player.removeEventListener("timeupdate", onTimeChange);
      };
    }
  }, [playerRef, onPlay, onTimeChange]);

  return line;
}

// region Refactored keyframe-based lyrics state

export type PlayerState = {
  state: "playing";
  /**
   * `performance.now()` formatted number (millisecond) adjusted the progress music.
   *
   * e.g. `performance.now() - (player.currentTime * 1000)`.
   */
  startingAt: number;
} | {
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


export function usePlayerState(playerRef: RefObject<HTMLAudioElement>) {
  const [playerState, setPlayerState] = useNamedState<PlayerState>({ state: "paused", progress: 0 }, "playerState");
  const playerStateRef = useRef<PlayerState>();
  playerStateRef.current = playerState;

  const updatePlayerState = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused) {
      setPlayerState({ state: "paused", progress: player.currentTime });
    } else {
      setPlayerState({ state: "playing", startingAt: performance.now() - (player.currentTime * 1000) });
    }
  }, [playerRef, setPlayerState]);

  // Register event listeners
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    player.addEventListener("play", updatePlayerState);
    player.addEventListener("pause", updatePlayerState);
    player.addEventListener("seeked", updatePlayerState);
    updatePlayerState();

    return () => {
      player.removeEventListener("play", updatePlayerState);
      player.removeEventListener("pause", updatePlayerState);
      player.removeEventListener("seeked", updatePlayerState);
    };
  }, [playerRef, updatePlayerState]);

  return playerState;
}

export function usePlayerLyricsState<T>(keyframes: PlayerLyricsKeyframe<T>[], playerRef: RefObject<HTMLAudioElement>): PlayerLyricsState<T> {
  const playerState = usePlayerState(playerRef);
  const playerStateRef = useRef<PlayerState>();
  playerStateRef.current = playerState;

  const frameCallbackRef = useRef<number>();

  // Added to prevent operation on unmounted components
  const thisLifespan = useRef<boolean>();

  /**
   * Current frame can be anything in [-1, keyframe.length - 1].
   * -1 means before the first frame starts. Final frame lasts forever.
   */
  const [currentFrameId, setCurrentFrameId] = useNamedState(-1, "currentFrameId");
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

    if (playerRef.current) endTimes[keyframes.length] = playerRef.current.duration;
    else if (keyframes.length > 0) endTimes[keyframes.length] = keyframes[keyframes.length - 1].start + 10;
    else endTimes[keyframes.length] = 0;

    return endTimes;
  }, [keyframes, playerRef]);

  const startTimes = useMemo(() => keyframes.map(v => v.start), [keyframes]);

  // Advance a frame when the current frame ends
  const onFrame = useCallback((timestamp: number) => {
    // Out of current lifespan, stop.
    if (!thisLifespan.current) return;

    const playerState = playerStateRef.current;
    const currentFrameId = currentFrameIdRef.current;
    const end = endTimes[currentFrameId + 1];

    let time;
    if (playerState.state === "paused") {
      time = playerState.progress;
    } else {
      time = (timestamp - playerState.startingAt) / 1000;
    }

    if (time > end) {
      setCurrentFrameId(currentFrameId + 1);
    }

    if (playerState.state === "playing") {
      frameCallbackRef.current = requestAnimationFrame(onFrame);
    }
  }, [endTimes, setCurrentFrameId]);

  // Search for the frame for current time
  const restartFrameCallback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    // Clear existing loop.
    if (frameCallbackRef.current !== null) {
      cancelAnimationFrame(frameCallbackRef.current);
    }
    // Find current frame
    setCurrentFrameId(_.sortedLastIndex(startTimes, player.currentTime) - 1);

    // Start a new loop.
    frameCallbackRef.current = requestAnimationFrame(onFrame);
  }, [onFrame, playerRef, setCurrentFrameId, startTimes]);

  useEffect(() => restartFrameCallback(), [playerState, restartFrameCallback]);

  // Update this lifespan
  useEffect(() => {
    thisLifespan.current = true;

    return () => {
      thisLifespan.current = false;
    };
  }, [playerRef]);

  return {
    playerState,
    currentFrameId,
    currentFrame: currentFrameId >= 0 ? keyframes[currentFrameId] : null,
    endTime: endTimes[currentFrameId + 1],
    startTimes,
    endTimes,
  };
}

export function usePlainPlayerLyricsState(lyrics: LyricsKitLyrics, playerRef: RefObject<HTMLAudioElement>): PlayerLyricsState<LyricsKitLyricsLine> {
  const keyFrames: PlayerLyricsKeyframe<LyricsKitLyricsLine>[] = useMemo(() => lyrics.lines.map(v => ({
    start: v.position,
    data: v
  })), [lyrics]);
  return usePlayerLyricsState<LyricsKitLyricsLine>(keyFrames, playerRef);
}

// endregion Refactored keyframe-based lyrics state

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!, $furigana: [[FuriganaLabel!]!]! = []) {
    transliterate(text: $text, furigana: $furigana) {
      text
      typingSequence {
        convert
        sequence
      }
    }
  }
`;

export interface SequenceQueryResult {
  transliterate: {
    text: string;
    typingSequence: AnimatedWord[][];
  };
}

/** Maximum time in second for one key stroke to take in the typing animation */
const LONGEST_STEP_SECONDS = 1;

interface LyricsSegmentStateResult {
  line: number | null;
  currentStep: number | null;
  sequenceQuery: QueryResult<SequenceQueryResult>;
}

interface PlayerLyricsTypingState extends PlayerLyricsState<LyricsKitLyricsLine> {
  sequenceQuery: QueryResult<SequenceQueryResult>;
  timeline: Timeline;
}

/**
 * State hook for typing lyrics animation
 * @param lyrics
 * @param playerRef
 * @param perLineThreshold Percentage of time for the animation to take per line of lyrics, (0, 1]
 * @param doneElementRef
 * @param typingElementRef
 */
export function usePlayerLyricsTypingState(
  lyrics: LyricsKitLyrics, playerRef: RefObject<HTMLAudioElement>, perLineThreshold: number,
  doneElementRef: RefObject<HTMLElement>, typingElementRef: RefObject<HTMLElement>
): PlayerLyricsTypingState {
  const state = usePlainPlayerLyricsState(lyrics, playerRef);
  const { playerState, startTimes, endTimes } = state;

  const sequenceQuery = useQuery<SequenceQueryResult>(
    SEQUENCE_QUERY,
    {
      variables: {
        text: useMemo(() => lyrics.lines.map((v) => v.content).join("\n"), [lyrics.lines]),
        furigana: lyrics.lines.map(v => v.attachments?.furigana?.map(
          ({ content, leftIndex, rightIndex }) => ({ content, leftIndex, rightIndex })
        ) ?? []),
      },
    }
  );

  const timeline = useMemo<Timeline>(() => {
    if (!sequenceQuery.data) return null;
    gsap.registerPlugin(TextPlugin);
    if (!doneElementRef.current || !typingElementRef.current) return null;
    const tl = gsap.timeline();
    sequenceQuery.data.transliterate.typingSequence.forEach((v, idx) => {
      const start = startTimes[idx], lineEnd = endTimes[idx + 1];
      if (start === undefined || lineEnd === undefined) return;
      const duration = Math.min((lineEnd - start) * perLineThreshold, v.length * LONGEST_STEP_SECONDS);

      const stepDuration = duration / Math.max(1, _.sum(v.map(w => w.sequence.length)));
      let typed = "", i = 0;
      for (const word of v) {
        if (word.convert) {
          for (const step of word.sequence) {
            tl.set(doneElementRef.current, { text: typed }, start + i * stepDuration);
            tl.set(typingElementRef.current, { text: step }, start + i * stepDuration);
            i++;
          }
        } else {
          for (const step of word.sequence) {
            tl.set(doneElementRef.current, { text: typed + step }, start + i * stepDuration);
            tl.set(typingElementRef.current, { text: "" }, start + i * stepDuration);
            i++;
          }
        }
        typed += word.sequence[word.sequence.length - 1];
      }
      tl.set(doneElementRef.current, { text: typed }, start + duration);
      tl.set(typingElementRef.current, { text: "" }, start + duration);
    });

    return tl;
  }, [doneElementRef.current, endTimes, perLineThreshold, sequenceQuery.data, startTimes, typingElementRef.current]);

  useTrackwiseTimelineControl(playerState, timeline);

  return { ...state, timeline, sequenceQuery };
}

export function useLyricsSegmentState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, perLineThreshold: number): LyricsSegmentStateResult {
  const [line, setLine] = useNamedState<number | null>(null, "line");
  const [currentStep, setCurrentStep] = useNamedState<number | null>(null, "line");
  const lineRef = useRef<number>();
  const currentStepRef = useRef<number>();
  lineRef.current = line;
  currentStepRef.current = currentStep;

  const sequenceQuery = useQuery<SequenceQueryResult>(
    SEQUENCE_QUERY,
    {
      variables: {
        text: useMemo(() => lyrics.lines.map((v) => v.content).join("\n"), [lyrics.lines]),
        furigana: []
      },
    }
  );

  const segmentSizes = useMemo(() => {
    if (!sequenceQuery.data) return null;
    return sequenceQuery.data.transliterate.typingSequence.map((v) =>
      _.sum(v.map((vv) => vv.sequence.length))
    );
  }, [sequenceQuery.data]);

  const segmentSizesRef = useRef<number[] | null>();
  segmentSizesRef.current = segmentSizes;

  const onTimeUpdate = useCallback((recur: boolean = true) => {
    const player = playerRef.current;
    const thisLine = lineRef.current;
    if (player !== null) {
      const time = player.currentTime;
      let [start, end] = getStartEnd(playerRef, lyrics, lineRef.current);
      if (start > time || time >= end) {
        const thisLineIndex = _.sortedIndexBy<{ position: number }>(lyrics.lines, { position: time }, "position");
        if (thisLineIndex === 0) {
          if (lineRef.current !== null) setLine(null);
          if (currentStep !== null) setCurrentStep(null);
        } else {
          // Set line index
          const thisLine =
            (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position > time) ?
              thisLineIndex - 1 :
              thisLineIndex;
          if (thisLine != lineRef.current) {
            setLine(thisLine);
          }

          [start, end] = getStartEnd(playerRef, lyrics, thisLine);
        }
      }

      // set segment index.
      if (segmentSizesRef.current && thisLine < segmentSizesRef.current.length) {
        const stepCount = segmentSizesRef.current[thisLine];
        // Correct end time to cap step length at LONGEST_STEP_SECONDS.
        const correctedEnd = (stepCount === 0 || (end - start) * perLineThreshold / stepCount > LONGEST_STEP_SECONDS) ?
          start + (stepCount * LONGEST_STEP_SECONDS) / perLineThreshold :
          end;
        const percentage = (time - start) / (correctedEnd - start);
        if (percentage >= perLineThreshold) {
          if (currentStepRef.current !== stepCount) {
            setCurrentStep(stepCount);
          }
        } else {
          // Get segment index
          // Math.floor((percentage / perLineThreshold) / segments.length)
          const index = Math.floor(percentage * stepCount / perLineThreshold);
          if (index !== currentStepRef.current) {
            setCurrentStep(index);
          }
        }
      }

      if (recur && !player.paused) {
        window.requestAnimationFrame(() => onTimeUpdate());
      }
    } else {
      setLine(null);
    }
  }, [playerRef, lyrics]);

  const onPlay = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate());
  }, [playerRef, onTimeUpdate]);
  const onTimeChange = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate(/* recur */false));
  }, [playerRef, onTimeUpdate]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      onTimeUpdate();
      player.addEventListener("play", onPlay);
      player.addEventListener("timeupdate", onTimeChange);
      if (!player.paused) {
        onPlay();
      }
      return () => {
        player.removeEventListener("play", onPlay);
        player.removeEventListener("timeupdate", onTimeChange);
      };
    }
  }, [playerRef, lyrics.lines]);

  return { line, currentStep, sequenceQuery };
}

/**
 * Control a GSAP timeline which covers the entire track according to the player state.
 */
export function useTrackwiseTimelineControl(playerState: PlayerState, timeline: Timeline) {

  // Controls the progress of timeline
  useEffect(() => {
    const now = performance.now();
    if (!timeline) return;
    if (playerState.state === "playing") {
      const progress = (now - playerState.startingAt) / 1000;
      timeline.seek(progress);
      timeline.play();
    } else {
      timeline.pause();
      timeline.seek(playerState.progress);
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