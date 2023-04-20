import {
  Fab,
  IconButton,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { formatTime } from "../../../../frontendUtils/strings";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import Forward5Icon from "@mui/icons-material/Forward5";
import Replay5Icon from "@mui/icons-material/Replay5";
import SpeedIcon from "@mui/icons-material/Speed";
import {
  WebAudioPlayerState,
  useNamedState,
} from "../../../../frontendUtils/hooks";
import { memo, useCallback } from "react";

export interface WebAudioControlsProps {
  audioBuffer?: AudioBuffer;
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  setRate: (rate: number) => void;
  getProgress: () => number;
  playerStatus: WebAudioPlayerState;
  playbackProgress: number;
}

export function Rewind5({
  audioBuffer,
  seek,
  getProgress,
}: Pick<WebAudioControlsProps, "audioBuffer" | "seek" | "getProgress">) {
  return (
    <Tooltip title="Rewind 5 seconds">
      <IconButton
        disabled={audioBuffer === null}
        onClick={() => seek(Math.max(0, getProgress() - 5))}
      >
        <Replay5Icon />
      </IconButton>
    </Tooltip>
  );
}
const Rewind5Memo = memo(Rewind5, (prevProps, nextProps) => {
  return (
    prevProps.audioBuffer === nextProps.audioBuffer &&
    prevProps.getProgress === nextProps.getProgress &&
    prevProps.seek === nextProps.seek
  );
});

export function PlayPause({
  audioBuffer,
  playerStatus,
  play,
  pause,
}: Pick<
  WebAudioControlsProps,
  "audioBuffer" | "playerStatus" | "play" | "pause"
>) {
  return (
    <Tooltip title={playerStatus.state === "paused" ? "Play" : "Pause"}>
      <Fab
        color="primary"
        disabled={audioBuffer === null}
        size="small"
        onClick={() => {
          playerStatus.state === "playing" ? pause() : play();
        }}
      >
        {playerStatus.state === "paused" ? <PlayArrowIcon /> : <PauseIcon />}
      </Fab>
    </Tooltip>
  );
}
const PlayPauseMemo = memo(PlayPause, (prevProps, nextProps) => {
  return (
    prevProps.audioBuffer === nextProps.audioBuffer &&
    prevProps.playerStatus?.state === nextProps.playerStatus?.state &&
    prevProps.play === nextProps.play &&
    prevProps.pause === nextProps.pause
  );
});

function Forward5({
  audioBuffer,
  seek,
  getProgress,
}: Pick<WebAudioControlsProps, "audioBuffer" | "seek" | "getProgress">) {
  return (
    <Tooltip title="Forward 5 seconds">
      <IconButton
        disabled={audioBuffer === null}
        onClick={() => seek(Math.min(audioBuffer.duration, getProgress() + 5))}
      >
        <Forward5Icon />
      </IconButton>
    </Tooltip>
  );
}
const Forward5Memo = memo(Forward5, (prevProps, nextProps) => {
  return (
    prevProps.audioBuffer === nextProps.audioBuffer &&
    prevProps.getProgress === nextProps.getProgress &&
    prevProps.seek === nextProps.seek
  );
});

function SpeedDown({
  audioBuffer,
  playerStatus,
  setRate,
}: Pick<WebAudioControlsProps, "audioBuffer" | "setRate" | "playerStatus">) {
  return (
    <Tooltip title="Speed down 0.05x">
      <IconButton
        disabled={audioBuffer === null}
        onClick={() => setRate(Math.min(2, playerStatus.rate - 0.05))}
      >
        <SpeedIcon sx={{ transform: "scaleX(-1)" }} />
      </IconButton>
    </Tooltip>
  );
}
const SpeedDownMemo = memo(SpeedDown, (prevProps, nextProps) => {
  return (
    prevProps.audioBuffer === nextProps.audioBuffer &&
    prevProps.playerStatus?.rate === nextProps.playerStatus?.rate &&
    prevProps.setRate === nextProps.setRate
  );
});

function SpeedUp({
  audioBuffer,
  playerStatus,
  setRate,
}: Pick<WebAudioControlsProps, "audioBuffer" | "setRate" | "playerStatus">) {
  return (
    <Tooltip title="Speed up 0.05x">
      <IconButton
        disabled={audioBuffer === null}
        onClick={() => setRate(Math.max(0.5, playerStatus.rate + 0.05))}
      >
        <SpeedIcon />
      </IconButton>
    </Tooltip>
  );
}
const SpeedUpMemo = memo(SpeedUp, (prevProps, nextProps) => {
  return (
    prevProps.audioBuffer === nextProps.audioBuffer &&
    prevProps.playerStatus?.rate === nextProps.playerStatus?.rate &&
    prevProps.setRate === nextProps.setRate
  );
});

function Seekbar({
  audioBuffer,
  seek,
  playbackProgress,
  playerStatus,
}: Pick<
  WebAudioControlsProps,
  "audioBuffer" | "seek" | "playbackProgress" | "playerStatus"
>) {
  const [seekBarTime, setSeekBarTime] = useNamedState(0, "seekBarTime");
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");
  const handleOnChange = useCallback(
    (evt: Event, newValue: number | number[]) => {
      setIsDragging(true);
      setSeekBarTime(newValue as number);
    },
    [setIsDragging, setSeekBarTime]
  );
  const handleOnChangeCommitted = useCallback(
    (evt: Event, newValue: number | number[]) => {
      seek(newValue as number);
      setIsDragging(false);
    },
    [seek, setIsDragging]
  );

  return (
    <>
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
        onChange={handleOnChange}
        onChangeCommitted={handleOnChangeCommitted}
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
    </>
  );
}

export function WebAudioControls({
  audioBuffer,
  seek,
  play,
  pause,
  setRate,
  getProgress,
  playerStatus,
  playbackProgress,
}: WebAudioControlsProps) {
  return (
    <>
      <Stack direction="row">
        <Rewind5Memo
          audioBuffer={audioBuffer}
          getProgress={getProgress}
          seek={seek}
        />
        <PlayPauseMemo
          audioBuffer={audioBuffer}
          playerStatus={playerStatus}
          play={play}
          pause={pause}
        />
        <Forward5Memo
          audioBuffer={audioBuffer}
          getProgress={getProgress}
          seek={seek}
        />
        <SpeedDownMemo
          audioBuffer={audioBuffer}
          setRate={setRate}
          playerStatus={playerStatus}
        />
        <SpeedUpMemo
          audioBuffer={audioBuffer}
          setRate={setRate}
          playerStatus={playerStatus}
        />
      </Stack>
      <Seekbar
        audioBuffer={audioBuffer}
        seek={seek}
        playbackProgress={playbackProgress}
        playerStatus={playerStatus}
      />
    </>
  );
}
