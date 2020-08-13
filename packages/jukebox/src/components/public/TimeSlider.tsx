import style from "./TimeSlider.module.scss";
import { Slider, Typography } from "@material-ui/core";
import { formatTime } from "../../frontendUtils/strings";
import { useAppContext } from "./AppContext";
import { useNamedState } from "../../frontendUtils/hooks";
import { RefObject, useEffect } from "react";
import _ from "lodash";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
}

export function TimeSlider({ playerRef }: Props) {
  const [time, setTime] = useNamedState(0, "time");
  const [isDragging, setIsDragging] = useNamedState(false, "isDragging");
  const [duration, setDuration] = useNamedState(0, "duration");

  function updateTime() {
    // console.log("updateTime, playerRef", playerRef.current, playerRef);
    if (playerRef.current !== null && !isDragging) {
      setTime(playerRef.current.currentTime);
    }
  }

  function onSliderChange(event: unknown, newValue: number) {
    setTime(newValue);
    setIsDragging(true);
  }

  function onSliderChangeCommitted(event: unknown, newValue: number) {
    if (playerRef.current.fastSeek) {
      playerRef.current.fastSeek(newValue);
    } else {
      playerRef.current.currentTime = _.floor(newValue, 3);
    }
    setTime(newValue);
    setIsDragging(false);
  }

  function updateDuration() {
    setDuration(playerRef.current?.duration);
  }

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

  return (<>
    <Slider
      defaultValue={0}
      value={time}
      getAriaValueText={formatTime}
      max={duration}
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
  </>);
}