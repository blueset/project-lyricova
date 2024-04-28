import _ from "lodash";
import { RefObject, useRef, useCallback, useEffect } from "react";
import type { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { useNamedState } from "./useNamedState";
import { LyricsFrameCallback } from "./types";

function getStartEnd(
  playerRef: RefObject<HTMLAudioElement>,
  lyrics: LyricsKitLyrics,
  line: number
): [number, number] {
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

export function useLyricsStateRAF(
  playerRef: RefObject<HTMLAudioElement>,
  lyrics: LyricsKitLyrics,
  callback?: LyricsFrameCallback
): number {
  const [line, setLine] = useNamedState<number | null>(null, "line");
  const lineRef = useRef<number>();
  lineRef.current = line;

  const onTimeUpdate = useCallback(
    (recur: boolean = true) => {
      const player = playerRef.current;
      if (player !== null) {
        const time = player.currentTime;
        const [start, end] = getStartEnd(playerRef, lyrics, lineRef.current);
        if (start > time || time >= end) {
          const thisLineIndex = _.sortedIndexBy<{ position: number }>(
            lyrics.lines,
            { position: time },
            "position"
          );
          if (thisLineIndex === 0) {
            if (lineRef.current !== null) setLine(null);
            callback && callback(null, lyrics, player, start, end);
          } else {
            const thisLine =
              thisLineIndex >= lyrics.lines.length ||
              lyrics.lines[thisLineIndex].position > time
                ? thisLineIndex - 1
                : thisLineIndex;
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
    },
    [playerRef, lyrics, setLine, callback]
  );

  const onPlay = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate());
  }, [onTimeUpdate]);
  const onTimeChange = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate(/* recur */ false));
  }, [onTimeUpdate]);

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
  }, [playerRef, onPlay, onTimeChange, onTimeUpdate]);

  return line;
}