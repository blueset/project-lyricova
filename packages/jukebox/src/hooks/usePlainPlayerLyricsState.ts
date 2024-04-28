import { RefObject, useMemo } from "react";
import { LyricsKitLyrics, LyricsKitLyricsLine } from "../graphql/LyricsKitObjects";
import { PlayerLyricsState, PlayerLyricsKeyframe } from "./types";
import { usePlayerLyricsState } from "./usePlayerLyricsState";

export function usePlainPlayerLyricsState(
  lyrics: LyricsKitLyrics,
  playerRef: RefObject<HTMLAudioElement>
): PlayerLyricsState<LyricsKitLyricsLine> {
  const keyFrames: PlayerLyricsKeyframe<LyricsKitLyricsLine>[] = useMemo(
    () =>
      lyrics.lines.map((v) => ({
        start: v.position,
        data: v,
      })),
    [lyrics]
  );
  return usePlayerLyricsState<LyricsKitLyricsLine>(keyFrames, playerRef);
}
