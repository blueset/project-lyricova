import { DOTS, FURIGANA, TAGS } from "lyrics-kit/core";
import {
  RefObject,
  memo,
  useCallback,
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
import { useLyricsStore } from "../state/editorState";
import { useShallow } from "zustand/shallow";

function ApplyMarksToAllButton({ index }: { index: number }) {
  const { lineContent, applyMarksToIdenticalLines } = useLyricsStore(
    useShallow((state) => ({
      lineContent: state.lyrics?.lines[index].content,
      applyMarksToIdenticalLines:
        state.inlineTagging.applyMarksToIdenticalLines,
    }))
  );
  const applyMarksToAll = useCallback(() => {
    applyMarksToIdenticalLines(index);
  }, [index, applyMarksToIdenticalLines]);
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
        <TooltipContent side="left" align="end">
          <p>Apply marks to all identical lines</p>
          <p>{lineContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
const ApplyMarksToAllButtonMemo = memo(
  ApplyMarksToAllButton,
  (prev, next) => prev.index === next.index
);

interface InlineTaggingLineProps {
  index: number;
  timelinesRef: RefObject<gsap.core.Timeline[]>;
  playerStatusRef: RefObject<WebAudioPlayerState>;
  getProgress: () => number;
  section: "mark" | "tag";
}

export function InlineTaggingLine({
  index,
  timelinesRef,
  playerStatusRef,
  getProgress,
  section,
}: InlineTaggingLineProps) {
  const {
    lineContent,
    furigana,
    dots,
    tags,
    hasCursor,
    cursorIndex,
    hasDotCursor,
    dotCursorIndex1,
    dotCursorIndex2,
    relativeProgress,
  } = useLyricsStore(
    useShallow((state) => ({
      lineContent: state.lyrics?.lines[index].content,
      furigana: state.lyrics?.lines[index].attachments?.[FURIGANA]?.attachment,
      dots: state.lyrics?.lines[index].attachments?.[DOTS]?.values,
      tags: state.lyrics?.lines[index].attachments?.[TAGS]?.values,
      hasCursor:
        section === "mark" && state.inlineTagging.cursorPosition[0] === index,
      cursorIndex:
        section === "mark" && state.inlineTagging.cursorPosition[0] === index
          ? state.inlineTagging.cursorPosition[1]
          : undefined,
      hasDotCursor:
        section === "tag" && state.inlineTagging.dotCursorPosition[0] === index,
      dotCursorIndex1:
        section === "tag" && state.inlineTagging.dotCursorPosition[0] === index
          ? state.inlineTagging.dotCursorPosition[1]
          : undefined,
      dotCursorIndex2:
        section === "tag" && state.inlineTagging.dotCursorPosition[0] === index
          ? state.inlineTagging.dotCursorPosition[2]
          : undefined,
      relativeProgress:
        state.inlineTagging.currentLine.indices.includes(index) ||
        state.inlineTagging.currentLine.borderIndex === index
          ? 0
          : state.inlineTagging.currentLine.borderIndex >= index
          ? -1
          : 1,
    }))
  );
  const centerRowRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<number[]>([]);

  const [isValid, setIsValid] = useState(true);

  const onUpdateCursor = useCallback(
    (cursorIdx: number) => {
      const { setCursorPosition, setDotCursorPosition } =
        useLyricsStore.getState().inlineTagging;
      setCursorPosition([index, cursorIdx]);
      setDotCursorPosition([index, cursorIdx, 0]);
    },
    [index]
  );

  useEffect(() => {
    if (centerRowRef.current && lineContent) {
      requestAnimationFrame(() => {
        setCoords(measureTextWidths(centerRowRef.current));
      });
    }
  }, [lineContent]);
  useEffect(() => {
    if ((hasCursor || hasDotCursor) && centerRowRef.current) {
      centerRowRef.current.parentElement.scrollIntoView({
        block: "center",
        // behavior: "smooth",
      });
    }
  }, [hasDotCursor, hasCursor]);
  useEffect(() => {
    if (!centerRowRef.current) return;
    const centerRow = centerRowRef.current;
    if (relativeProgress === 0) {
      setIsValid(true);
      if (timelinesRef.current[index]) {
        timelinesRef.current[index].kill();
      }
      const tags =
        useLyricsStore.getState().lyrics?.lines[index].attachments?.[TAGS]
          ?.values ?? [];
      const startingTags = tags.map((x) => x?.[0] ?? null);
      if (startingTags.every((x) => !x)) {
        timelinesRef.current = null;
        return;
      }
      const tl = gsap.timeline();

      let start = -1;
      startingTags.forEach((x, idx) => {
        if (x !== null) {
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
    } else if (relativeProgress === 1) {
      centerRow.style.backgroundSize = "0px 100%";
      if (timelinesRef.current[index]) {
        timelinesRef.current[index].kill();
        timelinesRef.current[index] = undefined;
      }
    } else if (relativeProgress === -1) {
      const tags =
        useLyricsStore.getState().lyrics?.lines[index].attachments?.[TAGS]
          ?.values ?? [];
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
  }, [
    relativeProgress,
    index,
    timelinesRef,
    playerStatusRef,
    getProgress,
    coords,
  ]);

  return (
    <div className="group/inline-row relative mb-2 whitespace-nowrap text-2xl">
      {/* Furigana */}
      <div className="relative h-[1em] text-xs leading-none">
        {furigana?.map((t, idx) => (
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
        className="leading-none tracking-wider bg-no-repeat bg-blend-difference inline whitespace-pre w-fit"
        style={{
          backgroundImage: "linear-gradient(0deg, #923cbd, #923cbd)",
          backgroundSize: "0px 100%",
        }}
      >
        {[...lineContent].map((i, idx) => (
          <span
            key={idx}
            onClick={() => onUpdateCursor?.(idx)}
            data-row-index={index}
          >
            {i}
          </span>
        ))}
        <span
          onClick={() => onUpdateCursor?.(lineContent.length)}
          data-row-index={index}
          className={cn(
            "inline-block w-[1em] h-[1em] relative align-baseline",
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
                    hasDotCursor &&
                      dotCursorIndex1 === idx &&
                      dotCursorIndex2 === 0 &&
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
                        hasDotCursor &&
                          dotCursorIndex1 === idx &&
                          dotCursorIndex2 === i &&
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
                coords[cursorIndex - 1] ?? 0
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
      <ApplyMarksToAllButtonMemo index={index} />
    </div>
  );
}

export const InlineTaggingLineMemo = memo(InlineTaggingLine, (prev, next) => {
  return prev.index === next.index && prev.section === next.section;
});
