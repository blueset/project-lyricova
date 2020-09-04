import {
  CardContent,
  Typography,
  IconButton,
  makeStyles,
  ButtonBase,
  useMediaQuery,
  Theme,
} from "@material-ui/core";
import React, { useCallback, CSSProperties } from "react";
import clsx from "clsx";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import RepeatOneIcon from "@material-ui/icons/RepeatOne";
import RepeatIcon from "@material-ui/icons/Repeat";
import UnfoldLessIcon from "@material-ui/icons/UnfoldLess";
import UnfoldMoreIcon from "@material-ui/icons/UnfoldMore";
import { useAppContext, LoopMode, Track } from "./AppContext";
import { TimeSlider } from "./TimeSlider";
import { PlayButton } from "./PlayButton";

const LOOP_MODE_SWITCH: { [key in keyof typeof LoopMode]: LoopMode } = {
  [LoopMode.ALL]: LoopMode.SINGLE,
  [LoopMode.SINGLE]: LoopMode.NONE,
  [LoopMode.NONE]: LoopMode.ALL,
};

const useStyle = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(2),
    "&:last-child": {
      padding: theme.spacing(2),
    }
  },
  controlContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  expandedControlContainer: {
    flexWrap: "wrap",
    width: "100%",
  },
  collapsedControlContainer: {
    [theme.breakpoints.down("sm")]: {
      flexWrap: "wrap",
      width: "100%",
    },
    [theme.breakpoints.up("md")]: {
      marginBottom: "-1rem",
      "& #player-previous": {
        order: -3,
        marginLeft: "-1rem",
      },
      "& #player-play-pause": {
        order: -2,
      },
      "& #player-next": {
        order: -2,
      },
      "& #player-time-slider": {
        margin: "0 1rem",
      }
    },
  },
  flatPlayerTitles: {
    marginTop: "-0.3rem",
    marginBottom: "-0.3rem",
  },
  collapseButton: {
    width: "4rem",
    height: "4rem",
    float: "left",
    marginRight: "0.75rem",
    borderRadius: theme.shape.borderRadius,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: theme.transitions.create(["box-shadow", "background-image"]),
    "&:hover, &:focus": {
      boxShadow: theme.shadows[2],
    },
    "& > .backdrop": {
      opacity: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      width: "100%",
      height: "100%",
      transition: theme.transitions.create(["opacity"]),
      borderRadius: theme.shape.borderRadius,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    "&:hover > .backdrop, &:focus > .backdrop": {
      opacity: 1,
    },
  },
  collapsedSubtitle: {
    opacity: 0.75,
  },
}));

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
  const styles = useStyle();
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
    <CardContent className={styles.container}>
      <ButtonBase
        className={styles.collapseButton}
        aria-label={isCollapsed ? "Expand player" : "Collapse player"}
        style={generateBackgroundStyle(playlist.getCurrentSong())}
        onClick={() => setCollapsed(!isCollapsed)}>
        <div className="backdrop">
          {isCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
        </div>
      </ButtonBase>
      <div className={clsx(isFlatPlayer && styles.flatPlayerTitles)}>
        <Typography variant={isFlatPlayer ? "subtitle1" : "h6"} component={isFlatPlayer ? "span" : null} noWrap={true}>
          {playlist.getCurrentSong()?.trackName || "No title"}
        </Typography>
        {isFlatPlayer && " / "}
        <Typography variant="subtitle1" component={isFlatPlayer ? "span" : null} className={clsx(isFlatPlayer && styles.collapsedSubtitle)} noWrap={true}>
          {playlist.getCurrentSong()?.artistName || "Unknown artists"}
        </Typography>
      </div>
      <div className={clsx(styles.controlContainer, isCollapsed ? styles.collapsedControlContainer : styles.expandedControlContainer)}>
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
      </div>
    </CardContent>
  );
}
