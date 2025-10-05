/**
 * Some code in this file is adapted from "LRC Maker".
 *
 * LRC Maker (https://github.com/magic-akari/lrc-maker)
 * Copyright (c) 阿卡琳 licensed under MIT License
 */
import type { PlayerState } from "../../../../hooks/types";
import { useNamedState } from "../../../../hooks/useNamedState";
import { usePlayerState } from "../../../../hooks/usePlayerState";
import type { MouseEvent, MouseEventHandler } from "react";
import { useCallback, useEffect, useRef, useMemo, memo } from "react";
import { Pencil } from "lucide-react";
import _ from "lodash";
import { buildTimeTag, LyricsLine } from "lyrics-kit/core";
import DismissibleAlert from "../../DismissibleAlert";
import { Button } from "@lyricova/components/components/ui/button";
import { Switch } from "@lyricova/components/components/ui/switch";
import { Label } from "@lyricova/components/components/ui/label";
import { AlertDescription } from "@lyricova/components/components/ui/alert";
import { Kbd } from "@lyricova/components/components/ui/kbd";
import { cn } from "@lyricova/components/utils";
import { useLyricsStore } from "./state/editorState";
import { useShallow } from "zustand/shallow";

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
        "flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-accent",
        isCurrent && "bg-accent text-accent-foreground"
      )}
      onClickCapture={onClickCapture}
      onDoubleClickCapture={onDoubleClickCapture}
      tabIndex={-1}
      data-selected={isCurrent}
    >
      <span className={cn("w-6 flex-shrink-0", !isCursorOn && "invisible")}>
        {isCursorOn && <Pencil className="h-4 w-4" />}
      </span>
      <div className="flex flex-row items-start flex-grow gap-2">
        <span className="block tabular-nums w-max flex-shrink-0">
          {!Number.isNaN(line?.position)
            ? `[${buildTimeTag(line.position)}]`
            : ""}
        </span>
        <div className="flex-grow">
          <span className="block text-muted-foreground whitespace-pre-wrap">
            {lineText}
          </span>
        </div>
      </div>
      <span className="ml-auto tabular-nums text-xs text-muted-foreground">
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

