import {
  CardContent,
  Typography,
  IconButton,
  ButtonBase,
  useMediaQuery,
  Theme, Box, Stack,
} from "@mui/material";
import React, { useCallback, CSSProperties } from "react";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import RepeatIcon from "@mui/icons-material/Repeat";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { useAppContext, LoopMode, Track } from "./AppContext";
import { TimeSlider } from "./TimeSlider";
import { PlayButton } from "./PlayButton";

const LOOP_MODE_SWITCH: { [key in keyof typeof LoopMode]: LoopMode } = {
  [LoopMode.ALL]: LoopMode.SINGLE,
  [LoopMode.SINGLE]: LoopMode.NONE,
  [LoopMode.NONE]: LoopMode.ALL,
};

function generateBackgroundStyle(
  track: Track,
): CSSProperties {
  if (track !== null && track.hasCover) {
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

interface PlayerProps {
  isCollapsed: boolean;
  setCollapsed?: (value: boolean) => void;
}

export default function Player({ isCollapsed, setCollapsed }: PlayerProps) {

  const { playerRef, playlist } = useAppContext();
  const isFlatPlayer = useMediaQuery<Theme>((theme) => theme.breakpoints.up("md")) && isCollapsed;

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
        id="player-loop-mode"
        color="default"
        aria-label="Repeat all"
        onClick={switchLoopMode}
      >
        <RepeatIcon />
      </IconButton>
    ),
    [LoopMode.SINGLE]: (
      <IconButton
        id="player-loop-mode"
        color="default"
        aria-label="Repeat one"
        onClick={switchLoopMode}
      >
        <RepeatOneIcon />
      </IconButton>
    ),
    [LoopMode.NONE]: (
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
        style={generateBackgroundStyle(playlist.getCurrentSong())}
        onClick={() => setCollapsed(!isCollapsed)}>
        <div className="backdrop">
          {isCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
        </div>
      </ButtonBase>
      <Box sx={isFlatPlayer ? {marginTop: "-0.3rem", marginBottom: "-0.3rem",} : undefined}>
        <Typography variant={isFlatPlayer ? "subtitle1" : "h6"} component={isFlatPlayer ? "span" : null} noWrap={true}>
          {playlist.getCurrentSong()?.trackName || "No title"}
        </Typography>
        {isFlatPlayer && " / "}
        <Typography variant="subtitle1" component={isFlatPlayer ? "span" : null}
                    sx={{opacity: isFlatPlayer ? 0.75 : 1,}} noWrap={true}>
          {playlist.getCurrentSong()?.artistName || "Unknown artists"}
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
        <TimeSlider playerRef={playerRef} disabled={playlist.nowPlaying === null} isCollapsed={isCollapsed} />
        <IconButton id="player-shuffle"
          color="default"
          aria-label="Shuffle"
          style={{ opacity: playlist.shuffleMapping ? 1 : 0.5 }}
          onClick={toggleShuffle}
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
        <PlayButton playerRef={playerRef} playlist={playlist} isCollapsed={isCollapsed} />
        <IconButton id="player-next" color="default" aria-label="Next track" onClick={nextTrack}>
          <SkipNextIcon />
        </IconButton>
        {loopModeButton[playlist.loopMode]}
      </Stack>
    </CardContent>
  );
}
