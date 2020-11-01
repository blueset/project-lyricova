import { Slider, Typography, makeStyles } from "@material-ui/core";
import { formatTime } from "../../frontendUtils/strings";
import { useNamedState } from "../../frontendUtils/hooks";
import { RefObject, useEffect, useCallback } from "react";
import _ from "lodash";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
  disabled: boolean;
  isCollapsed: boolean;
}

const useStyle = makeStyles((theme) => ({
  expandedSliderContainer: {
    width: "100%",
  },
  collapsedSliderContainer: {
    [theme.breakpoints.up("md")]: {
      flexGrow: 1,
    },
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
  sliderLabelContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    marginTop: "-1em",
  },
  sliderLabelStretcher: {
    flexGrow: 1,
  },
  sliderLabelText: {
    opacity: 0.5,
    fontVariantNumeric: "tabular-nums",
  },
}));

export function TimeSlider({ playerRef, disabled, isCollapsed }: Props) {
  const [time, setTime] = useNamedState(0, "time");
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");
  const [duration, setDuration] = useNamedState(0, "duration");

  const style = useStyle();

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

  return (<div className={isCollapsed ? style.collapsedSliderContainer : style.expandedSliderContainer} id="player-time-slider">
    <Slider
      defaultValue={0}
      value={time}
      getAriaValueText={formatTime}
      max={duration}
      disabled={disabled}
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
  </div>);
}