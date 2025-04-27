/**
 * Inline lyrics tagging.
 * Based on the design of RhythmicaLyrics.
 * RhythmicaLyrics by MIZUSHIKI, released under custom permissive license.
 * http://suwa.pupu.jp/RhythmicaLyrics.html
 */

import React, { useCallback, useEffect, useRef, memo } from "react";
import type { WebAudioPlayerState } from "../../../../../hooks/types";
import { useNamedState } from "../../../../../hooks/useNamedState";
import { useWebAudio } from "../../../../../hooks/useWebAudio";
import DismissibleAlert from "../../../DismissibleAlert";
import { InlineTaggingLineMemo } from "./InlineTaggingLine";
import { DOTS, TAGS } from "lyrics-kit/core";
import { populateDots } from "./InlineTaggingDots";
import { WebAudioControls } from "../WebAudioControls";
import { populateDotsEn } from "./InlineTaggingEnSyllables";
import { AlertDescription } from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Toggle } from "@lyricova/components/components/ui/toggle";
import { CheckSquare } from "lucide-react";
import { YohaneAlign } from "./YohaneAlign";

function Instructions() {
  return (
    <DismissibleAlert variant="info" className="grow">
      <AlertDescription>
        Arrow keys: Navigate; Space: Tag; Bksp: Remove; Cmd/Ctrl+(↑J/↓K: speed;
        R: reset speed; Enter: play/pause, ←/→: +/-5 seconds).
      </AlertDescription>
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

interface Props {
  fileId: number;
}

export default function InlineTagging({ fileId }: Props) {
  const { playerStatus, play, pause, seek, setRate, getProgress, audioBuffer } =
    useWebAudio(`/api/files/${fileId}/file`);
  const playerStatusRef = useRef<WebAudioPlayerState>(playerStatus);
  playerStatusRef.current = playerStatus;

  const { linesCount, autoApplyIdentical, setAutoApplyIdentical } =
    useLyricsStore(
      useShallow((state) => ({
        linesCount: state.lyrics?.lines.length ?? 0,
        autoApplyIdentical: state.inlineTagging.autoApplyIdentical,
        setAutoApplyIdentical: state.inlineTagging.setAutoApplyIdentical,
      }))
    );

  useEffect(() => {
    useLyricsStore.getState().inlineTagging.populateDotsAndMarks();
    return () => {
      useLyricsStore.getState().generate();
    };
  }, []);

  const [playbackProgress, setPlaybackProgress] = useNamedState(
    0,
    "playbackProgress"
  );
  const section = playerStatus.state === "playing" ? "tag" : "mark";

  const taggingAreaRef = useRef<HTMLDivElement>(null);

  // Switching between mark and tag mode
  useEffect(() => {
    if (section === "tag") {
      const {
        lyrics,
        inlineTagging: { cursorPosition, setDotCursorPosition },
      } = useLyricsStore.getState();
      let [lineIdx, charIdx] = cursorPosition;
      let lineDots = lyrics?.lines?.[lineIdx]?.attachments?.[DOTS]?.values;
      while (
        lineDots?.length &&
        lineIdx < lyrics.lines.length &&
        charIdx < lineDots?.length
      ) {
        if (lineDots?.[charIdx]) {
          setDotCursorPosition([lineIdx, charIdx, 0]);
          return;
        } else if (lineDots && charIdx === lineDots.length - 1) {
          lineIdx++;
          charIdx = 0;
        } else {
          charIdx++;
        }
        lineDots = lyrics?.lines?.[lineIdx]?.attachments?.[DOTS]?.values;
      }
      if (
        !lyrics?.lines.length ||
        charIdx >= (lineDots?.length ?? 0) ||
        lineIdx >= lyrics.lines.length
      ) {
        setDotCursorPosition([0, 0, 0]);
      }
    } else if (section === "mark") {
      const {
        inlineTagging: { dotCursorPosition, setCursorPosition },
      } = useLyricsStore.getState();
      setCursorPosition([dotCursorPosition[0], dotCursorPosition[1]]);
    }
  }, [section]);

  // Register arrow key press events
  useEffect(() => {
    const handleCursorKeyPress = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (section === "mark") {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveCursorUp();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveCursorDown();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveCursorLeft();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveCursorRight();
        }
      } else if (section === "tag") {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveDotCursorUp();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveDotCursorDown();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveDotCursorLeft();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.moveDotCursorRight();
        }
      }
    };

    window.addEventListener("keydown", handleCursorKeyPress);
    return () => {
      window.removeEventListener("keydown", handleCursorKeyPress);
    };
  }, [section]);

  // Register space and backspace key press events
  useEffect(() => {
    if (section === "mark") {
      const handleLabelKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) {
            useLyricsStore.getState().inlineTagging.setDot();
          } else {
            useLyricsStore.getState().inlineTagging.setHoldDot();
          }
        } else if (event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.dropDot();
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
          useLyricsStore.getState().inlineTagging.setMark(getProgress());
          useLyricsStore.getState().inlineTagging.moveDotCursorRight();
        } else if (event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          useLyricsStore.getState().inlineTagging.dropMark(seek);
        }
      };

      const handleLabelKeyUp = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          const {
            lyrics,
            inlineTagging: {
              dotCursorPosition: [row, col],
              setMark,
              moveDotCursorRight,
            },
          } = useLyricsStore.getState();
          if (lyrics?.lines[row]?.attachments?.[DOTS]?.values?.[col] === -1) {
            setMark(getProgress());
            moveDotCursorRight();
          }
        }
      };

      window.addEventListener("keydown", handleLabelKeyDown);
      window.addEventListener("keyup", handleLabelKeyUp);

      return () => {
        window.removeEventListener("keydown", handleLabelKeyDown);
        window.removeEventListener("keyup", handleLabelKeyUp);
      };
    }
  }, [getProgress, section, seek]);

  const timelinesRef = useRef<gsap.core.Timeline[]>([]);
  const isMounted = useRef(true);

  // Update time tags
  const onFrame = useCallback(() => {
    const playerStatus = playerStatusRef.current;
    const {
      inlineTagging: { currentLine, setCurrentLine },
      lyrics,
    } = useLyricsStore.getState();
    const lines = lyrics?.lines;
    if (!lines) return;
    const startPerLine = lines.map((t) => {
      const tf = t.attachments?.[TAGS]?.values.flat();
      if (tf?.length) {
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
      setCurrentLine(record);
    }

    if (playerStatus.state === "playing" && isMounted.current) {
      requestAnimationFrame(onFrame);
    }
  }, [getProgress, setPlaybackProgress]);

  useEffect(() => {
    isMounted.current = true;
    requestAnimationFrame(onFrame);
    if (timelinesRef.current) {
      const progress = getProgress();
      if (playerStatus.state === "playing") {
        timelinesRef.current?.map((t) => t?.play(progress));
      } else if (playerStatus.state === "paused") {
        timelinesRef.current?.map((t) => t?.pause(progress));
      }
    }
    return () => {
      isMounted.current = false;
      timelinesRef.current?.map((t) => t?.kill());
    };
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

  const preventSpaceScrollerCallback = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === " ") {
        event.preventDefault();
      }
    },
    []
  );

  const handlePopulateMarksJa = useCallback(() => {
    const {
      lyrics,
      inlineTagging: { setDots },
    } = useLyricsStore.getState();
    const lines = lyrics?.lines;
    if (!lines) return;
    const dots = populateDots(lines);
    setDots(dots);
  }, []);

  const handlePopulateMarksEn = useCallback(() => {
    const {
      lyrics,
      inlineTagging: { setDots },
    } = useLyricsStore.getState();
    const lines = lyrics?.lines;
    if (!lines) return;
    populateDotsEn(lines).then((dots) => setDots(dots));
  }, []);

  return (
    <div className="flex h-full flex-col" ref={taggingAreaRef}>
      <div className="sticky top-0 left-0 z-10 bg-background/80 py-4 space-y-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePopulateMarksJa} size="sm">
            Marks&nbsp;(ja)
          </Button>
          <Button variant="outline" onClick={handlePopulateMarksEn} size="sm">
            Marks&nbsp;(en)
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Toggle
                  variant="default"
                  pressed={autoApplyIdentical}
                  onPressedChange={setAutoApplyIdentical}
                  size="sm"
                >
                  <CheckSquare />{" "}
                  <span className="hidden md:inline">Auto apply</span>
                </Toggle>
              </div>
            </TooltipTrigger>
            <TooltipContent>Auto-apply dots to identical lines</TooltipContent>
          </Tooltip>
          <YohaneAlign fileId={fileId} />
          <InstructionsMemo />
        </div>
        <div className="flex items-center">
          {audioBuffer ? (
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
          ) : (
            <Skeleton className="h-8 w-full" />
          )}
        </div>
      </div>
      <div
        className="h-0 flex-grow overflow-auto px-4"
        onKeyDown={preventSpaceScrollerCallback}
      >
        {Array(linesCount)
          .fill(null)
          .map((_, idx) => (
            <InlineTaggingLineMemo
              key={idx}
              index={idx}
              timelinesRef={timelinesRef}
              playerStatusRef={playerStatusRef}
              getProgress={getProgress}
              section={section}
            />
          ))}
      </div>
    </div>
  );
}
