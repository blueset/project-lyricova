import { useState, useDebugValue, useEffect, RefObject, useCallback, useMemo } from "react";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import _ from "lodash";


export function useNamedState<T>(initialValue: T, name: string) {
  const ret = useState<T>(initialValue);
  useDebugValue(`${name}: ${ret[0]}`);
  return ret;
}

export type LyricsFrameCallback = (thisLine: number, lyrics: LyricsKitLyrics, player: HTMLAudioElement) => void;

export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, callback?: LyricsFrameCallback): number {
  const [line, setLine] = useNamedState<number | null>(null, "line");

  const [start, end] = useMemo<[number, number]>(() => {
    if (!playerRef.current) {
      return [null, null];
    }
    if (!lyrics.lines) {
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
  }, [line, lyrics, playerRef.current]);

  const onTimeUpdate = useCallback((recur: boolean = true) => {
    const player = playerRef.current;
    if (player !== null) {
      const time = player.currentTime;
      if (start > time || time >= end) {
        const thisLineIndex = _.sortedIndexBy<{ position: number }>(lyrics.lines, { position: time }, "position");
        if (thisLineIndex === 0) {
          if (line !== null) setLine(null);
          callback && callback(null, lyrics, player);
        } else {
          const thisLine =
            (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position !== time) ?
              thisLineIndex - 1 :
              thisLineIndex;
          if (thisLine != line) {
            setLine(thisLine);
          }
          callback && callback(thisLine, lyrics, player);
        }
      } else {
        callback && callback(line, lyrics, player);
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