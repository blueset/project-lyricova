import { RefObject, useEffect } from "react";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { LyricsFrameCallback } from "./types";
import { useNamedState } from "./useNamedState";

/** Refactor useLyricsState using WebVTT Cue callbacks. */
export function useLyricsState(
  playerRef: RefObject<HTMLAudioElement>,
  lyrics: LyricsKitLyrics,
  callback?: LyricsFrameCallback
): number {
  const [line, setLine] = useNamedState<number | null>(null, "line");

  useEffect(() => {
    if (!playerRef.current) return;
    const player = playerRef.current;

    // Create track
    const track = document.createElement("track");
    const uniqueId = Math.random().toString(36).substring(2, 15);
    track.id = `lyricsState-${uniqueId}`;
    track.kind = "subtitles";
    track.label = `Lyrics State ${uniqueId}`;
    track.src = "data:text/vtt;base64,V0VCVlRUCgoK";

    // Add track
    player.appendChild(track);
    track.track.mode = "hidden";
    // Workaround for Firefox
    player.textTracks.getTrackById(track.id).mode = "hidden";

    const addCues = () => {
      // Generate cues
      if (lyrics?.lines?.length > 0 && lyrics.lines[0].position > 0) {
        const cue = new VTTCue(0, lyrics.lines[0].position, "null,0");
        cue.addEventListener("enter", () => {
          setLine(null);
          // console.log("WebWTT lyrics state enter", null);
        });
        track.track.addCue(cue);
      }
      lyrics.lines.forEach((line, index) => {
        let nextLine: number =
          lyrics.lines[index + 1]?.position ?? player.duration;
        if (Number.isNaN(nextLine)) nextLine = 1e10;
        const cue = new VTTCue(
          line.position,
          nextLine,
          `${index},${line.position},${line.content}`
        );
        cue.addEventListener("enter", () => {
          setLine(index);
          // console.log("WebWTT lyrics state enter", index);
          callback && callback(index, lyrics, player, line.position, nextLine);
        });
        track.track.addCue(cue);
      });
    };

    if (player.readyState >= 2) {
      // Set timeout to ensure the cues can be added properly.
      setTimeout(addCues, 0);
    } else {
      player.addEventListener("loadedmetadata", addCues);
    }

    // Cleanup
    return () => {
      track?.parentElement?.removeChild(track);
      player?.removeEventListener("loadedmetadata", addCues);
    };
  }, [callback, lyrics, playerRef, setLine]);

  return line;
}
