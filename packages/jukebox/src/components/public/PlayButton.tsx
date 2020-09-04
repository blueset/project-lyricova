import style from "./PlayButton.module.scss";
import { RefObject, useEffect, useCallback } from "react";
import { Fab, CircularProgress, useMediaQuery, Theme } from "@material-ui/core";
import { Playlist } from "./AppContext";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import { useNamedState } from "../../frontendUtils/hooks";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
  playlist: Playlist;
  isCollapsed: boolean;
}

export function PlayButton({ playerRef, playlist, isCollapsed }: Props) {
  // Using state to keep this button rerendered on state change.
  const [isPlaying, setIsPlaying] = useNamedState(false, "isPlaying");
  const [isLoading, setIsLoading] = useNamedState(false, "isLoading");
  const [loadProgress, setLoadProgress] = useNamedState(0, "loadProgress");
  const useSmallSize = useMediaQuery<Theme>((theme) => theme.breakpoints.up("md")) && isCollapsed;

  function updateProgress() {
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
  }

  const clickPlay = useCallback(() => {
    if (playlist.nowPlaying === null && playlist.tracks.length > 0) {
      playlist.playTrack(0, /*playNow*/ true);
      return;
    }
    if (playerRef.current.paused) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [playlist]);

  function onPlay() { setIsPlaying(true); }
  function onPause() { setIsPlaying(false); }

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
      // console.log("trying to remove listeners");
      if (playerElm !== null) {
        // console.log("removing listeners");
        playerElm.removeEventListener("progress", updateProgress);
        // playerElm.removeEventListener("play", onPlay);
        // playerElm.removeEventListener("pause", onPause);
      }
    };
  }, [playerRef]);

  return (<div className={style.loadProgressContainer} id="player-play-pause">
    <Fab
      color="primary"
      aria-label={
        !isPlaying ? "Play" : "Pause"
      }
      size={useSmallSize ? "small" : "medium"}
      className={style.playPauseButton}
      onClick={clickPlay}
    >
      {(!isPlaying) ? (
        <PlayArrowIcon />
      ) : (
          <PauseIcon />
        )}
    </Fab>
    {isLoading && (
      <CircularProgress
        size={useSmallSize ? 51 : 60}
        thickness={2.4}
        color="secondary"
        value={loadProgress}
        className={style.loadProgressSpinner}
        variant="static"
      />
    )}
  </div>);
}