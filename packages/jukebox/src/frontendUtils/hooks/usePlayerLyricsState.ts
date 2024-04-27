import { RefObject, useMemo, useEffect } from "react";
import { PlayerLyricsKeyframe, PlayerLyricsState } from "./types";
import { useNamedState } from "./useNamedState";
import { usePlayerState } from "./usePlayerState";

/** Refactor usePlayerLyricsState using WebVTT Cue callbacks. */
export function usePlayerLyricsState<T>(
  keyframes: PlayerLyricsKeyframe<T>[],
  playerRef: RefObject<HTMLAudioElement>
): PlayerLyricsState<T> {
  const playerState = usePlayerState(playerRef);

  /**
   * Current frame can be anything in [-1, keyframe.length - 1].
   * -1 means before the first frame starts. Final frame lasts forever.
   */
  const [currentFrameId, setCurrentFrameId] = useNamedState(
    -1,
    "currentFrameId"
  );

  /**
   * `endTimes[i + 1]` is when frame `i` ends, in seconds.
   * Last value is the end of the track.
   */
  const endTimes = useMemo(() => {
    const endTimes = [];
    keyframes.forEach((v, idx) => {
      endTimes[idx] = v.start;
    });

    if (playerRef.current)
      endTimes[keyframes.length] = playerRef.current.duration;
    else if (keyframes.length > 0)
      endTimes[keyframes.length] = keyframes[keyframes.length - 1].start + 10;
    else endTimes[keyframes.length] = 0;

    return endTimes;
  }, [keyframes, playerRef]);

  const startTimes = useMemo(() => keyframes.map((v) => v.start), [keyframes]);

  useEffect(() => {
    if (!playerRef.current) return;
    const player = playerRef.current;

    // Create track
    const track = document.createElement("track");
    const uniqueId = Math.random().toString(36).substring(2, 15);
    track.id = `playerLyricsState-${uniqueId}`;
    track.kind = "subtitles";
    track.label = `Player Lyrics State ${uniqueId}`;
    track.src = "data:text/vtt;base64,V0VCVlRUCgoK";

    // Add track
    player.appendChild(track);
    track.track.mode = "hidden";
    // Workaround for Firefox
    player.textTracks.getTrackById(track.id).mode = "hidden";

    const addCues = () => {
      // Generate cues
      if (startTimes[0] > 0) {
        const cue = new VTTCue(0, startTimes[0], `-1,0,${startTimes[0]}`);
        cue.addEventListener("enter", () => {
          setCurrentFrameId(-1);
          // console.log("WebWTT lyrics state enter", -1);
        });
        track.track.addCue(cue);
      }
      startTimes.forEach((startTime, index) => {
        let endTime: number = endTimes[index + 1];
        if (isNaN(startTime)) return;
        if (isNaN(endTime)) endTime = 1e10;
        const cue = new VTTCue(
          startTime,
          endTime,
          `${index},${startTime},${endTime}`
        );
        cue.addEventListener("enter", () => {
          setCurrentFrameId(index);
          // console.log("WebWTT lyrics state enter", index);
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
  }, [startTimes, endTimes, playerRef, setCurrentFrameId]);

  return {
    playerState,
    currentFrameId,
    currentFrame: currentFrameId >= 0 ? keyframes[currentFrameId] : null,
    endTime: endTimes[currentFrameId + 1],
    startTimes,
    endTimes,
  };
}
