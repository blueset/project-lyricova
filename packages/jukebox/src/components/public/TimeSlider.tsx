import { formatTime } from "../../frontendUtils/strings";
import { useNamedState } from "../../hooks/useNamedState";
import type { RefObject } from "react";
import { useEffect, useCallback } from "react";
import _ from "lodash";
import { Slider } from "@lyricova/components/components/ui/slider";
import { cn } from "@lyricova/components/utils";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
  disabled: boolean;
  isCollapsed: boolean;
  className?: string;
}

export function TimeSlider({
  playerRef,
  disabled,
  isCollapsed,
  className,
}: Props) {
  const [time, setTime] = useNamedState(0, "time");
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");
  const [duration, setDuration] = useNamedState(0, "duration");

  const updateTime = useCallback(() => {
    if (playerRef.current !== null && !isDragging) {
      setTime(playerRef.current.currentTime);
    }
  }, [isDragging, playerRef, setTime]);

  const onSliderChange = useCallback(
    (newValue: number[]) => {
      setTime(newValue[0]);
      setIsDragging(true);
    },
    [setIsDragging, setTime]
  );

  const onSliderChangeCommitted = useCallback(
    (newValue: number[]) => {
      if (playerRef.current) {
        if (playerRef.current.fastSeek) {
          playerRef.current.fastSeek(newValue[0]);
        } else {
          playerRef.current.currentTime = _.floor(newValue[0], 3);
        }
        setTime(newValue[0]);
        setIsDragging(false);
      }
    },
    [playerRef, setIsDragging, setTime]
  );

  const updateDuration = useCallback(() => {
    setDuration(playerRef.current?.duration);
  }, [playerRef, setDuration]);

  useEffect(() => {
    const playerElm = playerRef.current;
    if (playerElm !== null) {
      playerElm.addEventListener("timeupdate", updateTime);
      playerElm.addEventListener("durationchange", updateDuration);
      playerElm.addEventListener("loadedmetadata", updateDuration);
      updateTime();
      updateDuration();
    }
    return function cleanUp() {
      if (playerElm !== null) {
        playerElm.removeEventListener("timeupdate", updateTime);
        playerElm.removeEventListener("durationchange", updateDuration);
        playerElm.removeEventListener("loadedmetadata", updateDuration);
      }
    };
  }, [playerRef, updateDuration, updateTime]);

  return (
    <div
      className={cn(
        "w-full group-data-[collapsed]/player:md:flex-grow group-data-[collapsed]/player:md:w-auto",
        className
      )}
      id="player-time-slider"
    >
      <Slider
        defaultValue={[0]}
        value={[isNaN(time) ? 0 : time]}
        max={isNaN(duration) ? 0 : duration}
        step={0.001}
        disabled={disabled}
        onValueChange={onSliderChange}
        onValueCommit={onSliderChangeCommitted}
        aria-label="Time"
        className="h-6"
      />
      <div className="w-full flex flex-row text-sm text-muted-foreground tabular-nums justify-between">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
