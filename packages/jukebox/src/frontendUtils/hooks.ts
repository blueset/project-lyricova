import { useState, useDebugValue, useEffect, RefObject, useCallback } from "react";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import _ from "lodash";


export function useNamedState<T>(initialValue: T, name: string) {
  const ret = useState<T>(initialValue);
  useDebugValue(`${name}: ${ret[0]}`);
  return ret;
}

interface UseLyricsStateOptions {
  usePercentage: boolean;
}

export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, options?: undefined): number;
export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, options?: UseLyricsStateOptions & { usePercentage: false }): number;
export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, options?: UseLyricsStateOptions & { usePercentage: true }): [number, number];

export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, options?: UseLyricsStateOptions): number | [number, number] {
  const [line, setLine] = useNamedState<number | null>(null, "line");
  const [percentage, setPercentage] = useNamedState<number | null>(null, "line");

  const onTimeUpdate = useCallback((recur: boolean = true) => {
    const player = playerRef.current;
    if (player !== null) {
      const time = player.currentTime;
      const thisLineIndex = _.sortedIndexBy<{ position: number }>(lyrics.lines, { position: time }, "position");
      if (thisLineIndex === 0) {
        if (line !== null) setLine(null);
        if (options?.usePercentage && percentage !== null) setPercentage(null);
      } else {
        const thisLine =
          (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position !== time) ?
            thisLineIndex - 1 :
            thisLineIndex;
        if (thisLine != line) {
          setLine(thisLine);
        }
        if (options?.usePercentage) {
          if (thisLineIndex >= lyrics.lines.length) {
            setPercentage(null);
          } else {
            let endTime = player.duration;
            if (thisLine + 1 < lyrics.lines.length) {
              endTime = lyrics.lines[thisLine + 1].position;
            }
            const percentage = (time - lyrics.lines[thisLine].position) / (endTime - lyrics.lines[thisLine].position);
            setPercentage(_.clamp(percentage, 0, 1));
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

  if (options?.usePercentage) {
    return [line, percentage];
  }

  return line;
}