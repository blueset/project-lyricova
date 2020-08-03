import style from "./Player.module.scss";
import {
  Paper,
  CardContent,
  Typography,
  Slider,
  IconButton,
  Fab,
  CircularProgress,
} from "@material-ui/core";
import React, { RefObject, useState, useEffect } from "react";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import RepeatOneIcon from "@material-ui/icons/RepeatOne";
import { formatTime } from "../../frontendUtils/strings";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
}

export default function Player(props: Props) {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const playerRef = props.playerRef;

  function updateTime() {
    if (playerRef.current !== null && !isDragging) {
      setTime(playerRef.current.currentTime);
    }
  }

  function clickPlay() {
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }

  function onPlay() {
    setIsPlaying(true);
  }

  function onPause() {
    setIsPlaying(false);
  }

  function updateDuration() {
    setDuration(playerRef.current.duration);
  }

  function onSliderChange(event: unknown, newValue: number) {
    setTime(newValue);
    setIsDragging(true);
  }

  function onSliderChangeCommitted(event: unknown, newValue: number) {
    playerRef.current.currentTime = newValue;
    setTime(newValue);
    setIsDragging(false);
  }

  function updateProgress() {
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

  useEffect(() => {
    if (playerRef.current !== null) {
      playerRef.current.addEventListener("timeupdate", updateTime);
      playerRef.current.addEventListener("playing", onPlay);
      playerRef.current.addEventListener("pause", onPause);
      playerRef.current.addEventListener("durationchange", updateDuration);
      playerRef.current.addEventListener("loadedmetadata", updateDuration);
      playerRef.current.addEventListener("progress", updateProgress);
      updateTime();
      updateDuration();
    }
    return function cleanUp() {
      if (playerRef.current !== null) {
        playerRef.current.removeEventListener("timeupdate", updateTime);
        playerRef.current.removeEventListener("playing", onPlay);
        playerRef.current.removeEventListener("pause", onPause);
        playerRef.current.removeEventListener("durationchange", updateDuration);
        playerRef.current.removeEventListener("loadedmetadata", updateDuration);
        playerRef.current.removeEventListener("progress", updateProgress);
      }
    };
  });

  return (
    <Paper className={style.playerPaper}>
      <CardContent>
        <div>
          {/* <div>image</div> */}
          <div>
            <Typography variant="h6">Song name</Typography>
            <Typography variant="subtitle1">Song artist</Typography>
          </div>
        </div>
        <Slider
          defaultValue={0}
          value={time}
          getAriaValueText={formatTime}
          max={duration}
          onChange={onSliderChange}
          onChangeCommitted={onSliderChangeCommitted}
        />
        <div className={style.sliderLabelContainer}>
          <Typography
            variant="body2"
            component="span"
            className={style.sliderLabelText}
          >
            {formatTime(time)}
          </Typography>
          <span className={style.sliderLabelStretcher}></span>
          <Typography
            variant="body2"
            component="span"
            className={style.sliderLabelText}
          >
            {formatTime(duration)}
          </Typography>
        </div>
        <div className={style.controlContainer}>
          <IconButton
            color="default"
            aria-label="Shuffle"
            style={{ opacity: 0.5 }}
          >
            <ShuffleIcon />
          </IconButton>
          <IconButton color="default" aria-label="Previous track">
            <SkipPreviousIcon />
          </IconButton>
          <div className={style.loadProgressContainer}>
            <Fab
              color="primary"
              aria-label={isPlaying ? "Pause" : "Play"}
              size="medium"
              onClick={clickPlay}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </Fab>
            {isLoading && (
              <CircularProgress
                size={60}
                thickness={2.4}
                color="secondary"
                value={loadProgress}
                className={style.loadProgressSpinner}
                variant="static"
              />
            )}
          </div>
          <IconButton color="default" aria-label="Next track">
            <SkipNextIcon />
          </IconButton>
          <IconButton
            color="default"
            aria-label="Repeat one"
            style={{ opacity: 0.5 }}
          >
            <RepeatOneIcon />
          </IconButton>
        </div>
      </CardContent>
    </Paper>
  );
}
