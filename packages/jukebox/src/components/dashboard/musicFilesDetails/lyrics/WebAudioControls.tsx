import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Button } from "@lyricova/components/components/ui/button";
import { Slider } from "@lyricova/components/components/ui/slider";
import { formatTime } from "../../../../frontendUtils/strings";
import { Play, Pause, FastForward, Rewind, Gauge } from "lucide-react";
import { useNamedState } from "../../../../hooks/useNamedState";
import type { WebAudioPlayerState } from "../../../../hooks/types";
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!audioBuffer}
            onClick={() => seek(Math.max(0, getProgress() - 5))}
          >
            <Rewind />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Rewind 5 seconds</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const isPaused = playerStatus.state === "paused";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            disabled={!audioBuffer}
            onClick={() => {
              isPaused ? play() : pause();
            }}
            className="rounded-full size-10 mx-1"
          >
            {isPaused ? <Play /> : <Pause />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isPaused ? "Play" : "Pause"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!audioBuffer}
            onClick={() =>
              seek(
                Math.min(audioBuffer?.duration ?? Infinity, getProgress() + 5)
              )
            }
          >
            <FastForward />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Forward 5 seconds</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!audioBuffer}
            onClick={() => setRate(Math.max(0.5, playerStatus.rate - 0.05))} // Ensure rate doesn't go below 0.5
          >
            {/* Use transform scale for visual direction */}
            <Gauge className="transform -scale-x-100" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Speed down 0.05x</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={!audioBuffer}
            onClick={() => setRate(Math.min(2, playerStatus.rate + 0.05))} // Ensure rate doesn't go above 2
          >
            <Gauge />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Speed up 0.05x</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const [seekBarValue, setSeekBarValue] = useNamedState<number[]>(
    [0],
    "seekBarValue"
  );
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");

  const handleValueChange = useCallback(
    (newValue: number[]) => {
      setIsDragging(true);
      setSeekBarValue(newValue);
    },
    [setIsDragging, setSeekBarValue]
  );

  const handleValueCommit = useCallback(
    (newValue: number[]) => {
      seek(newValue[0]);
      setIsDragging(false);
    },
    [seek, setIsDragging]
  );

  const displayValue = !isDragging ? [playbackProgress] : seekBarValue;
  const duration = audioBuffer?.duration ?? 0;

  return (
    <>
      <Slider
        aria-label="Playback progress"
        value={displayValue}
        min={0}
        max={duration}
        step={0.1}
        disabled={!audioBuffer}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        className="my-2"
      />
      <p className="mt-2 mb-2 text-sm tabular-nums">
        {" "}
        {formatTime(displayValue[0])}
        <span className="text-muted-foreground">/{formatTime(duration)}@</span>
        {playerStatus.rate.toFixed(2)}x
      </p>
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
      <div className="flex flex-row items-center justify-center">
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
      </div>
      <Seekbar
        audioBuffer={audioBuffer}
        seek={seek}
        playbackProgress={playbackProgress}
        playerStatus={playerStatus}
      />
    </>
  );
}
