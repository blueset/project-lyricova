/**
 * Inline lyrics tagging.
 * Based on the design of RhythmicaLyrics.
 * RhythmicaLyrics by MIZUSHIKI, released under custom permissive license.
 * http://suwa.pupu.jp/RhythmicaLyrics.html
 */

import React, {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import type { WebAudioPlayerState } from "../../../../../hooks/types";
import { useNamedState } from "../../../../../hooks/useNamedState";
import { useWebAudio } from "../../../../../hooks/useWebAudio";
import { Box, Button, Stack, styled } from "@mui/material";
import DismissibleAlert from "../../../DismissibleAlert";
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
import { WebAudioControls } from "../WebAudioControls";
import { isNaN } from "lodash";
import { populateDotsEn } from "./InlineTaggingEnSyllables";

function Instructions() {
  return (
    <DismissibleAlert
      severity="warning"
      collapseProps={{ sx: { flexGrow: 1, width: 0 } }}
    >
      Switch to another tab to save changes. Arrow keys: Navigate; Space: Tag;
      Bksp: Remove; Cmd/Ctrl+(↑J/↓K: speed; R: reset speed; Enter: play/pause,
      ←/→: +/-5 seconds).
    </DismissibleAlert>
  );
}
const InstructionsMemo = memo(Instructions);

interface CurrentLineState {
  indices: number[];
  start: number;
  end: number;
  borderIndex: number;
}

const BLANK_LINE: CurrentLineState = {
  indices: [],
  start: Infinity,
  end: -Infinity,
  borderIndex: -Infinity,
};

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
  const playerStatusRef = useRef<WebAudioPlayerState>(playerStatus);
  playerStatusRef.current = playerStatus;

  const [playbackProgress, setPlaybackProgress] = useNamedState(
    0,
    "playbackProgress"
  );
  const section = playerStatus.state === "playing" ? "tag" : "mark";
  const [dots, setDots] = useNamedState<number[][]>([], "dots");
  const dotsRef = useRef<number[][]>();
  dotsRef.current = dots;

  const [tags, setTags] = useNamedState<number[][][]>([], "tags");
  const tagsRef = useRef<number[][][]>();
  tagsRef.current = tags;

  const taggingAreaRef = useRef<HTMLDivElement>();

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
          tagValues[t.index] = t.timeTag + l.position;
        });
        return [...tagValues];
      });
      setLines([...parsedLyrics.lines]);
      setDots(
        parsedLyrics.lines.map<number[]>((l, idx) => {
          const dots = l.attachments.getTag("dots");
          const out = dots
            ? dots?.split(",").map((v) => parseInt(v))
            : timeTagLines[idx]
            ? timeTagLines[idx].map((v) => (v ? 1 : 0))
            : Array(l.content.length + 1).fill(0);
          // force array to have size l.content.length + 1
          return [
            ...out.slice(0, l.content.length + 1),
            ...Array(Math.max(0, l.content.length - out.length + 1)).fill(0),
          ];
        })
      );
      setTags(
        parsedLyrics.lines.map<number[][]>((l, idx) => {
          const out =
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
              .map((): number[] => []);
          // force array to have size l.content.length + 1
          return [
            ...out.slice(0, l.content.length + 1),
            ...Array(Math.max(0, l.content.length - out.length + 1))
              .fill(null)
              .map((): number[] => []),
          ];
        })
      );

      return () => {
        const lines = linesRef.current.map((l, idx) => {
          const prevTags = tagsRef.current?.[idx - 1]?.flat();
          const prevEndTime = prevTags?.length ? Math.max(...prevTags) : null;
          const nextTags = tagsRef.current?.[idx + 1]?.flat();
          const nextStartTime = nextTags?.length
            ? Math.min(...nextTags) - 0.001
            : null;
          const fallbackStartTime =
            isNaN(l.position) && !prevEndTime
              ? NaN
              : isNaN(l.position)
              ? prevEndTime
              : !prevEndTime
              ? l.position
              : l.content
              ? Math.max(isNaN(l.position) ? 0 : l.position, prevEndTime ?? 0)
              : // Force empty line to use prevEndTime or nextStartTime whichever is earlier
                (prevEndTime &&
                  nextStartTime &&
                  Math.min(prevEndTime, nextStartTime)) ??
                nextStartTime ??
                prevEndTime;
          const firstTag = tagsRef.current[idx]?.find((t) => t?.[0])?.[0];
          const startTime = firstTag || fallbackStartTime;
          l.position = startTime;
          l.attachments.setTag("dots", dotsRef.current[idx].join(","));
          l.attachments.setTag(
            "tags",
            tagsRef.current[idx]
              .map((t) =>
                t.map((t) => (t ? Math.floor(t * 1000) : t)).join("/")
              )
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
        lineIdx < dots.length &&
        charIdx < dots[lineIdx]?.length
      ) {
        if (dots[lineIdx][charIdx]) {
          // console.log("set dot cursor pos", lineIdx, charIdx, 0);
          setDotCursorPos([lineIdx, charIdx, 0]);
          return;
        } else if (charIdx === dots[lineIdx]?.length - 1) {
          lineIdx++;
          charIdx = 0;
        } else {
          charIdx++;
        }
      }
      if (
        !dots.length ||
        charIdx >= dots[lineIdx]?.length ||
        lineIdx >= dots.length
      ) {
        // console.log("set dot cursor pos (fallback)", 0, 0, 0);
        setDotCursorPos([0, 0, 0]);
      }
    } else if (section === "mark") {
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

  const timelinesRef = useRef<gsap.core.Timeline[]>([]);

  // Update time tags
  const onFrame = useCallback(() => {
    const playerStatus = playerStatusRef.current;
    // console.log("onFrame", playerStatus.state);
    const currentLine = currentLineRef.current;
    const tags = tagsRef.current;
    const startPerLine = tags.map((t) => {
      const tf = t.flat();
      if (tf.length) {
        return { start: Math.min(...tf), end: Math.max(...tf) };
      }
      return null;
    });

    const time = getProgress();
    setPlaybackProgress(time);

    if (
      ((time < currentLine.start || time > currentLine.end) &&
        startPerLine.length > 0) ||
      playerStatus.state === "paused"
    ) {
      // console.log("set current line", startPerLine, time);
      const record = startPerLine.reduce<CurrentLineState>(
        (p, c, i) => {
          if (c) {
            if (c.start <= time && time < c.end) {
              p.indices.push(i);
            }
            if (c.start <= time) p.start = Math.max(p.start, c.start);
            if (c.end <= time) {
              p.start = Math.max(p.start, c.end);
              p.borderIndex = Math.max(p.borderIndex, i);
            }
            if (time < c.start) {
              p.end = Math.min(p.end, c.start);
            }
            if (time < c.end) {
              p.end = Math.min(p.end, c.end);
            }
          }
          return p;
        },
        { indices: [], start: -Infinity, end: Infinity, borderIndex: -Infinity }
      );
      // console.log("set current line", record);
      setCurrentLine(record);
    }

    if (playerStatus.state === "playing") {
      requestAnimationFrame(onFrame);
    }
  }, [
    getProgress,
    setCurrentLine,
    setPlaybackProgress,
    playerStatusRef,
    currentLineRef,
  ]);

  useEffect(() => {
    // console.log("useEffect playPauseTimeline");
    requestAnimationFrame(onFrame);
    if (timelinesRef.current) {
      const progress = getProgress();
      if (playerStatus.state === "playing") {
        // console.log("play", progress);
        timelinesRef.current.map((t) => t?.play(progress));
      } else if (playerStatus.state === "paused") {
        // console.log("pause", progress);
        timelinesRef.current.map((t) => t?.pause(progress));
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
          if (playerStatusRef.current.state === "paused") {
            play();
            taggingAreaRef.current?.focus();
          } else pause();
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

  // Apply marks to all identical lines
  const applyMarksToAll = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const lineIdx = parseInt(event.currentTarget.dataset.rowIndex);
      setLines((lines) => {
        const line = lines[lineIdx];
        if (!line?.content) return lines;
        setDots((prevDots) => {
          const newDots = [...prevDots];
          lines.forEach((l, i) => {
            if (l.content === line.content) {
              newDots[i] = [...prevDots[lineIdx]];
            }
          });
          return newDots;
        });
        return lines;
      });
    },
    [setLines, setDots]
  );

  const preventSpaceScrollerCallback = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === " ") {
        event.preventDefault();
      }
    },
    []
  );

  const onUpdateCursorHandler = useCallback(
    (event: React.MouseEvent<HTMLElement>, cursorIdx: number) => {
      const idx = parseInt(event.currentTarget.dataset.rowIndex);
      if (section === "mark") {
        setCursorPos([idx, cursorIdx]);
      } else {
        setDotCursorPos([idx, cursorIdx, 0]);
      }
    },
    [section, setCursorPos, setDotCursorPos]
  );

  return (
    <Stack gap={1} sx={{ height: "100%" }} ref={taggingAreaRef}>
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
            Marks&nbsp;(ja)
          </Button>
          <Button
            variant="outlined"
            onClick={() => populateDotsEn(lines).then((dots) => setDots(dots))}
          >
            Marks&nbsp;(en)
          </Button>
          <InstructionsMemo />
        </ControlRow>
        <ControlRow p={1} spacing={2} direction="row" alignItems="center">
          <WebAudioControls
            audioBuffer={audioBuffer}
            seek={seek}
            play={play}
            pause={pause}
            setRate={setRate}
            getProgress={getProgress}
            playerStatus={playerStatus}
            playbackProgress={playbackProgress}
          />
        </ControlRow>
      </Box>
      <Box
        sx={{ flexGrow: 1, height: 0, overflow: "auto", mx: -1, px: 1 }}
        onKeyDown={preventSpaceScrollerCallback}
      >
        {lines.map((l, idx) => (
          <InlineTaggingLineMemo
            key={idx}
            index={idx}
            line={l}
            tags={tags[idx]}
            dots={dots[idx]}
            timelinesRef={timelinesRef}
            playerStatusRef={playerStatusRef}
            getProgress={getProgress}
            applyMarksToAll={applyMarksToAll}
            relativeProgress={
              currentLine.indices.includes(idx) ||
              currentLine.borderIndex == idx
                ? 0
                : currentLine.borderIndex >= idx
                ? -1
                : 1
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
            onUpdateCursor={onUpdateCursorHandler}
          />
        ))}
      </Box>
    </Stack>
  );
}
