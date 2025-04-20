/**
 * Some code in this file is adapted from “LRC Maker”.
 *
 * LRC Maker (https://github.com/magic-akari/lrc-maker)
 * Copyright (c) 阿卡琳 licensed under MIT License
 */
import type { PlayerState } from "../../../../hooks/types";
import { useNamedState } from "../../../../hooks/useNamedState";
import { usePlayerState } from "../../../../hooks/usePlayerState";
import type { MouseEvent, MouseEventHandler } from "react";
import { useCallback, useEffect, useRef, useMemo, memo, useId } from "react";
import { Pencil } from "lucide-react";
import _ from "lodash";
import { buildTimeTag, resolveTimeTag } from "lyrics-kit/core";
import { linearRegression } from "simple-statistics";
import DismissibleAlert from "../../DismissibleAlert";
import { Button } from "@lyricova/components/components/ui/button";
import { Switch } from "@lyricova/components/components/ui/switch";
import { Label } from "@lyricova/components/components/ui/label";
import { AlertDescription } from "@lyricova/components/components/ui/alert";
import { cn } from "@lyricova/components/utils";

interface LineListItemProps {
  isCurrent: boolean;
  isCursorOn: boolean;
  onClickCapture?: MouseEventHandler<HTMLLIElement>;
  onDoubleClickCapture?: MouseEventHandler<HTMLLIElement>;
  extrapolateTag: number | undefined;
  line: [number, string[]];
}

const LineListItem = ({
  isCurrent,
  isCursorOn,
  onClickCapture,
  onDoubleClickCapture,
  extrapolateTag,
  line,
}: LineListItemProps) => {
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
          {line[0] != undefined ? `[${buildTimeTag(line[0])}]` : ""}
        </span>
        <div className="flex-grow">
          {line[1].map((l, lidx) => (
            <span key={lidx} className="block text-muted-foreground">
              {l}
            </span>
          ))}
        </div>
      </div>
      <span className="ml-auto tabular-nums text-xs text-muted-foreground">
        {extrapolateTag != null ? `[${buildTimeTag(extrapolateTag)}]` : ""}
      </span>
    </li>
  );
};

const MemoLineListItem = memo(LineListItem, (prev, next) => {
  return (
    prev.isCurrent === next.isCurrent &&
    prev.isCursorOn === next.isCursorOn &&
    prev.extrapolateTag === next.extrapolateTag &&
    prev.line[0] === next.line[0] &&
    prev.line[1].join("") === next.line[1].join("")
  );
});

type LinesPerTag = [number, string[]][];

const BLANK_LINE = { index: Infinity, start: Infinity, end: -Infinity };

interface CurrentLineState {
  index: number;
  start: number;
  end: number;
}

interface Props {
  lyrics: string;
  setLyrics: (v: string) => void;
  fileId: number;
}

