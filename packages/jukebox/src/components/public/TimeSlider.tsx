import { Slider, Typography, makeStyles, Stack, Box } from "@mui/material";
import { formatTime } from "../../frontendUtils/strings";
import { useNamedState } from "../../frontendUtils/hooks";
import { RefObject, useEffect, useCallback } from "react";
import _ from "lodash";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
  disabled: boolean;
  isCollapsed: boolean;
}

export function TimeSlider({ playerRef, disabled, isCollapsed }: Props) {
  const [time, setTime] = useNamedState(0, "time");
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");
  const [duration, setDuration] = useNamedState(0, "duration");

  function updateTime() {
    // console.log("updateTime, playerRef", playerRef.current, playerRef);
    if (playerRef.current !== null && !isDragging) {
      setTime(playerRef.current.currentTime);
    }
  }

  const onSliderChange = useCallback((event: unknown, newValue: number) => {
    setTime(newValue);
    setIsDragging(true);
  }, []);

  const onSliderChangeCommitted = useCallback((event: unknown, newValue: number) => {
    if (playerRef.current.fastSeek) {
      playerRef.current.fastSeek(newValue);
    } else {
      playerRef.current.currentTime = _.floor(newValue, 3);
    }
    setTime(newValue);
    setIsDragging(false);
  }, [playerRef, setIsDragging, setTime]);

  const updateDuration = useCallback(() => {
    setDuration(playerRef.current?.duration);
  }, [playerRef, setDuration]);

  useEffect(() => {
    const playerElm = playerRef.current;
    // console.log("trying to register listeners");
    if (playerElm !== null) {
      // console.log("registering listeners");
      playerElm.addEventListener("timeupdate", updateTime);
      playerElm.addEventListener("durationchange", updateDuration);
      playerElm.addEventListener("loadedmetadata", updateDuration);
      updateTime();
      updateDuration();
    }
    return function cleanUp() {
      // console.log("trying to remove listeners");
      if (playerElm !== null) {
        // console.log("removing listeners");
        playerElm.removeEventListener("timeupdate", updateTime);
        playerElm.removeEventListener("durationchange", updateDuration);
        playerElm.removeEventListener("loadedmetadata", updateDuration);
      }
    };
  }, [playerRef]);

  return (<Box sx={isCollapsed ? {
    flexGrow: {md: 1},
    width: {xs: "100%", md: "auto"},
  } : {width: "100%"}} id="player-time-slider">
    <Slider
      defaultValue={0}
      value={time}
      getAriaValueText={formatTime}
      max={duration}
      disabled={disabled}
      onChange={onSliderChange}
      onChangeCommitted={onSliderChangeCommitted}
    />
    <Stack direction="row" sx={{width: "100%", marginTop: "-1em",}}>
      <Typography
        variant="body2"
        component="span"
        sx={{opacity: 0.5, fontVariantNumeric: "tabular-nums",}}
      >
        {formatTime(time)}
      </Typography>
      <span style={{flexGrow: 1,}}/>
      <Typography
        variant="body2"
        component="span"
        sx={{opacity: 0.5, fontVariantNumeric: "tabular-nums",}}
      >
        {formatTime(duration)}
      </Typography>
    </Stack>
  </Box>);
}