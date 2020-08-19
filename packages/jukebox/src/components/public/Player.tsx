import style from "./Player.module.scss";
import {
  CardContent,
  Typography,
  IconButton,
} from "@material-ui/core";
import React, { useCallback } from "react";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import RepeatOneIcon from "@material-ui/icons/RepeatOne";
import RepeatIcon from "@material-ui/icons/Repeat";
import { useAppContext, LoopMode } from "./AppContext";
import { TimeSlider } from "./TimeSlider";
import { PlayButton } from "./PlayButton";

const LOOP_MODE_SWITCH: { [key in keyof typeof LoopMode]: LoopMode } = {
  [LoopMode.ALL]: LoopMode.SINGLE,
  [LoopMode.SINGLE]: LoopMode.NONE,
  [LoopMode.NONE]: LoopMode.ALL,
};

export default function Player() {

  const { playerRef, playlist } = useAppContext();

  function nextTrack() {
    const isPlaying = !playerRef.current.paused;
    if (isPlaying) playerRef.current.pause();
    playlist.playNext(/*playNow*/ isPlaying);
  }

  function previousTrack() {
    const isPlaying = !playerRef.current.paused;
    if (isPlaying) playerRef.current.pause();
    playlist.playPrevious(/*playNow*/ isPlaying);
  }

  const toggleShuffle = useCallback(() => {
    playlist.toggleShuffle();
  }, [playlist]);

  const switchLoopMode = useCallback(() => {
    playlist.setLoopMode(LOOP_MODE_SWITCH[playlist.loopMode]);
  }, [playlist]);

  const loopModeButton = {
    [LoopMode.ALL]: (
      <IconButton
        color="default"
        aria-label="Repeat all"
        onClick={switchLoopMode}
      >
        <RepeatIcon />
      </IconButton>
    ),
    [LoopMode.SINGLE]: (
      <IconButton
        color="default"
        aria-label="Repeat one"
        onClick={switchLoopMode}
      >
        <RepeatOneIcon />
      </IconButton>
    ),
    [LoopMode.NONE]: (
      <IconButton
        color="default"
        aria-label="No repeat"
        style={{ opacity: 0.5 }}
        onClick={switchLoopMode}
      >
        <RepeatIcon />
      </IconButton>
    ),
  };

  return (
    <CardContent>
      <div>
        {/* <div>image</div> */}
        <div>
          <Typography variant="h6" noWrap={true}>
            {playlist.getCurrentSong()?.trackName || "No title"}
          </Typography>
          <Typography variant="subtitle1" noWrap={true}>
            {playlist.getCurrentSong()?.artistName || "Unknown artists"}
          </Typography>
        </div>
      </div>
      <TimeSlider playerRef={playerRef} />
      <div className={style.controlContainer}>
        <IconButton
          color="default"
          aria-label="Shuffle"
          style={{ opacity: playlist.shuffleMapping ? 1 : 0.5 }}
          onClick={toggleShuffle}
        >
          <ShuffleIcon />
        </IconButton>
        <IconButton
          color="default"
          aria-label="Previous track"
          onClick={previousTrack}
        >
          <SkipPreviousIcon />
        </IconButton>
        <PlayButton playerRef={playerRef} playlist={playlist} />
        <IconButton color="default" aria-label="Next track" onClick={nextTrack}>
          <SkipNextIcon />
        </IconButton>
        {loopModeButton[playlist.loopMode]}
      </div>
    </CardContent>
  );
}