function Instructions() {
  return (
    <div className="flex items-center gap-2 p-1 mb-1">
      <DismissibleAlert variant="info" className="flex-grow">
        <AlertDescription>
          Switch to another tab to save changes. ↑WJ/↓RK: Navigate; Home/End:
          First/Last; PgUp/PgDn: +/-10 lines; ←AH/→RL: +/-5 seconds; Space: Tag;
          Bksp: Remove; Cmd/Ctrl+(↑J/↓K: speed; R: reset speed; Enter:
          play/pause).
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

export default function TaggingLyrics({ lyrics, setLyrics, fileId }: Props) {
  const [linesPerTag, setLinesPerTag] = useNamedState<LinesPerTag>(
    [],
    "linesPerTag"
  );
  const linesPerTagRef = useRef<LinesPerTag>(linesPerTag);
  linesPerTagRef.current = linesPerTag;

  const playerRef = useRef<HTMLAudioElement>(null);
  const [playbackRate, setPlaybackRate] = useNamedState(1, "playbackRate");

  const listRef = useRef<HTMLUListElement>(null);

  const [cursor, setCursor] = useNamedState<number>(0, "cursor");
  const cursorRef = useRef<number | null>(cursor);
  cursorRef.current = cursor;

  const [currentLine, setCurrentLine] = useNamedState<CurrentLineState>(
    BLANK_LINE,
    "currentLine"
  );
  const currentLineRef = useRef<CurrentLineState>(currentLine);
  currentLineRef.current = currentLine;

  const playerState = usePlayerState(playerRef);
  const playerStateRef = useRef<PlayerState>(playerState);
  playerStateRef.current = playerState;

  const [isInExtrapolateMode, toggleExtrapolateMode] = useNamedState<boolean>(
    false,
    "isInExtrapolateMode"
  );
  const isInExtrapolateModeRef = useRef<boolean>(isInExtrapolateMode);
  isInExtrapolateModeRef.current = isInExtrapolateMode;
  const [extrapolateTags, setExtrapolateTags] = useNamedState<
    (number | null)[]
  >([], "extrapolateTags");
  const extrapolateTagsRef = useRef<(number | null)[]>(extrapolateTags);
  extrapolateTagsRef.current = extrapolateTags;

  const linearRegressionResult = useMemo<{
    m: number;
    b: number;
  } | null>(() => {
    const points: [number, number][] = [];
    for (
      let i = 0;
      i < Math.min(linesPerTag.length, extrapolateTags.length);
      i++
    ) {
      if (extrapolateTags[i] != null && linesPerTag[i]?.[0] != null) {
        points.push([linesPerTag[i]?.[0], extrapolateTags[i]]);
      }
    }
    if (points.length < 1) return null;
    return linearRegression(points);
  }, [linesPerTag, extrapolateTags]);

  // Build `linesPerTag`.
  useEffect(() => {
    // Do nothing when no lyrics is found
    if (!lyrics) {
      setLinesPerTag([]);
      return () => {
        /* No-op */
      };
    }

    const mapping: { [key: string]: string[] } = {};
    const lpt: [string, string[]][] = [];
    const splitLines = lyrics.split("\n").map((v) => {
      const matches = v.match(/^(\[[0-9:.]+\])?(.*)$/);
      if (matches) {
        return [matches[1], matches[2]];
      }
      return ["", v];
    });

    splitLines.forEach(([tag, content]) => {
      if (mapping[tag] !== undefined) {
        mapping[tag].push(content);
      } else {
        const contents = [content];
        if (!tag && lpt.length && content.match(/^\[.+\]/)) {
          lpt[lpt.length - 1][1].push(content);
        } else {
          lpt.push([tag, contents]);
        }
        if (tag) {
          mapping[tag] = contents;
        }
      }
    });

    setLinesPerTag(
      lpt.map(([tag, lines]) => [resolveTimeTag(tag || "")?.[0] ?? null, lines])
    );

    return () => {
      const result: string[] = [];
      linesPerTagRef.current.forEach(([tag, lines]) =>
        lines.forEach((line) =>
          result.push((tag !== null ? `[${buildTimeTag(tag)}]` : "") + line)
        )
      );
      setLyrics(result.join("\n"));
    };
    // Dropping dependency [lyrics] to prevent loop caused during tear down of itself.
  }, [setLinesPerTag, setLyrics]);

  // Update time tags
  const onFrame = useCallback(
    (timestamp: number) => {
      const playerState = playerStateRef.current;
      const currentLine = currentLineRef.current;
      const linesPerTag = linesPerTagRef.current;

      let time: number;
      if (playerState.state === "paused") {
        time = playerState.progress;
      } else {
        time = ((timestamp - playerState.startingAt) / 1000) * playerState.rate;
      }

      if (
        (time < currentLine.start || time > currentLine.end) &&
        linesPerTag.length > 0
      ) {
        const record = linesPerTag.reduce(
          (p, c, i) => {
            if (c[0]) {
              if (c[0] < p.end && c[0] > time) {
                p.end = c[0];
              }
              if (c[0] > p.start && c[0] <= time) {
                p.start = c[0];
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
      toggleExtrapolateMode(checked);
      if (!checked) {
        setExtrapolateTags([]);
      }
    },
    [toggleExtrapolateMode, setExtrapolateTags]
  );

  const applyExtrapolation = useCallback(() => {
    if (linearRegressionResult == null) return;
    const linesPerTag = [...linesPerTagRef.current];
    const extrapolated = linesPerTag.map(([v, l]) => {
      if (v == null) return [v, l] as [number, string[]];
      return [
        Math.max(0, linearRegressionResult.m * v + linearRegressionResult.b),
        l,
      ] as [number, string[]];
    });
    setLinesPerTag(extrapolated);
  }, [linearRegressionResult, setLinesPerTag]);

  const moveCursor = useCallback(
    (idx: number | ((orig: number) => number)) => {
      setCursor((orig) => {
        let nidx = typeof idx !== "number" ? idx(orig) : idx;
        nidx = _.clamp(nidx, 0, linesPerTagRef.current.length);
        if (linesPerTagRef.current.length > 0 && listRef.current) {
          const item = listRef.current.children[nidx] as HTMLElement;
          if (!item) return nidx;
          item.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return nidx;
      });
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
      const line = linesPerTagRef.current[idx];
      if (!line) return;
      playerRef.current.currentTime = line[0];
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

        if (!isInExtrapolateModeRef.current) {
          const linesPerTag = [...linesPerTagRef.current];
          const line = linesPerTag[cursorRef.current];
          if (!line) return;

          line[0] = null;
          setLinesPerTag(linesPerTag);
          setCurrentLine(BLANK_LINE);
        } else {
          setExtrapolateTags((extrapolateTags) => {
            extrapolateTags[cursorRef.current] = null;
            return [...extrapolateTags];
          });
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
        const cursor = cursorRef.current;
        if (!isInExtrapolateModeRef.current) {
          setLinesPerTag((linesPerTag) => {
            const line = linesPerTag[cursor];
            if (!line) return linesPerTag;
            line[0] = time;
            setCurrentLine(BLANK_LINE);
            return linesPerTag;
          });
        } else {
          setExtrapolateTags((extrapolateTags) => {
            extrapolateTags[cursor] = time;
            return [...extrapolateTags];
          });
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
        moveCursor((linesPerTagRef.current?.length ?? 1) - 1);
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
    linesPerTag,
    moveCursor,
    setCurrentLine,
    setExtrapolateTags,
    setLinesPerTag,
    setPlaybackRate,
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
        {linesPerTag.map((v, idx) => (
          <MemoLineListItem
            line={v}
            extrapolateTag={extrapolateTags[idx]}
            isCurrent={idx === currentLine.index}
            isCursorOn={idx === cursor}
            onClickCapture={onLineClick(idx)}
            onDoubleClickCapture={onLineDoubleClick(idx)}
            key={idx}
          />
        ))}
      </ul>
    </div>
  );
}
