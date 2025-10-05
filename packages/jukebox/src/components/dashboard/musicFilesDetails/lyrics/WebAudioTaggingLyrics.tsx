/**
 * Some code in this file is adapted from “LRC Maker” and “PaletteWorks Editor”.
 *
 * LRC Maker (https://github.com/magic-akari/lrc-maker)
 * Copyright (c) 阿卡琳 licensed under MIT License
 *
 * PaletteWorks Editor (https://github.com/mkpoli/paletteworks-editor)
 * Copyright (c) mkpoli licensed under MIT License
 */
import { useNamedState } from "../../../../hooks/useNamedState";
import { useWebAudio } from "../../../../hooks/useWebAudio";
import type { WebAudioPlayerState } from "../../../../hooks/types";
import type { MouseEvent, MouseEventHandler } from "react";
import { useCallback, useEffect, useRef, useMemo, memo } from "react";
import { Pencil } from "lucide-react";
import { clamp } from "lodash";
import { buildTimeTag, LyricsLine } from "lyrics-kit/core";
import DismissibleAlert from "../../DismissibleAlert";
import { WebAudioControls } from "./WebAudioControls";
import { Button } from "@lyricova/components/components/ui/button";
import { Switch } from "@lyricova/components/components/ui/switch";
import { Label } from "@lyricova/components/components/ui/label";
import { AlertDescription } from "@lyricova/components/components/ui/alert";
import { Kbd } from "@lyricova/components/components/ui/kbd";
import { cn } from "@lyricova/components/utils";
import { useLyricsStore } from "./state/editorState";
import { useShallow } from "zustand/shallow";

function Instructions() {
  return (
    <div className="flex items-center gap-2 mb-1 p-1">
      <DismissibleAlert variant="info" className="flex-grow">
        <AlertDescription>
          <p>
            <Kbd>↑</Kbd>
            <Kbd>W</Kbd>
            <Kbd>J</Kbd>/<Kbd>↓</Kbd>
            <Kbd>R</Kbd>
            <Kbd>K</Kbd>: Navigate; <Kbd>Home</Kbd>/<Kbd>End</Kbd>: First/Last;{" "}
            <Kbd>PgUp</Kbd>/<Kbd>PgDn</Kbd>: +/-10 lines;
            <Kbd>←</Kbd>
            <Kbd>A</Kbd>
            <Kbd>H</Kbd>/<Kbd>→</Kbd>
            <Kbd>R</Kbd>
            <Kbd>L</Kbd>: +/-5 seconds; <Kbd>␣</Kbd>: Tag; <Kbd>⌫</Kbd>: Remove;{" "}
            <Kbd>⌘</Kbd>/<Kbd>Ctrl</Kbd>+(<Kbd>↑</Kbd>
            <Kbd>J</Kbd>/<Kbd>↓</Kbd>
            <Kbd>K</Kbd>: speed; <Kbd>R</Kbd>: reset speed; <Kbd>⮠</Kbd>:
            play/pause).
          </p>
        </AlertDescription>
      </DismissibleAlert>
    </div>
  );
}
const InstructionsMemo = memo(Instructions);

function ExtrapolateModeToggle({
  isInExtrapolateMode,
  handleExtrapolateModeToggle,
}: {
  isInExtrapolateMode: boolean;
  handleExtrapolateModeToggle: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-center space-x-2">
      <Switch
        checked={isInExtrapolateMode}
        onCheckedChange={handleExtrapolateModeToggle}
      />
      Extrapolate mode
    </Label>
  );
}
const ExtrapolateModeToggleMemo = memo(ExtrapolateModeToggle);

interface LineListItemProps {
  lineIdx: number;
  onClickCapture?: MouseEventHandler<HTMLLIElement>;
  onDoubleClickCapture?: MouseEventHandler<HTMLLIElement>;
}