function Instructions() {
  return (
    <div className="flex items-center gap-2 p-1 mb-1">
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

export default function TaggingLyrics({ fileId }: Props) {
  const [playbackRate, setPlaybackRate] = useNamedState(1, "playbackRate");

  const {
    linesLength,
    setCursor,
    setCurrentLine,
    isInExtrapolateMode,
    setIsInExtrapolateMode,
    extrapolateTags,
    setTimestampAtCursor,
    setExtrapolateTagsAtCursor,
    linearRegressionResult,
    applyExtrapolation,
    reset,
  } = useLyricsStore(
    useShallow((s) => ({
      linesLength: s.lyrics?.lines?.length ?? 0,
      setCursor: s.tagging.setCursor,
      setCurrentLine: s.tagging.setCurrentLine,
      isInExtrapolateMode: s.tagging.isInExtrapolateMode,
      setIsInExtrapolateMode: s.tagging.setIsInExtrapolateMode,
      extrapolateTags: s.tagging.extrapolateTags,
      setTimestampAtCursor: s.tagging.setTimestampAtCursor,
      setExtrapolateTagsAtCursor: s.tagging.setExtrapolateTagsAtCursor,
      linearRegressionResult: s.tagging.linearRegressionResult,
      applyExtrapolation: s.tagging.applyExtrapolation,
      reset: s.tagging.reset,
    }))
  );

  const playerRef = useRef<HTMLAudioElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const playerState = usePlayerState(playerRef);
  const playerStateRef = useRef<PlayerState>(playerState);
  playerStateRef.current = playerState;

  // Reset tagging state on component mount
  useEffect(() => {
    reset();
  }, [reset]);

  // Update time tags
  const onFrame = useCallback(
    (timestamp: number) => {
      const playerState = playerStateRef.current;
      const currentLine = useLyricsStore.getState().tagging.currentLine;
      const lines = useLyricsStore.getState().lyrics.lines;

      let time: number;
      if (playerState.state === "paused") {
        time = playerState.progress;
      } else {
        time = ((timestamp - playerState.startingAt) / 1000) * playerState.rate;
      }

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

      if (playerState.state === "playing") {
        requestAnimationFrame(onFrame);
      }
    },
    [setCurrentLine]
  );

  useEffect(() => {
    requestAnimationFrame(onFrame);
  }, [onFrame, playerState]);

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
      nidx = _.clamp(nidx, 0, length);
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

      if (!playerRef.current?.duration) {
        return;
      }

      moveCursor(idx);
      const line = useLyricsStore.getState().lyrics?.lines[idx];
      if (!line) return;
      playerRef.current.currentTime = line.position;
      if (playerStateRef.current.state !== "playing") {
        requestAnimationFrame(onFrame);
      }
    },
    [moveCursor, onFrame]
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
          if (playerRef.current) {
            const rate = playerRef.current.playbackRate;
            playerRef.current.playbackRate = Math.exp(
              Math.min(Math.log(rate) + 0.2, 1)
            );
            setPlaybackRate(playerRef.current.playbackRate);
          }
        } else if (
          ["ArrowDown", "KeyK", "Down", "K", "k"].includes(codeOrKey)
        ) {
          ev.preventDefault();
          if (playerRef.current) {
            const rate = playerRef.current.playbackRate;
            playerRef.current.playbackRate = Math.exp(
              Math.max(Math.log(rate) - 0.2, -1)
            );
            setPlaybackRate(playerRef.current.playbackRate);
          }
        } else if (codeOrKey === "Enter") {
          ev.preventDefault();
          if (playerRef.current) {
            if (playerRef.current.paused) playerRef.current.play();
            else playerRef.current.pause();
          }
        }
        return;
      }

      if (code === "Space" || key === " " || key === "Spacebar") {
        ev.preventDefault();
        if (!playerRef.current || !playerStateRef.current) return;
        const perfNow = performance.now();
        const time =
          playerStateRef.current.state === "playing"
            ? ((perfNow - playerStateRef.current.startingAt) / 1000) *
              playerStateRef.current.rate
            : playerStateRef.current.progress;

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
        ["ArrowDown", "KeyR", "KeyK", "Down", "r", "r", "K", "k"].includes(
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
        if (playerRef.current) playerRef.current.currentTime -= 5;
      } else if (
        ["ArrowRight", "KeyS", "KeyL", "Right", "S", "s", "L", "l"].includes(
          codeOrKey
        )
      ) {
        ev.preventDefault();
        if (playerRef.current) playerRef.current.currentTime += 5;
      } else if (code === "KeyR" || key === "R" || key === "r") {
        ev.preventDefault();
        if (playerRef.current) playerRef.current.playbackRate = 1;
        setPlaybackRate(1);
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }, [
    moveCursor,
    setCurrentLine,
    setExtrapolateTagsAtCursor,
    setPlaybackRate,
    setTimestampAtCursor,
  ]);

  return (
    <div className="relative">
      <div
        className={cn(
          "sticky top-0 left-0 z-10 py-1",
          "bg-background/80 backdrop-blur-sm"
        )}
      >
        <InstructionsMemo />
        <div className="flex items-center gap-2 p-1 mb-1">
          <audio
            ref={playerRef}
            src={`/api/files/${fileId}/file`}
            controls
            className="flex-grow"
          />
          <span className="my-2 tabular-nums">@{playbackRate.toFixed(2)}x</span>
          <ExtrapolateModeToggleMemo
            isInExtrapolateMode={isInExtrapolateMode}
            handleExtrapolateModeToggle={handleExtrapolateModeToggle}
          />
        </div>
        {isInExtrapolateMode && (
          <div className="flex items-center gap-2 p-1 mb-1">
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
