import type {
  Theme} from "@mui/material";
import {
  CardContent,
  Typography,
  IconButton,
  ButtonBase,
  useMediaQuery, Box, Stack,
} from "@mui/material";
import type { CSSProperties } from "react";
import React from "react";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import RepeatIcon from "@mui/icons-material/Repeat";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import type { Track } from "./AppContext";
import { useAppContext } from "./AppContext";
import { TimeSlider } from "./TimeSlider";
import { PlayButton } from "./PlayButton";
import { useAppDispatch, useAppSelector } from "../../redux/public/store";
import { currentSongSelector, playNext, playPrevious, setCollapsed, setLoopMode, toggleShuffle } from "../../redux/public/playlist";

const LOOP_MODE_SWITCH = {
  "all": "single",
  "single": "none",
  "none": "all",
} as const;

function generateBackgroundStyle(
  track: Track,
): CSSProperties {
  if (track?.hasCover) {
    return {
      backgroundImage: `url(/api/files/${track.id}/cover)`,
    };
  } else {
    console.log("Disk photo by Giorgio Trovato on Unsplash (https://unsplash.com/photos/_H4uyF7ZlV0).");
    return {
      backgroundImage: "url(/images/disk-256.jpg)",
    };
  }
}


export default function Player() {
  const dispatch = useAppDispatch();
  const {
    nowPlaying,
    loopMode,
    shuffleMapping,
    isCollapsed,
    tracks,
  } = useAppSelector((s) => s.playlist);
  const currentSong = useAppSelector(currentSongSelector);
  const { playerRef } = useAppContext();

  const isFlatPlayer = useMediaQuery<Theme>((theme) => theme.breakpoints.up("md")) && isCollapsed;

  const nextTrack = () => dispatch(playNext(!playerRef?.current.paused));
  const previousTrack = () => dispatch(playPrevious(!playerRef?.current.paused));
  const toggleShuffleHandler = () => dispatch(toggleShuffle());
  const switchLoopMode = () => dispatch(setLoopMode(LOOP_MODE_SWITCH[loopMode]));

  const loopModeButton = {
    "all": (
      <IconButton
        id="player-loop-mode"
        color="default"
        aria-label="Repeat all"
        onClick={switchLoopMode}
      >
        <RepeatIcon />
      </IconButton>
    ),
    "single": (
      <IconButton
        id="player-loop-mode"
        color="default"
        aria-label="Repeat one"
        onClick={switchLoopMode}
      >
        <RepeatOneIcon />
      </IconButton>
    ),
    "none": (
      <IconButton
        id="player-loop-mode"
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
    <CardContent sx={{
      padding: 2,
      ...(isCollapsed && {height: {xs: "12.5rem", md: "auto"},})
    }}>
      <ButtonBase
        sx={{
          width: "4rem",
          height: "4rem",
          float: "left",
          marginRight: "0.75rem",
          borderRadius: 1,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "box-shadow 0.5s, background-image 0.5s",
          "&:hover, &:focus": {
            boxShadow: 2,
          },
          "& > .backdrop": {
            opacity: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            width: "100%",
            height: "100%",
            transition: "opacity 0.5s",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          "&:hover > .backdrop, &:focus > .backdrop": {
            opacity: 1,
          },
        }}
        aria-label={isCollapsed ? "Expand player" : "Collapse player"}
        style={generateBackgroundStyle(currentSong)}
        onClick={() => dispatch(setCollapsed(!isCollapsed))}>
        <div className="backdrop">
          {isCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
        </div>
      </ButtonBase>
      <Box sx={isFlatPlayer ? {marginTop: "-0.3rem", marginBottom: "-0.3rem",} : undefined}>
        <Typography variant={isFlatPlayer ? "subtitle1" : "h6"} component={isFlatPlayer ? "span" : null} noWrap={true}>
          {currentSong?.trackName || "No title"}
        </Typography>
        {isFlatPlayer && " / "}
        <Typography variant="subtitle1" component={isFlatPlayer ? "span" : null}
                    sx={{opacity: isFlatPlayer ? 0.75 : 1,}} noWrap={true}>
          {currentSong?.artistName || "Unknown artists"}
        </Typography>
      </Box>
      <Stack
        direction="row" alignItems="center" justifyContent="space-around"
        sx={isCollapsed ? {
          flexWrap: {xs: "wrap", md: "inherit"},
          width: {xs: "100%", md: "auto"},
          marginBottom: {md: "-1rem"},
          marginTop: {md: "0.5rem"},
          "& #player-previous": {
            order: {md: -3},
            marginLeft: {md: "-0.5rem"},
          },
          "& #player-play-pause": {
            order: {md: -2},
          },
          "& #player-next": {
            order: {md: -2},
          },
          "& #player-time-slider": {
            margin: {md: "0 1rem"},
          },
        } : {
          flexWrap: "wrap",
          width: "100%",
        }}>
        <TimeSlider playerRef={playerRef} disabled={nowPlaying === null} isCollapsed={isCollapsed} />
        <IconButton id="player-shuffle"
          color="default"
          aria-label="Shuffle"
          style={{ opacity: shuffleMapping ? 1 : 0.5 }}
          disabled={tracks.length < 2}
          onClick={toggleShuffleHandler}
        >
          <ShuffleIcon />
        </IconButton>
        <IconButton id="player-previous"
          color="default"
          aria-label="Previous track"
          onClick={previousTrack}
        >
          <SkipPreviousIcon />
        </IconButton>
        <PlayButton playerRef={playerRef} />
        <IconButton id="player-next" color="default" aria-label="Next track" onClick={nextTrack}>
          <SkipNextIcon />
        </IconButton>
        {loopModeButton[loopMode]}
      </Stack>
    </CardContent>
  );
}
