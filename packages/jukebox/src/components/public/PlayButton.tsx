import type { RefObject } from "react";
import { useEffect, useCallback } from "react";
import { useNamedState } from "../../hooks/useNamedState";
import { useAppDispatch, useAppSelector } from "../../redux/public/store";
import { playTrack } from "../../redux/public/playlist";
import { cn } from "@lyricova/components/utils";
import { Button } from "@lyricova/components/components/ui/button";
import { CircularProgress } from "@lyricova/components/components/ui/circular-progress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Play, Pause } from "lucide-react";
import { shallowEqual } from "react-redux";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
  className?: string;
}

export function PlayButton({ playerRef, className }: Props) {
  const dispatch = useAppDispatch();
  const { nowPlayingDefined, tracksHaveContent, isCollapsed } = useAppSelector(
    (s) => ({
      nowPlayingDefined: s.playlist.nowPlaying !== null,
      tracksHaveContent: s.playlist.tracks.length > 0,
      isCollapsed: s.playlist.isCollapsed,
    }),
    shallowEqual
  );
  const isFlatPlayer = useMediaQuery("(min-width: 640px)") && isCollapsed;

  // Using state to keep this button rerendered on state change.
  const [isPlaying, setIsPlaying] = useNamedState(false, "isPlaying");
  const [isLoading, setIsLoading] = useNamedState(false, "isLoading");
  const [loadProgress, setLoadProgress] = useNamedState(0, "loadProgress");

  const updateProgress = useCallback(() => {
    if (!playerRef.current) {
      setLoadProgress(0);
      setIsLoading(false);
      return;
    }
    const duration = playerRef.current.duration,
      buffered = playerRef.current.buffered;
    let loaded = 0;
    if (duration > 0) {
      for (let i = 0; i < buffered.length; i++) {
        loaded += buffered.end(i) - buffered.start(i);
      }
      setLoadProgress((loaded / duration) * 100);
      setIsLoading(duration - loaded > 1e-6);
    } else {
      setLoadProgress(0);
      setIsLoading(false);
    }
  }, [playerRef, setIsLoading, setLoadProgress]);

  const clickPlay = useCallback(() => {
    if (!nowPlayingDefined && tracksHaveContent) {
      dispatch(playTrack({ track: 0, playNow: true }));
      return;
    }
    if (playerRef.current.paused) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [dispatch, nowPlayingDefined, playerRef, tracksHaveContent]);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);
  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  useEffect(() => {
    const playerElm = playerRef.current;
    if (playerElm !== null) {
      playerElm.addEventListener("progress", updateProgress);
      playerElm.addEventListener("play", onPlay);
      playerElm.addEventListener("pause", onPause);
    }
    return function cleanUp() {
      if (playerElm !== null) {
        playerElm.removeEventListener("progress", updateProgress);
      }
    };
  }, [onPause, onPlay, playerRef, updateProgress]);

  return (
    <div className={cn("relative", className)} id="player-play-pause">
      <Button
        variant="default"
        className="z-10 rounded-full size-12 group-data-[flat]/player:size-10 "
        aria-label={!isPlaying ? "Play" : "Pause"}
        onClick={clickPlay}
      >
        {!isPlaying ? <Play /> : <Pause />}
      </Button>
      {isLoading && (
        <CircularProgress
          size={isFlatPlayer ? 51 : 60}
          strokeWidth={2.4}
          value={loadProgress}
          className="absolute -top-1.5 -left-1.5 z-10 opacity-50 text-primary pointer-events-none"
        />
      )}
    </div>
  );
}
