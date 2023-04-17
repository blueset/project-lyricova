/**
 * Inline lyrics tagging.
 * Based on the design of RhythmicaLyrics.
 * RhythmicaLyrics by MIZUSHIKI, released under custom permissive license.
 * http://suwa.pupu.jp/RhythmicaLyrics.html
 */

import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  WebAudioPlayerState,
  useNamedState,
  useWebAudio,
} from "../../../../frontendUtils/hooks";
import {
  Box,
  Button,
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
import { InlineTaggingLineMemo } from "./InlineTaggingLine";
import { useSnackbar } from "notistack";
import {
  Lyrics,
  LyricsLine,
  WordTimeTag,
  WordTimeTagLabel,
} from "lyrics-kit/core";
import {
  MoveCursorUp,
  MoveCursorDown,
  MoveCursorLeft,
  MoveCursorRight,
  setDot,
  setHoldDot,
  setDropDot,
  MoveDotCursorDown,
  MoveDotCursorLeft,
  MoveDotCursorRight,
  MoveDotCursorUp,
  setMark,
  setDropMark,
} from "./InlineTaggingKeyPresses";
import { populateDots } from "./InlineTaggingDots";

interface CurrentLineState {
  index: number;
  start: number;
  end: number;
}

const BLANK_LINE = { index: -Infinity, start: Infinity, end: -Infinity };

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
  const snackbar = useSnackbar();

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
  const section = playerStatus.state === "playing" ? "tag" : "mark";
  const [dots, setDots] = useNamedState<number[][]>([], "dots");
  const dotsRef = useRef<number[][]>();
  dotsRef.current = dots;

  const [tags, setTags] = useNamedState<number[][][]>([], "tags");
  const tagsRef = useRef<number[][][]>();
  tagsRef.current = tags;

  // Parse lyrics
  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;

    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error occurred while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(
        `Error occurred while loading lyrics text: ${e}`,
        { variant: "error" }
      );
      return null;
    }
  }, [lyrics, snackbar]);

  // Parse and set `lines`.
  const [lines, setLines] = useNamedState<LyricsLine[]>([], "lines");
  const linesRef = useRef<LyricsLine[]>();
  linesRef.current = lines;
  useEffect(() => {
    // console.log("useEffect parseLines");
    if (parsedLyrics !== null) {
      const timeTagLines = parsedLyrics.lines.map((l) => {
        const tags = l.attachments.timeTag;
        if (!tags) return null;
        const tagValues: (number | undefined)[] = [];
        tags.tags.forEach((t) => {
          tagValues[t.index] = Math.floor((t.timeTag + l.position) * 1000);
        });
        return [...tagValues];
      });
      setLines([...parsedLyrics.lines]);
      setDots(
        parsedLyrics.lines.map<number[]>((l, idx) => {
          const dots = l.attachments.getTag("dots");
          return dots
            ? dots?.split(",").map((v) => parseInt(v))
            : timeTagLines[idx]
            ? timeTagLines[idx].map((v) => (v ? 1 : 0))
            : Array(l.content.length + 1).fill(0);
        })
      );
      setTags(
        parsedLyrics.lines.map<number[][]>((l, idx) => {
          return (
            l.attachments
              .getTag("tags")
              ?.split(",")
              .map((v) =>
                v
                  ? v
                      .split("/")
                      .map((t) => (t ? parseInt(t) / 1000 : undefined))
                  : []
              ) ??
            timeTagLines[idx]?.map((v) => (v ? [v] : [])) ??
            Array(l.content.length + 1)
              .fill(null)
              .map(() => [])
          );
        })
      );

      return () => {
        const lines = linesRef.current.map((l, idx) => {
          const prevTags = tagsRef.current?.[idx - 1]?.flat();
          const prevEndTime = prevTags ? Math.max(...prevTags) : null;
          const fallbackStartTime = Math.max(l.position, prevEndTime ?? 0);
          const startTime =
            tagsRef.current[idx]?.find((t) => t?.[0])?.[0] ?? fallbackStartTime;
          l.position = startTime;
          l.attachments.setTag("dots", dotsRef.current[idx].join(","));
          l.attachments.setTag(
            "tags",
            tagsRef.current[idx]
              .map((t) => t.map((v) => v && Math.floor(v * 1000)).join("/"))
              .join(",")
          );
          if (tagsRef.current[idx]?.length) {
            const wttls = tagsRef.current[idx].reduce<WordTimeTagLabel[]>(
              (acc, cur, idx) => {
                if (cur?.length > 0) {
                  acc.push(new WordTimeTagLabel(cur[0] - startTime, idx));
                }
                return acc;
              },
              []
            );
            if (wttls.length > 0)
              l.attachments.timeTag = new WordTimeTag(wttls);
          }
          return l;
        });
        parsedLyrics.lines = lines;
        setLyrics(parsedLyrics.toString());
      };
    }
    // dropping dependency [parsedLyrics] to prevent loop with parsedLyrics.
  }, [setLines, setLyrics]);

  const [cursorPos, setCursorPos] = useState<[number, number]>([0, 0]);
  const [dotCursorPos, setDotCursorPos] = useState<[number, number, number]>([
    0, 0, 0,
  ]);

  // Switching between mark and tag mode
  useEffect(() => {
    // console.log("useEffect switchMode");
    // console.log("section", section);
    if (section === "tag") {
      let [lineIdx, charIdx] = cursorPos;
      while (
        dots.length &&
        charIdx < dots[lineIdx]?.length &&
        lineIdx < dots.length
      ) {
        if (dots[lineIdx][charIdx]) {
          // console.log("set dot cursor pos", lineIdx, charIdx, 0);
          setDotCursorPos([lineIdx, charIdx, 0]);
          return;
        } else if (charIdx === dots[lineIdx].length - 1) {
          lineIdx++;
          charIdx = 0;
        } else {
          charIdx++;
        }
      }
      if (
        !dots.length ||
        charIdx >= dots[lineIdx].length ||
        lineIdx >= dots.length
      ) {
        // console.log("set dot cursor pos (fallback)", 0, 0, 0);
        setDotCursorPos([0, 0, 0]);
      }
    } else if (section === "mark") {
      // console.log("set cursor pos", dotCursorPos[0], dotCursorPos[1]);
      setCursorPos([dotCursorPos[0], dotCursorPos[1]]);
    }
    // explicitly only depend on `section` to reduce unnecessary re-renders.
  }, [section]);

  // Register arrow key press events
  useEffect(() => {
    // console.log("useEffect arrowKeys");
    const dots = dotsRef.current;
    const handleCursorKeyPress = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (section === "mark") {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          setCursorPos(MoveCursorUp(lines));
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setCursorPos(MoveCursorDown(lines));
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          setCursorPos(MoveCursorLeft(lines));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          setCursorPos(MoveCursorRight(lines));
        }
      } else if (section === "tag") {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          setDotCursorPos(MoveDotCursorUp(dots));
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setDotCursorPos(MoveDotCursorDown(dots));
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          setDotCursorPos(MoveDotCursorLeft(dots));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          setDotCursorPos(MoveDotCursorRight(dots));
        }
      }
    };

    window.addEventListener("keydown", handleCursorKeyPress);
    return () => {
      window.removeEventListener("keydown", handleCursorKeyPress);
    };
  }, [setCursorPos, lines, section]);

  // Register space and backspace key press events
  useEffect(() => {
    // console.log("useEffect spaceBackspace");
    const dots = dotsRef.current;
    if (section === "mark") {
      const handleLabelKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) {
            setDot(setDots, setCursorPos);
          } else {
            setHoldDot(setDots, setCursorPos);
          }
        } else if (event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          setDropDot(lines, setDots, setCursorPos);
        }
      };

      window.addEventListener("keydown", handleLabelKeyDown);
      return () => {
        window.removeEventListener("keydown", handleLabelKeyDown);
      };
    } else if (section === "tag") {
      const handleLabelKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
          return;
        if (event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          setMark(getProgress(), setTags, setDotCursorPos);
          setDotCursorPos(MoveDotCursorRight(dots));
        } else if (event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          setDropMark(dots, setTags, setDotCursorPos, seek);
        }
      };

      const handleLabelKeyUp = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          setDotCursorPos((prev) => {
            if (dots[prev[0]][prev[1]] === -1) {
              const _setDotCursorPos = (
                putPos: SetStateAction<[number, number, number]>
              ) => typeof putPos === "function" && putPos(prev);
              setMark(getProgress(), setTags, _setDotCursorPos);
              return MoveDotCursorRight(dots)(prev);
            }
            return prev;
          });
        }
      };

      window.addEventListener("keydown", handleLabelKeyDown);
      window.addEventListener("keyup", handleLabelKeyUp);

      return () => {
        window.removeEventListener("keydown", handleLabelKeyDown);
        window.removeEventListener("keyup", handleLabelKeyUp);
      };
    }
  }, [
    setCursorPos,
    lines,
    setLines,
    cursorPos,
    setDots,
    setTags,
    section,
    getProgress,
    seek,
  ]);

  const [currentLine, setCurrentLine] = useNamedState<CurrentLineState>(
    BLANK_LINE,
    "currentLine"
  );
  const currentLineRef = useRef<CurrentLineState>();
  currentLineRef.current = currentLine;

  const timelineRef = useRef<gsap.core.Timeline>();

  // Update time tags
  const onFrame = useCallback(() => {
    const playerStatus = playerStatusRef.current;
    const currentLine = currentLineRef.current;
    const tags = tagsRef.current;
    const startPerLine = tags.map((t) => {
      const tf = t.flat();
      if (tf.length) {
        return Math.min(...tf);
      }
      return null;
    });

    const time = getProgress();
    setPlaybackProgress(time);

    if (
      (time < currentLine.start || time > currentLine.end) &&
      startPerLine.length > 0
    ) {
      // console.log("set current line", startPerLine, time);
      const record = startPerLine.reduce(
        (p, c, i) => {
          if (c) {
            if (c < p.end && c > time) {
              p.end = c;
            }
            if (c > p.start && c <= time) {
              p.start = c;
              p.index = i;
            }
          }
          return p;
        },
        { index: -Infinity, start: -Infinity, end: Infinity }
      );
      // console.log("set current line", record);
      setCurrentLine(record);
    }

    if (playerStatus.state === "playing") {
      requestAnimationFrame(onFrame);
    }
  }, [getProgress, setCurrentLine, setPlaybackProgress]);

  useEffect(() => {
    // console.log("useEffect playPauseTimeline");
    requestAnimationFrame(onFrame);
    if (timelineRef.current) {
      const progress = getProgress();
      if (playerStatus.state === "playing") {
        // console.log("play", progress);
        timelineRef.current.play(progress);
      } else if (playerStatus.state === "paused") {
        // console.log("pause", progress);
        timelineRef.current.pause(progress);
      }
    }
  }, [getProgress, onFrame, playerStatus]);

  // Register playback control listener
  useEffect(() => {
    const listener = (ev: KeyboardEvent): void => {
      const { code, key } = ev;
      const codeOrKey = code || key;

      if (ev.metaKey === true || ev.ctrlKey === true) {
        if (["ArrowUp", "KeyJ", "Up", "J", "j"].includes(codeOrKey)) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!audioBuffer) return;
          const rate = playerStatusRef.current.rate;
          const newRate = rate + 0.05;
          setRate(newRate);
        } else if (
          ["ArrowDown", "KeyK", "Down", "K", "k"].includes(codeOrKey)
        ) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!audioBuffer) return;
          const rate = playerStatusRef.current.rate;
          const newRate = rate - 0.05;
          setRate(newRate);
        } else if (codeOrKey === "Enter") {
          ev.preventDefault();
          ev.stopPropagation();
          if (!audioBuffer) return;
          if (playerStatusRef.current.state === "paused") play();
          else pause();
        } else if (code === "KeyR" || key === "R" || key === "r") {
          ev.preventDefault();
          ev.stopPropagation();
          setRate(1);
        } else if (codeOrKey === "ArrowLeft" || codeOrKey === "Left") {
          ev.preventDefault();
          ev.stopPropagation();
          if (!audioBuffer) return;
          const time = getProgress();
          seek(time - 5);
        } else if (codeOrKey === "ArrowRight" || codeOrKey === "Right") {
          ev.preventDefault();
          ev.stopPropagation();
          if (!audioBuffer) return;
          const time = getProgress();
          seek(time + 5);
        }
        return;
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }, [audioBuffer, getProgress, pause, play, seek, setRate]);

  return (
    <Stack gap={1} sx={{ height: "100%" }}>
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
          <Button
            variant="outlined"
            onClick={() => setDots(populateDots(lines))}
          >
            Populate&nbsp;marks
          </Button>
          <DismissibleAlert
            severity="warning"
            collapseProps={{ sx: { flexGrow: 1 } }}
          >
            Switch to another tab to save changes. Arrow keys: Navigate; Space:
            Tag; Bksp: Remove; Cmd/Ctrl+(↑J/↓K: speed; R: reset speed; Enter:
            play/pause, ←/→: +/-5 seconds).
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
      <Box sx={{ flexGrow: 1, height: 0, overflow: "auto", mx: -1, px: 1 }}>
        {lines.map((l, idx) => (
          <InlineTaggingLineMemo
            key={idx}
            line={l}
            dots={dots[idx]}
            tags={tags[idx]}
            timelineRef={timelineRef}
            playerStatusRef={playerStatusRef}
            getProgress={getProgress}
            relativeProgress={
              currentLine.index === idx ? 0 : currentLine.index > idx ? -1 : 1
            }
            cursorIdx={
              section === "mark" && cursorPos[0] === idx
                ? cursorPos[1]
                : undefined
            }
            dotCursorIdx={
              section === "tag" && dotCursorPos[0] === idx
                ? [dotCursorPos[1], dotCursorPos[2]]
                : undefined
            }
            onUpdateCursor={(cursorIdx) =>
              section === "mark"
                ? setCursorPos([idx, cursorIdx])
                : setDotCursorPos([idx, cursorIdx, 0])
            }
          />
        ))}
      </Box>
    </Stack>
  );
}
