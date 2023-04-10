import { useCallback, useEffect, useRef } from "react";
import {
  WebAudioPlayerState,
  useNamedState,
  useWebAudio,
} from "../../../../frontendUtils/hooks";
import {
  Box,
  Fab,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  styled,
} from "@mui/material";
import DismissibleAlert from "../../DismissibleAlert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Forward5Icon from "@mui/icons-material/Forward5";
import Replay5Icon from "@mui/icons-material/Replay5";
import SpeedIcon from "@mui/icons-material/Speed";
import { formatTime } from "../../../../frontendUtils/strings";

const ControlRow = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  "&:last-child": {
    marginBottom: 0,
  },
}));

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  fileId: number;
}

export default function InlineTagging({ lyrics, setLyrics, fileId }: Props) {
  const { playerStatus, play, pause, seek, setRate, getProgress, audioBuffer } =
    useWebAudio(`/api/files/${fileId}/file`);
  const playerStatusRef = useRef<WebAudioPlayerState>();
  playerStatusRef.current = playerStatus;
  const [playbackProgress, setPlaybackProgress] = useNamedState(
    0,
    "playbackProgress"
  );
  const [seekBarTime, setSeekBarTime] = useNamedState(0, "seekBarTime");
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");
  const [section, setSection] = useNamedState<"edit" | "mark" | "tag">(
    "edit",
    "section"
  );

  // Update time tags
  const onFrame = useCallback(() => {
    const playerStatus = playerStatusRef.current;
    // const currentLine = currentLineRef.current;
    // const linesPerTag = linesPerTagRef.current;

    const time = getProgress();
    setPlaybackProgress(time);

    // if (
    //   (time < currentLine.start || time > currentLine.end) &&
    //   linesPerTag.length > 0
    // ) {
    //   const record = linesPerTag.reduce(
    //     (p, c, i) => {
    //       if (c[0]) {
    //         if (c[0] < p.end && c[0] > time) {
    //           p.end = c[0];
    //         }
    //         if (c[0] > p.start && c[0] <= time) {
    //           p.start = c[0];
    //           p.index = i;
    //         }
    //       }
    //       return p;
    //     },
    //     {
    //       index: -Infinity,
    //       start: -Infinity,
    //       end: Infinity,
    //     }
    //   );
    //   setCurrentLine(record);
    // }

    if (playerStatus.state === "playing") {
      requestAnimationFrame(onFrame);
    }
  }, [getProgress, /* setCurrentLine, */ setPlaybackProgress]);

  useEffect(() => {
    requestAnimationFrame(onFrame);
  }, [onFrame, playerStatus]);

  return (
    <div>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          left: 0,
          zIndex: 1,
          backgroundColor: "#12121280",
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        <ControlRow p={1} spacing={2} direction="row" alignItems="center">
          <ToggleButtonGroup
            size="small"
            value={section}
            exclusive
            onChange={(evt, value) => setSection(value)}
          >
            <ToggleButton value="edit">Edit</ToggleButton>
            <ToggleButton value="mark">Mark</ToggleButton>
            <ToggleButton value="tag">Tag</ToggleButton>
          </ToggleButtonGroup>
          <DismissibleAlert
            severity="warning"
            collapseProps={{ sx: { flexGrow: 1 } }}
          >
            Switch to another tab to save changes. ↑WJ/↓RK: Navigate; Home/End:
            First/Last; PgUp/PgDn: +/-10 lines; ←AH/→RL: +/-5 seconds; Space:
            Tag; Bksp: Remove; Cmd/Ctrl+(↑J/↓K: speed; R: reset speed; Enter:
            play/pause).
          </DismissibleAlert>
        </ControlRow>
        <ControlRow p={1} spacing={2} direction="row" alignItems="center">
          <Stack direction="row">
            <Tooltip title="Rewind 5 seconds">
              <IconButton
                disabled={audioBuffer === null}
                onClick={() => seek(Math.max(0, getProgress() - 5))}
              >
                <Replay5Icon />
              </IconButton>
            </Tooltip>
            <Tooltip title={playerStatus.state === "paused" ? "Play" : "Pause"}>
              <Fab
                color="primary"
                disabled={audioBuffer === null}
                size="small"
                onClick={() => {
                  playerStatus.state === "playing" ? pause() : play();
                }}
              >
                {playerStatus.state === "paused" ? (
                  <PlayArrowIcon />
                ) : (
                  <PauseIcon />
                )}
              </Fab>
            </Tooltip>
            <Tooltip title="Forward 5 seconds">
              <IconButton
                disabled={audioBuffer === null}
                onClick={() =>
                  seek(Math.min(audioBuffer.duration, getProgress() + 5))
                }
              >
                <Forward5Icon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Speed down 0.05x">
              <IconButton
                disabled={audioBuffer === null}
                onClick={() => setRate(Math.min(2, playerStatus.rate - 0.05))}
              >
                <SpeedIcon sx={{ transform: "scaleX(-1)" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Speed up 0.05x">
              <IconButton
                disabled={audioBuffer === null}
                onClick={() => setRate(Math.max(0.5, playerStatus.rate + 0.05))}
              >
                <SpeedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          <Slider
            sx={{
              "& .MuiSlider-track, & .MuiSlider-thumb": {
                transitionDuration: "0s",
              },
            }}
            aria-label="Playback progress"
            value={!isDragging ? playbackProgress * 1 : seekBarTime}
            getAriaValueText={formatTime}
            min={0}
            max={audioBuffer?.duration ?? 0}
            disabled={audioBuffer === null}
            onChange={(evt, newValue, activeThumb) => {
              console.log("onChange", evt, newValue, activeThumb);
              setIsDragging(true);
              setSeekBarTime(newValue as number);
            }}
            onChangeCommitted={(evt, newValue) => {
              seek(newValue as number);
              setIsDragging(false);
            }}
          />
          <Typography
            variant="body1"
            sx={{
              marginTop: 2,
              marginBottom: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTime(playbackProgress)}/
            {formatTime(audioBuffer?.duration ?? NaN)}@
            {playerStatus.rate.toFixed(2)}x
          </Typography>
        </ControlRow>
      </Box>
    </div>
  );
}
