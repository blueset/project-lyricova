import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { LyricsKitLyrics } from "@lyricova/components/gql/schema";
import type { LyricsFrameCallback } from "./types";
import { useNamedState } from "./useNamedState";
import {
  findActiveKeyframeIndex,
  readPlaybackSnapshot,
  useMediaClock,
} from "./useMediaClock";

/** Select the current lyrics line from the media element's playback clock. */
export function useLyricsState(
  playerRef: RefObject<HTMLAudioElement>,
  lyrics: LyricsKitLyrics,
  callback?: LyricsFrameCallback,
): number | null {
  const [line, setLine] = useNamedState<number | null>(null, "line");
  const lineRef = useRef(line);
  lineRef.current = line;
  const startTimes = useMemo(
    () => lyrics.lines.map((lyricsLine) => lyricsLine.position),
    [lyrics.lines],
  );

  const synchronizeLine = useCallback(
    (snapshot: ReturnType<typeof readPlaybackSnapshot>) => {
      const index = findActiveKeyframeIndex(startTimes, snapshot.currentTime);
      const nextLine = index >= 0 ? index : null;
      if (lineRef.current === nextLine) return;

      lineRef.current = nextLine;
      setLine(nextLine);
      const player = playerRef.current;
      const lyricsLine = nextLine !== null ? lyrics.lines[nextLine] : undefined;
      if (callback && player && nextLine !== null && lyricsLine) {
        callback(
          nextLine,
          lyrics,
          player,
          lyricsLine.position,
          lyrics.lines[nextLine + 1]?.position ??
            (Number.isFinite(snapshot.duration) ? snapshot.duration : null),
        );
      }
    },
    [callback, lyrics, playerRef, setLine, startTimes],
  );
  useMediaClock(playerRef, synchronizeLine);
  useEffect(() => {
    const player = playerRef.current;
    if (player) synchronizeLine(readPlaybackSnapshot(player));
  }, [playerRef, synchronizeLine]);

  return line;
}
