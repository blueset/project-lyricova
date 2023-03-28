import style from "./PlayButton.module.scss";
import { RefObject, useEffect, useCallback } from "react";
import { Fab, CircularProgress, useMediaQuery, Theme } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import { useNamedState } from "../../frontendUtils/hooks";
import { useAppDispatch, useAppSelector } from "../../redux/public/store";
import { playTrack } from "../../redux/public/playlist";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
}

export function PlayButton({ playerRef }: Props) {
  const dispatch = useAppDispatch();
  const { nowPlaying, tracks, isCollapsed } = useAppSelector((s) => s.playlist);

  // Using state to keep this button rerendered on state change.
  const [isPlaying, setIsPlaying] = useNamedState(false, "isPlaying");
  const [isLoading, setIsLoading] = useNamedState(false, "isLoading");
  const [loadProgress, setLoadProgress] = useNamedState(0, "loadProgress");
  const useSmallSize =
    useMediaQuery<Theme>((theme) => theme.breakpoints.up("md")) && isCollapsed;

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
    if (nowPlaying === null && tracks.length > 0) {
      dispatch(playTrack({ track: 0, playNow: true }));
      return;
    }
    if (playerRef.current.paused) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [dispatch, nowPlaying, playerRef, tracks.length]);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);
  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  useEffect(() => {
    const playerElm = playerRef.current;
    // console.log("trying to register listeners");
    if (playerElm !== null) {
      // console.log("registering listeners");
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
    <div className={style.loadProgressContainer} id="player-play-pause">
      <Fab
        color="primary"
        aria-label={!isPlaying ? "Play" : "Pause"}
        size={useSmallSize ? "small" : "medium"}
        className={style.playPauseButton}
        onClick={clickPlay}
      >
        {!isPlaying ? <PlayArrowIcon /> : <PauseIcon />}
      </Fab>
      {isLoading && (
        <CircularProgress
          size={useSmallSize ? 51 : 60}
          thickness={2.4}
          color="secondary"
          variant="determinate"
          value={loadProgress}
          className={style.loadProgressSpinner}
        />
      )}
    </div>
  );
}
