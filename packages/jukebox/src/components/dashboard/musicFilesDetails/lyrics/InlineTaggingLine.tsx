import { IconButton, Tooltip, styled } from "@mui/material";
import { FURIGANA, LyricsLine } from "lyrics-kit/core";
import { MutableRefObject, memo, useEffect, useRef, useState } from "react";
import { measureTextWidths } from "../../../../frontendUtils/measure";
import { WebAudioPlayerState } from "../../../../frontendUtils/hooks";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import gsap from "gsap";

const InlineTagRowContainer = styled("div")`
  white-space: nowrap;
  font-size: 1.5em;
  margin-bottom: 0.5rem;
  position: relative;

  & > button {
    visibility: hidden;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  }
  &:hover > button {
    visibility: visible;
  }
`;

const InlineTagContainer = styled("div")`
  position: relative;
  font-size: 0.7rem;
  height: 1em;
  line-height: 1;
  font-family: "Corporate Logo ver3", sans-serif;
  & span {
    position: absolute;
    transform-origin: left;
    text-align: center;
  }
`;

const InlineLabelContainer = styled("div")`
  position: relative;
  font-size: 0.4rem;
  height: 1em;
  line-height: 1;
  font-family: Iosevka, "Segoe UI Symbol", sans-serif;
  &[data-tags] span {
    color: #ce93d8;
  }
  & > span {
    position: absolute;
    & > span[data-current="true"] {
      color: #f589ae;
    }
  }
  & span.cursor {
    z-index: 1;
    scale: 1 2;
    color: lime;
    transform-origin: top right;
  }
`;

const InlineMainContainer = styled("div")`
  line-height: 1;
  letter-spacing: 3;
  background-image: linear-gradient(0deg, #923cbd, #923cbd);
  background-blend-mode: difference;
  background-repeat: no-repeat;
  background-size: 0px 100%;
  & [data-is-valid] {
    width: 1em;
    height: 1em;
    display: inline-block;
    position: relative;
    vertical-align: bottom;
  }
  & [data-is-valid="false"]::before {
    content: "⚠️";
    color: #ffeb3b;
  }
`;

function ApplyMarksToAllButton({
  applyMarksToAll,
  lineContent,
}: {
  applyMarksToAll: () => void;
  lineContent: string;
}) {
  return (
    <Tooltip
      title={
        <span>
          Apply marks to all identical lines
          <br />
          {lineContent}
        </span>
      }
      placement="bottom-end"
    >
      <IconButton onClick={applyMarksToAll}>
        <PlaylistAddCheckIcon />
      </IconButton>
    </Tooltip>
  );
}
const ApplyMarksToAllButtonMemo = memo(
  ApplyMarksToAllButton,
  (prev, next) => prev.content === next.content
);

interface InlineTaggingLineProps {
  line: LyricsLine;
  dots: number[];
  tags: number[][];
  relativeProgress: -1 | 0 | 1;
  cursorIdx?: number;
  dotCursorIdx?: [number, number];
  onUpdateCursor?: (cursorIdx: number) => void;
  timelineRef: MutableRefObject<gsap.core.Timeline>;
  playerStatusRef: MutableRefObject<WebAudioPlayerState>;
  getProgress: () => number;
  applyMarksToAll: () => void;
}

export function InlineTaggingLine({
  line,
  dots,
  tags,
  cursorIdx,
  dotCursorIdx,
  relativeProgress,
  onUpdateCursor,
  timelineRef,
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
        behavior: "smooth",
      });
    }
  }, [hasDotCursor, hasCursor]);
  useEffect(() => {
    // console.log("useEffect buildTimeline");
    if (!centerRowRef.current) return;
    const centerRow = centerRowRef.current;
    if (relativeProgress === 0) {
      setIsValid(true);
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
      const startingTags = tags.map((x) => x?.[0] ?? null);
      if (startingTags.every((x) => !x)) {
        timelineRef.current = null;
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
      // console.log(
      //   "startingTags",
      //   startingTags,
      //   playerStatusRef.current,
      //   progress,
      //   tl
      // );
      if (playerStatusRef.current.state === "playing") {
        tl.play(progress);
      } else {
        tl.pause(progress);
      }
      timelineRef.current = tl;
    } else if (relativeProgress === 1) {
      centerRow.style.backgroundSize = "0px 100%";
    } else if (relativeProgress === -1) {
      centerRow.style.backgroundSize = `${coords[coords.length - 1]}px 100%`;
      const flatternTags = tags.flat().filter(Boolean);
      const areTagsIncreasing = flatternTags.every((x, idx, arr) =>
        idx === 0 ? true : x > arr[idx - 1]
      );
      setIsValid(areTagsIncreasing);
    }
    // Explicitly only depends on relativeProgress to prevent excessive re-renders
  }, [relativeProgress]);

  return (
    <InlineTagRowContainer>
      <InlineTagContainer>
        {furigana.map((t, idx) => (
          <span
            key={idx}
            style={{
              left: coords[t.range[0] - 1] ?? 0,
              width: coords[t.range[1] - 1] - (coords[t.range[0] - 1] ?? 0),
            }}
          >
            {t.content}
          </span>
        ))}
      </InlineTagContainer>
      <InlineMainContainer ref={centerRowRef}>
        {[...line.content].map((i, idx) => (
          <span key={idx} onClick={() => onUpdateCursor?.(idx)}>
            {i}
          </span>
        ))}
        <span
          onClick={() => onUpdateCursor?.(line.content.length)}
          data-is-valid={isValid}
        />
      </InlineMainContainer>
      <InlineLabelContainer>
        {dots?.map((x, idx) =>
          x ? (
            <span key={idx} style={{ left: coords[idx - 1] ?? 0 }}>
              {x === -1 ? (
                <span
                  data-current={
                    dotCursorIdx &&
                    dotCursorIdx[0] === idx &&
                    dotCursorIdx[1] === 0
                  }
                >
                  □
                </span>
              ) : (
                Array(x)
                  .fill(null)
                  .map((_, i) => (
                    <span
                      key={i}
                      data-current={
                        dotCursorIdx &&
                        dotCursorIdx[0] === idx &&
                        dotCursorIdx[1] === i
                      }
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
            className="cursor"
          >
            ◢
          </span>
        )}
      </InlineLabelContainer>
      <InlineLabelContainer data-tags>
        {[0, ...coords]
          .filter((x, idx) => tags?.[idx]?.length > 0)
          .map((x, idx) => (
            <span key={idx} style={{ left: x, width: coords[idx] - x }}>
              ◣
            </span>
          ))}
      </InlineLabelContainer>
      <ApplyMarksToAllButtonMemo
        applyMarksToAll={applyMarksToAll}
        lineContent={line.content}
      />
    </InlineTagRowContainer>
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
    prev.dotCursorIdx?.[0] === next.dotCursorIdx?.[0] &&
    prev.dotCursorIdx?.[1] === next.dotCursorIdx?.[1]
  );
});
