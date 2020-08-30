import { useState, useDebugValue, useEffect, RefObject, useCallback, useRef, useMemo } from "react";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import _ from "lodash";
import { AnimatedWord } from "../utils/typingSequence";
import { gql, QueryResult, useQuery } from "@apollo/client";


export function useNamedState<T>(initialValue: T, name: string) {
  const ret = useState<T>(initialValue);
  useDebugValue(`${name}: ${ret[0]}`);
  return ret;
}

export function getStartEnd(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, line: number): [number, number] {
  if (playerRef.current === null || lyrics.lines.length === 0) {
    return [null, null];
  }
  if (line === null) {
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
          if (line !== null) setLine(null);
          callback && callback(null, lyrics, player, start, end);
        } else {
          const thisLine =
            (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position !== time) ?
              thisLineIndex - 1 :
              thisLineIndex;
          if (thisLine != line) {
            setLine(thisLine);
          }
          callback && callback(thisLine, lyrics, player, start, end);
        }
      } else {
        callback && callback(line, lyrics, player, start, end);
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
  }, [playerRef]);
  const onTimeChange = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate(/* recur */false));
  }, [playerRef]);

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
  }, [playerRef]);

  return line;
}

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!) {
    transliterate(text: $text) {
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

const LONGEST_STEP_SECONDS = 0.5;

interface LyricsSegmentStateResult {
  line: number | null;
  currentStep: number | null;
  sequenceQuery: QueryResult<SequenceQueryResult>;
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
            (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position !== time) ?
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
  }, [playerRef]);
  const onTimeChange = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate(/* recur */false));
  }, [playerRef]);

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