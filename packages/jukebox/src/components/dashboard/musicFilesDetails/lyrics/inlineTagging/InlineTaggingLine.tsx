import { FURIGANA, LyricsLine } from "lyrics-kit/core";
import {
  MouseEventHandler,
  RefObject,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { measureTextWidths } from "../../../../../frontendUtils/measure";
import type { WebAudioPlayerState } from "../../../../../hooks/types";
import gsap from "gsap";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Button } from "@lyricova/components/components/ui/button";
import { ListChecks } from "lucide-react";
import { cn } from "@lyricova/components/utils";

function ApplyMarksToAllButton({
  applyMarksToAll,
  lineContent,
  index,
}: {
  applyMarksToAll: MouseEventHandler<HTMLButtonElement>;
  lineContent: string;
  index: number;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={applyMarksToAll}
            data-row-index={index}
            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/inline-row:opacity-100 transition-opacity"
          >
            <ListChecks />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>Apply marks to all identical lines</p>
          <p>{lineContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
const ApplyMarksToAllButtonMemo = memo(
  ApplyMarksToAllButton,
  (prev, next) => prev.lineContent === next.lineContent
);

interface InlineTaggingLineProps {
  index: number;
  line: LyricsLine;
  dots: number[];
  tags: number[][];
  relativeProgress: -1 | 0 | 1;
  cursorIdx?: number;
  dotCursorIdx?: [number, number];
  onUpdateCursor?: (
    event: React.MouseEvent<HTMLElement>,
    cursorIdx: number
  ) => void;
  timelinesRef: RefObject<gsap.core.Timeline[]>;
  playerStatusRef: RefObject<WebAudioPlayerState>;
  getProgress: () => number;
  applyMarksToAll: MouseEventHandler<HTMLButtonElement>;
}

export function InlineTaggingLine({
  index,
  line,
  dots,
  tags,
  cursorIdx,
  dotCursorIdx,
  relativeProgress,
  onUpdateCursor,
  timelinesRef,
  playerStatusRef,
  getProgress,
  applyMarksToAll,
}: InlineTaggingLineProps) {
  const hasCursor = cursorIdx >= 0;
  const hasDotCursor = !!dotCursorIdx;
  const furigana = line?.attachments?.content?.[FURIGANA]?.attachment ?? [];
  const centerRowRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<number[]>([]);

  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    // console.log("useEffect setCoords");
    if (centerRowRef.current && line.content) {
      setCoords(measureTextWidths(centerRowRef.current));
    }
  }, [line.content]);
  useEffect(() => {
    // console.log("useEffect scrollIntoView");
    if ((hasCursor || hasDotCursor) && centerRowRef.current) {
      centerRowRef.current.parentElement.scrollIntoView({
        block: "center",
        // behavior: "smooth",
      });
    }
  }, [hasDotCursor, hasCursor]);
  useEffect(() => {
    // console.log("useEffect buildTimeline");
    if (!centerRowRef.current) return;
    const centerRow = centerRowRef.current;
    if (relativeProgress === 0) {
      setIsValid(true);
      if (timelinesRef.current[index]) {
        timelinesRef.current[index].kill();
      }
      const startingTags = tags.map((x) => x?.[0] ?? null);
      if (startingTags.every((x) => !x)) {
        timelinesRef.current = null;
        return;
      }
      const tl = gsap.timeline();

      let start = -1;
      startingTags.forEach((x, idx) => {
        if (x) {
          const xCoord = coords?.[idx - 1] ?? 0;
          if (start === -1) {
            tl.fromTo(
              centerRow,
              { backgroundSize: "0px 100%" },
              {
                backgroundSize: `${xCoord}px 100%`,
                ease: "none",
                duration: 0,
              },
              x
            );
          } else {
            // console.log("adding", x, idx, xCoord);
            tl.to(
              centerRow,
              {
                backgroundSize: `${xCoord}px 100%`,
                ease: "none",
                duration: x - start,
              },
              start
            );
          }
          start = x;
        }
      });
      tl.timeScale(playerStatusRef.current.rate);
      const progress = getProgress();
      if (playerStatusRef.current.state === "playing") {
        tl.play(progress);
      } else {
        tl.pause(progress);
      }
      timelinesRef.current[index] = tl;
      // console.log("built timeline", index, timelinesRef.current);
    } else if (relativeProgress === 1) {
      centerRow.style.backgroundSize = "0px 100%";
      if (timelinesRef.current[index]) {
        timelinesRef.current[index].kill();
        timelinesRef.current[index] = undefined;
      }
    } else if (relativeProgress === -1) {
      centerRow.style.backgroundSize = `${coords[coords.length - 1]}px 100%`;
      const flatternTags = tags.flat().filter(Boolean);
      const areTagsIncreasing = flatternTags.every((x, idx, arr) =>
        idx === 0 ? true : x > arr[idx - 1]
      );
      setIsValid(areTagsIncreasing);
      if (timelinesRef.current[index]) {
        timelinesRef.current[index].kill();
        timelinesRef.current[index] = undefined;
      }
    }
    // return () => {timelinesRef.current[index] = undefined; };
    // Explicitly only depends on relativeProgress to prevent excessive re-renders
  }, [relativeProgress]);

  return (
    <div className="group/inline-row relative mb-2 whitespace-nowrap text-2xl">
      {/* Furigana */}
      <div className="relative h-[1em] text-xs leading-none">
        {furigana.map((t, idx) => (
          <span
            key={idx}
            className="absolute text-center origin-left"
            style={{
              left: coords[t.range[0] - 1] ?? 0,
              width: coords[t.range[1] - 1] - (coords[t.range[0] - 1] ?? 0),
            }}
          >
            {t.content}
          </span>
        ))}
      </div>
      {/* Main Content */}
      <div
        ref={centerRowRef}
        className="leading-none tracking-wider bg-no-repeat bg-blend-difference"
        style={{
          backgroundImage: "linear-gradient(0deg, #923cbd, #923cbd)",
          backgroundSize: "0px 100%",
        }}
      >
        {[...line.content].map((i, idx) => (
          <span
            key={idx}
            onClick={(event) => onUpdateCursor?.(event, idx)}
            data-row-index={index}
          >
            {i}
          </span>
        ))}
        <span
          onClick={(event) => onUpdateCursor?.(event, line.content.length)}
          data-row-index={index}
          className={cn(
            "inline-block w-[1em] h-[1em] relative align-bottom",
            !isValid && "before:content-['⚠️'] before:text-warning-foreground"
          )}
        ></span>
      </div>
      {/* Dots/Labels */}
      <div className="relative h-[1em] font-markers text-[0.4rem] leading-none">
        {dots?.map((x, idx) =>
          x ? (
            <span
              key={idx}
              className="absolute"
              style={{ left: coords[idx - 1] ?? 0 }}
            >
              {x === -1 ? (
                <span
                  className={cn(
                    dotCursorIdx &&
                      dotCursorIdx[0] === idx &&
                      dotCursorIdx[1] === 0 &&
                      "text-error-foreground"
                  )}
                >
                  □
                </span>
              ) : (
                Array(x)
                  .fill(null)
                  .map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        dotCursorIdx &&
                          dotCursorIdx[0] === idx &&
                          dotCursorIdx[1] === i &&
                          "text-error-foreground"
                      )}
                    >
                      {i === 0 ? "◣" : "❚"}
                    </span>
                  ))
              )}
            </span>
          ) : null
        )}
        {hasCursor && (
          <span
            style={{
              transform: `translateX(calc(${
                coords[cursorIdx - 1] ?? 0
              }px - 1em))`,
            }}
            className="absolute z-10 scale-y-200 text-info-foreground origin-top-right"
          >
            ◢
          </span>
        )}
      </div>
      {/* Tags Indicator */}
      <div className="relative h-[1em] font-markers text-[0.4rem] leading-none text-success-foreground">
        {[0, ...coords]
          .filter((x, idx) => tags?.[idx]?.length > 0)
          .map((x, idx) => (
            <span
              key={idx}
              className="absolute"
              style={{ left: x, width: coords[idx] - x }}
            >
              ◣
            </span>
          ))}
      </div>
      <ApplyMarksToAllButtonMemo
        applyMarksToAll={applyMarksToAll}
        lineContent={line.content}
        index={index}
      />
    </div>
  );
}

export const InlineTaggingLineMemo = memo(InlineTaggingLine, (prev, next) => {
  return (
    prev?.dots?.length === next?.dots?.length &&
    (!prev.dots ||
      (prev?.dots?.every((value, index) => value === next?.dots[index]) &&
        prev?.tags?.length === next?.tags?.length)) &&
    (!prev.tags ||
      prev?.tags?.every(
        (value, index) => !value?.length === !next?.tags[index]?.length
      )) &&
    prev.line.content === next.line.content &&
    prev.cursorIdx === next.cursorIdx &&
    prev.relativeProgress === next.relativeProgress &&
    prev.onUpdateCursor === next.onUpdateCursor &&
    prev.dotCursorIdx?.[0] === next.dotCursorIdx?.[0] &&
    prev.dotCursorIdx?.[1] === next.dotCursorIdx?.[1]
  );
});
