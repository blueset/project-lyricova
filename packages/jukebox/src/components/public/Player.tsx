import style from "./Player.module.scss";
import {
  Paper,
  CardContent,
  Typography,
  Slider,
  IconButton,
  Fab,
} from "@material-ui/core";
import React, { RefObject } from "react";
import SkipPreviousIcon from "@material-ui/icons/SkipPrevious";
import SkipNextIcon from "@material-ui/icons/SkipNext";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PauseIcon from "@material-ui/icons/Pause";
import ShuffleIcon from "@material-ui/icons/Shuffle";
import RepeatOneIcon from "@material-ui/icons/RepeatOne";

interface Props {
  playerRef: RefObject<HTMLAudioElement>;
}

interface State {
  time: number;
  duration: number;
  isPlaying: boolean;
  isDragging: boolean;
}
export default class Player extends React.Component<Props, State> {
  private playerRef: RefObject<HTMLAudioElement>;

  constructor(props: Props) {
    super(props);
    this.state = {
      time: 0,
      isPlaying: false,
      isDragging: false,
      duration: 0,
    };
    this.playerRef = props.playerRef;

    this.clickPlay = this.clickPlay.bind(this);
    this.updateTime = this.updateTime.bind(this);
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.updateDuration = this.updateDuration.bind(this);
    this.formatTime = this.formatTime.bind(this);
    this.onSliderChange = this.onSliderChange.bind(this);
    this.onSliderChangeCommitted = this.onSliderChangeCommitted.bind(this);
  }

  componentDidMount() {
    if (this.playerRef.current !== null) {
      this.playerRef.current.addEventListener("timeupdate", this.updateTime);
      this.playerRef.current.addEventListener("playing", this.onPlay);
      this.playerRef.current.addEventListener("pause", this.onPause);
      this.playerRef.current.addEventListener(
        "durationchange",
        this.updateDuration
      );
      this.playerRef.current.addEventListener(
        "loadedmetadata",
        this.updateDuration
      );
      this.updateTime();
      this.updateDuration();
    }
  }

  componentWillUnmount() {
    if (this.playerRef.current !== null) {
      this.playerRef.current.removeEventListener("timeupdate", this.updateTime);
      this.playerRef.current.removeEventListener("playing", this.onPlay);
      this.playerRef.current.removeEventListener("pause", this.onPause);
      this.playerRef.current.removeEventListener(
        "durationchange",
        this.updateDuration
      );
      this.playerRef.current.removeEventListener(
        "loadedmetadata",
        this.updateDuration
      );
    }
  }

  updateTime() {
    if (!this.state.isDragging) {
      const playerRef = this.playerRef;
      this.setState({
        time: playerRef.current.currentTime,
      });
    }
  }

  clickPlay() {
    if (this.state.isPlaying) {
      this.playerRef.current.pause();
    } else {
      this.playerRef.current.play();
    }
  }

  onPlay() {
    this.setState({ isPlaying: true });
  }

  onPause() {
    this.setState({ isPlaying: false });
  }

  updateDuration() {
    this.setState({
      duration: this.playerRef.current.duration,
    });
  }

  padLeft(number: number, places: number): string {
    return String(number).padStart(places, "0");
  }

  formatTime(value: number): string {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${this.padLeft(minutes, 2)}:${this.padLeft(seconds, 2)}`;
  }

  onSliderChange(event: unknown, newValue: number) {
    this.setState({
      time: newValue,
      isDragging: true,
    });
  }
  onSliderChangeCommitted(event: unknown, newValue: number) {
    this.playerRef.current.currentTime = newValue;
    this.setState({
      time: newValue,
      isDragging: false,
    });
  }

  render() {
    return (
      <Paper className={style.playerPaper}>
        <CardContent>
          <div>
            {/* <div>image</div> */}
            <div>
              <Typography variant="h6">Song name</Typography>
              <Typography variant="subtitle1">Song artist</Typography>
            </div>
          </div>
          <Slider
            defaultValue={0}
            value={this.state.time}
            getAriaValueText={this.formatTime}
            max={this.state.duration}
            onChange={this.onSliderChange}
            onChangeCommitted={this.onSliderChangeCommitted}
          />
          <div className={style.sliderLabelContainer}>
            <Typography
              variant="body2"
              component="span"
              className={style.sliderLabelText}
            >
              {this.formatTime(this.state.time)}
            </Typography>
            <span className={style.sliderLabelStretcher}></span>
            <Typography
              variant="body2"
              component="span"
              className={style.sliderLabelText}
            >
              {this.formatTime(this.state.duration)}
            </Typography>
          </div>
          <div className={style.controlContainer}>
            <IconButton
              color="default"
              aria-label="Shuffle"
              style={{ opacity: 0.5 }}
            >
              <ShuffleIcon />
            </IconButton>
            <IconButton color="default" aria-label="Previous track">
              <SkipPreviousIcon />
            </IconButton>
            <Fab
              color="primary"
              aria-label={this.state.isPlaying ? "Pause" : "Play"}
              size="medium"
              onClick={this.clickPlay}
            >
              {this.state.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </Fab>
            <IconButton color="default" aria-label="Next track">
              <SkipNextIcon />
            </IconButton>
            <IconButton
              color="default"
              aria-label="Repeat one"
              style={{ opacity: 0.5 }}
            >
              <RepeatOneIcon />
            </IconButton>
          </div>
        </CardContent>
      </Paper>
    );
  }
}