const LineListItem = ({
  onClickCapture,
  onDoubleClickCapture,
  lineIdx,
}: LineListItemProps) => {
  const line = useLyricsStore((s) => s.lyrics?.lines[lineIdx]);
  const { isCurrent, isCursorOn, extrapolateTag } = useLyricsStore(
    useShallow((s) => ({
      isCurrent: s.tagging.currentLine.index === lineIdx,
      isCursorOn: s.tagging.cursor === lineIdx,
      extrapolateTag: s.tagging.extrapolateTags?.[lineIdx],
    }))
  );
  const lineText = useMemo(() => {
    return LyricsLine.fromJSON(line)
      .toString()
      .replace(/^\[[\d:\.]+\]/gm, "");
  }, [line]);
  return (
    <li
      className={cn(
        "flex items-center hover:bg-accent px-2 py-1 text-sm cursor-pointer",
        isCurrent && "bg-accent text-accent-foreground"
      )}
      onClickCapture={onClickCapture}
      onDoubleClickCapture={onDoubleClickCapture}
      tabIndex={-1}
      data-selected={isCurrent}
    >
      <span className={cn("flex-shrink-0 w-6", !isCursorOn && "invisible")}>
        {isCursorOn && <Pencil className="w-4 h-4" />}
      </span>
      <div className="flex flex-row flex-grow items-start gap-2">
        <span className="block flex-shrink-0 w-max tabular-nums">
          {!Number.isNaN(line?.position)
            ? `[${buildTimeTag(line.position)}]`
            : ""}
        </span>
        <div className="flex-grow w-0">
          <span className="block text-muted-foreground whitespace-pre-wrap">
            {lineText}
          </span>
        </div>
      </div>
      <span className="ml-auto tabular-nums text-muted-foreground text-xs">
        {extrapolateTag != null ? `[${buildTimeTag(extrapolateTag)}]` : ""}
      </span>
    </li>
  );
};

const MemoLineListItem = memo(LineListItem, (prev, next) => {
  return prev.lineIdx === next.lineIdx;
});

const BLANK_LINE = { index: Infinity, start: Infinity, end: -Infinity };

interface Props {
  fileId: number;
}

