import _ from "lodash";
import type { RefObject} from "react";
import { useRef, useCallback, useEffect } from "react";
import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import { useNamedState } from "./useNamedState";
import type { LyricsFrameCallback } from "./types";

type NullableLyricsFrameCallback = (
  thisLine: number | null,
  lyrics: Parameters<LyricsFrameCallback>[1],
  player: Parameters<LyricsFrameCallback>[2],
  start: Parameters<LyricsFrameCallback>[3],
  end: Parameters<LyricsFrameCallback>[4],
) => void;

function getStartEnd(
  playerRef: RefObject<HTMLAudioElement>,
  lyrics: LyricsKitLyrics,
  line: number | null,
): [number | null, number | null] {
  if (playerRef.current === null || lyrics.lines.length === 0) {
    return [null, null];
  }
  if (line === null || !lyrics.lines[line]) {
    const firstLine = lyrics.lines[0];
    if (firstLine) {
      return [0, firstLine.position];
    }
    return [0, playerRef.current.duration];
  }
  const currentLine = lyrics.lines[line]!;
  if (line + 1 >= lyrics.lines.length) {
    return [currentLine.position, playerRef.current.duration];
  }
  return [currentLine.position, lyrics.lines[line + 1]?.position ?? playerRef.current.duration];
}

export function useLyricsStateRAF(
  playerRef: RefObject<HTMLAudioElement>,
  lyrics: LyricsKitLyrics,
  callback?: NullableLyricsFrameCallback,
): number | null {
  const [line, setLine] = useNamedState<number | null>(null, "line");
  const lineRef = useRef<number | null>(line);
  lineRef.current = line;

  const onTimeUpdate = useCallback(
    (recur: boolean = true) => {
      const player = playerRef.current;
      if (player !== null) {
        const time = player.currentTime;
        const [start, end] = getStartEnd(playerRef, lyrics, lineRef.current);
        if (start === null || end === null || start > time || time >= end) {
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
              (lyrics.lines[thisLineIndex]?.position ?? Infinity) > time
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