export default function WebAudioTaggingLyrics({ fileId }: Props) {
  const {
    linesLength,
    reset,
    setCursor,
    setCurrentLine,
    isInExtrapolateMode,
    setIsInExtrapolateMode,
    extrapolateTags,
    setTimestampAtCursor,
    setExtrapolateTagsAtCursor,
    linearRegressionResult,
    applyExtrapolation,
  } = useLyricsStore(
    useShallow((s) => ({
      linesLength: s.lyrics?.lines?.length ?? 0,
      reset: s.tagging.reset,
      setCursor: s.tagging.setCursor,
      setCurrentLine: s.tagging.setCurrentLine,
      isInExtrapolateMode: s.tagging.isInExtrapolateMode,
      setIsInExtrapolateMode: s.tagging.setIsInExtrapolateMode,
      extrapolateTags: s.tagging.extrapolateTags,
      setTimestampAtCursor: s.tagging.setTimestampAtCursor,
      setExtrapolateTagsAtCursor: s.tagging.setExtrapolateTagsAtCursor,
      linearRegressionResult: s.tagging.linearRegressionResult,
      applyExtrapolation: s.tagging.applyExtrapolation,
    }))
  );

  const [playbackProgress, setPlaybackProgress] = useNamedState(
    0,
    "playbackProgress"
  );

  const listRef = useRef<HTMLUListElement>(null);

  const { playerStatus, play, pause, seek, setRate, getProgress, audioBuffer } =
    useWebAudio(`/api/files/${fileId}/file`);
  const playerStatusRef = useRef<WebAudioPlayerState>(playerStatus);
  playerStatusRef.current = playerStatus;

  useEffect(() => {
    reset();
  }, [reset]);

  // Update time tags
  const onFrame = useCallback(() => {
    const playerStatus = playerStatusRef.current;
    const currentLine = useLyricsStore.getState().tagging.currentLine;
    const lines = useLyricsStore.getState().lyrics.lines;

    const time = getProgress();
    setPlaybackProgress(time);

    if (
      (time < currentLine.start || time > currentLine.end) &&
      lines.length > 0
    ) {
      const record = lines.reduce(
        (p, c, i) => {
          if (c.position) {
            if (c.position < p.end && c.position > time) {
              p.end = c.position;
            }
            if (c.position > p.start && c.position <= time) {
              p.start = c.position;
              p.index = i;
            }
          }
          return p;
        },
        {
          index: -Infinity,
          start: -Infinity,
          end: Infinity,
        }
      );
      setCurrentLine(record);
    }

    if (playerStatus.state === "playing") {
      requestAnimationFrame(onFrame);
    }
  }, [getProgress, setCurrentLine, setPlaybackProgress]);

  useEffect(() => {
    requestAnimationFrame(onFrame);
  }, [onFrame, playerStatus]);

  const handleExtrapolateModeToggle = useCallback(
    (checked: boolean) => {
      setIsInExtrapolateMode(checked);
    },
    [setIsInExtrapolateMode]
  );

  const moveCursor = useCallback(
    (idx: number | ((orig: number) => number)) => {
      const orig = useLyricsStore.getState().tagging.cursor;
      const length = useLyricsStore.getState().lyrics.lines.length;
      let nidx = typeof idx !== "number" ? idx(orig) : idx;
      nidx = clamp(nidx, 0, length);
      if (length > 0 && listRef.current) {
        const item = listRef.current.children[nidx] as HTMLElement;
        if (!item) {
          setCursor(nidx);
          return;
        }
        item.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      setCursor(nidx);
      return;
    },
    [setCursor]
  );

  const onLineClick = useCallback(
    (idx: number) => (ev: MouseEvent<HTMLLIElement>) => {
      ev.stopPropagation();
      moveCursor(idx);
    },
    [moveCursor]
  );

  const onLineDoubleClick = useCallback(
    (idx: number) => (ev: MouseEvent<HTMLLIElement>) => {
      ev.stopPropagation();

      if (!audioBuffer) {
        return;
      }

      moveCursor(idx);
      const line = useLyricsStore.getState().lyrics?.lines[idx];
      if (!line) return;
      seek(line.position);
      if (playerStatusRef.current.state !== "playing") {
        requestAnimationFrame(onFrame);
      }
    },
    [audioBuffer, moveCursor, onFrame, seek]
  );

  // Register key press listeners
  useEffect(() => {
    const listener = (ev: KeyboardEvent): void => {
      const { code, key, target } = ev;

      const codeOrKey = code || key;

      const isInExtrapolateMode =
        useLyricsStore.getState().tagging.isInExtrapolateMode;
      // Skip events targeted to an input.
      if (target !== null) {
        const type = (target as HTMLInputElement | HTMLTextAreaElement).type;
        if (type === "textarea" || type === "text" || type === "url") return;
      }

      if (
        codeOrKey === "Backspace" ||
        codeOrKey === "Delete" ||
        codeOrKey === "Del"
      ) {
        ev.preventDefault();
        if (!isInExtrapolateMode) {
          setTimestampAtCursor(NaN);
          setCurrentLine(BLANK_LINE);
        } else {
          setExtrapolateTagsAtCursor(null);
        }
        return;
      }

      if (ev.metaKey === true || ev.ctrlKey === true) {
        if (["ArrowUp", "KeyJ", "Up", "J", "j"].includes(codeOrKey)) {
          ev.preventDefault();
          if (!audioBuffer) return;
          const rate = playerStatusRef.current.rate;
          const newRate = rate + 0.05;
          setRate(newRate);
          // setPlaybackRate(newRate);
        } else if (
          ["ArrowDown", "KeyK", "Down", "K", "k"].includes(codeOrKey)
        ) {
          ev.preventDefault();
          if (!audioBuffer) return;
          const rate = playerStatusRef.current.rate;
          const newRate = rate - 0.05;
          setRate(newRate);
          // setPlaybackRate(newRate);
        } else if (codeOrKey === "Enter") {
          ev.preventDefault();
          if (!audioBuffer) return;
          if (playerStatusRef.current.state === "paused") play();
          else pause();
        } else if (code === "KeyR" || key === "R" || key === "r") {
          ev.preventDefault();
          setRate(1);
        }
        return;
      }

      if (code === "Space" || key === " " || key === "Spacebar") {
        ev.preventDefault();
        if (!audioBuffer) return;
        const time = getProgress();
        if (!isInExtrapolateMode) {
          setTimestampAtCursor(time);
          setCurrentLine(BLANK_LINE);
        } else {
          setExtrapolateTagsAtCursor(time);
        }
        moveCursor((cursor) => cursor + 1);
      } else if (
        ["ArrowUp", "KeyW", "KeyJ", "Up", "W", "w", "J", "j"].includes(
          codeOrKey
        )
      ) {
        ev.preventDefault();
        moveCursor((cursor) => (cursor || 1) - 1);
      } else if (
        ["ArrowDown", "KeyR", "KeyK", "Down", "r", "R", "K", "k"].includes(
          codeOrKey
        )
      ) {
        ev.preventDefault();
        moveCursor((cursor) => (cursor || 0) + 1);
      } else if (codeOrKey === "Home") {
        ev.preventDefault();
        moveCursor(0);
      } else if (codeOrKey === "End") {
        ev.preventDefault();
        const length = useLyricsStore.getState().lyrics?.lines?.length ?? 1;
        moveCursor(length - 1);
      } else if (codeOrKey === "PageUp") {
        ev.preventDefault();
        moveCursor((cursor) => (cursor || 10) - 10);
      } else if (codeOrKey === "PageDown") {
        ev.preventDefault();
        moveCursor((cursor) => (cursor || 0) + 10);
      } else if (
        ["ArrowLeft", "KeyA", "KeyH", "Left", "A", "a", "H", "h"].includes(
          codeOrKey
        )
      ) {
        ev.preventDefault();
        if (!audioBuffer) return;
        const time = getProgress();
        seek(time - 5);
      } else if (
        ["ArrowRight", "KeyS", "KeyL", "Right", "S", "s", "L", "l"].includes(
          codeOrKey
        )
      ) {
        ev.preventDefault();
        if (!audioBuffer) return;
        const time = getProgress();
        seek(time + 5);
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }, [
    audioBuffer,
    getProgress,
    moveCursor,
    pause,
    play,
    playerStatus.rate,
    seek,
    setCurrentLine,
    setExtrapolateTagsAtCursor,
    setRate,
    setTimestampAtCursor,
  ]);

  return (
    <div className="relative">
      <div
        className={cn(
          "top-0 left-0 z-10 sticky py-1", // Basic sticky positioning
          "bg-background/80 backdrop-blur-sm" // Background with transparency and blur
        )}
      >
        <InstructionsMemo />
        <div className="flex items-center gap-2 mb-1 p-1">
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
          <ExtrapolateModeToggleMemo
            isInExtrapolateMode={isInExtrapolateMode}
            handleExtrapolateModeToggle={handleExtrapolateModeToggle}
          />
        </div>
        {isInExtrapolateMode && (
          <div className="flex items-center gap-2 mb-1 p-1">
            <span className="my-2 text-sm">
              {extrapolateTags.reduce(
                (prev, curr) => prev + (curr == null ? 0 : 1),
                0
              )}{" "}
              tags added, formula:{" "}
              <span className="font-serif">
                <i>y</i> = {linearRegressionResult?.m?.toFixed(3) ?? "??"}
                <i>x</i> + {linearRegressionResult?.b?.toFixed(3) ?? "??"}
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!linearRegressionResult}
              onClick={applyExtrapolation}
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      <ul ref={listRef} className="space-y-0.5">
        {Array(linesLength)
          .fill(null)
          .map((_, idx) => (
            <MemoLineListItem
              lineIdx={idx}
              key={idx}
              onClickCapture={onLineClick(idx)}
              onDoubleClickCapture={onLineDoubleClick(idx)}
            />
          ))}
      </ul>
    </div>
  );
}
