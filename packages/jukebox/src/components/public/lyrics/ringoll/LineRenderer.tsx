import { PropsWithChildren, forwardRef, memo, useCallback, useImperativeHandle, useRef } from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { styled } from "@mui/material/styles";
import { LyricsAnimationRef } from "./AnimationRef.type";

function lineToTimeSegments(line: LyricsKitLyricsLine, lineStart: number, lineEnd: number) {
  const timeTags = line.attachments?.timeTag?.tags ?? [];
  const rubyBoundaries =
    (line.attachments?.furigana?.flatMap((f) => [f.leftIndex, f.rightIndex]) ??
    []).reduce((acc, cur) => {
      if (acc.at(-1) !== cur) acc.push(cur);
      return acc;
    }, [] as number[]);
  const segments: { index: number; start: number, end: number }[] = [];
  if (timeTags.length === 0) {
    return [{ index: 0, start: lineStart, end: lineEnd }];
  }
  if (timeTags[0].index > 0) {
    segments.push({ index: 0, start: 0, end: timeTags[0].timeTag });
  }
  timeTags.forEach((tag, idx) => {
    let segmentIndex = tag.index;
    let segmentStart = tag.timeTag;
    const segmentEnd = timeTags[idx + 1] ? (timeTags[idx + 1].timeTag) : (lineEnd - lineStart);

    while (rubyBoundaries.length && tag.index === rubyBoundaries[0]) {
      rubyBoundaries.shift();
    }

    while (
      timeTags[idx + 1] &&
      rubyBoundaries.length &&
      timeTags[idx + 1].index > rubyBoundaries[0]
    ) {
      const nextSegmentIndex = timeTags[idx + 1]?.index ?? line.content.length;
      const percentage =
        (rubyBoundaries[0] - segmentIndex) / (nextSegmentIndex - segmentIndex);
      const start =
        segmentStart +
        percentage * (segmentEnd - segmentStart);
      segments.push({ index: segmentIndex, start: segmentStart, end: start });
      // console.log("lineToTimeSegments, #%o, line: %o, lineStart: %o, lineEnd: %o, percentage: %o, rubyBoundaries: %o, segmentIndex: %o", segmentIndex, line.content[segmentIndex], segmentStart, start, percentage, rubyBoundaries, segmentIndex);
      segmentIndex = rubyBoundaries[0];
      segmentStart = start;
      rubyBoundaries.shift();
    }
    // console.log("lineToTimeSegments, #%o, line: %o, lineStart: %o, lineEnd: %o", segmentIndex, line.content[segmentIndex], segmentStart, segmentEnd);
    segments.push({ index: segmentIndex, start: segmentStart, end: segmentEnd });
  });

  while (timeTags.length && rubyBoundaries.length) {
    segments.push({ index: rubyBoundaries[0], start: segments.at(-1).start, end: lineEnd - lineStart });
    rubyBoundaries.shift();
  }

  if (segments.at(-1).index < line.content.length) {
    segments.push({ index: line.content.length, start: segments.at(-1).end, end: lineEnd });
  }

  // console.log("lineToTimeSegments, line: %o, lineStart: %o, lineEnd: %o, segments:", line.content, lineStart, lineEnd);
  // console.log(...segments);

  return segments;
}

const GRADIENT_WIDTH_PX = 10;
const GRADIENT_PADDING = 20;
const FILLED_OPACITY = 100;
const BLANK_OPACITY = 50;

function generateMaskStyle(width: number) {
  const maskSize = width * 2 + GRADIENT_WIDTH_PX + GRADIENT_PADDING * 2;
  const gradientStartPercent = (width + GRADIENT_PADDING) / maskSize * 100;
  const gradientEndPercent = (width + GRADIENT_WIDTH_PX + GRADIENT_PADDING) / maskSize * 100;
  const maskImage = `linear-gradient(
    to right, 
    color-mix(in srgb, currentcolor ${FILLED_OPACITY}%, transparent) ${gradientStartPercent}%, 
    color-mix(in srgb, currentcolor ${BLANK_OPACITY}%, transparent) ${gradientEndPercent}%
  )`;
  const maskProgressSize = - width - GRADIENT_WIDTH_PX - GRADIENT_PADDING;
  const maskScale = `${maskSize / width * 100}% 100%`;
  return { maskImage, maskScale, maskProgressSize };
}

const TimedSpan = forwardRef<LyricsAnimationRef, PropsWithChildren<{ startTime: number; endTime: number, static?: boolean }>>(
  function TimedSpan({ startTime, endTime, "static": isStatic, children }, ref) {
    // const spanRef = useRef<HTMLSpanElement>(null);
    const webAnimationRefs = useRef<Animation[]>([]);
    const refCallback = useCallback((node?: HTMLSpanElement) => {
      // webAnimationRefs.current.forEach(anim => anim.cancel());
      if (isStatic) {
        if (node && node.style.opacity !== "1") {
          node.style.opacity = "1";
          const duration = Math.max(0.1, endTime - startTime);
          webAnimationRefs.current = [
            node.animate([
              {opacity: "0.5"},
              {opacity: "1", offset: 0.1},
              {opacity: "1", offset: 0.9},
              {opacity: "0.5", offset: 1},
            ], {
              delay: startTime * 1000,
              duration: duration * 1000,
              fill: "both",
              id: `static-mask-${startTime}-${endTime}-${children}`
            })
          ];
        }
      } else {
        if (node && node.style.maskRepeat !== "no-repeat") {
          const { maskImage, maskScale, maskProgressSize } = generateMaskStyle(node.offsetWidth);
          node.style.maskImage = maskImage;
          node.style.maskSize = maskScale;
          node.style.maskRepeat = "no-repeat";
          node.style.maskOrigin = "left";
          const duration = Math.max(0.1, endTime - startTime);
          // console.log("duration: %o, startTime: %o, endTime: %o", duration, startTime, endTime);
          webAnimationRefs.current = [
            node.animate([
              {maskPosition: `${maskProgressSize}px 0`},
              {maskPosition: `${-GRADIENT_PADDING}px 0`}
            ], {
              delay: startTime * 1000,
              duration: duration * 1000,
              fill: "both",
              id: `mask-${startTime}-${endTime}-${children}`
            })
          ];
        }
      }
    }, [children, endTime, isStatic, startTime]);
    useImperativeHandle(ref, () => ({
      resume(time?: number) {
        // console.log("Resume at %o, %o", time ?? "current time", webAnimationRefs.current);
        webAnimationRefs.current.forEach((anim) => {
          anim.currentTime = time ? time * 1000 : 0;
          if (time <= endTime) anim.play(); else anim.pause();
        });
      },
      pause(time?: number) {
        // console.log("Pause at %o, %o", time ?? "current time", webAnimationRefs.current);
        webAnimationRefs.current.forEach((anim) => {
          anim.pause();
          anim.currentTime = time ? time * 1000 : 0;
        });
      }
    }));
    return (
      <span ref={refCallback}>
        {children}
      </span>
    );
  }
);


function buildTimeSpans(
  content: string,
  timeSegments: { index: number; start: number, end: number }[],
  setRef: (idx: number) => (ref: LyricsAnimationRef) => void,
  tillIdx: number = Infinity,
) {
  // console.log("buildTimeSpans, content: %o, lineAnchorMs: %o, timeSegments: %o, tillIdx: %o", content, lineAnchorMs, timeSegments, tillIdx);
  const spans: JSX.Element[] = [];
  while (timeSegments.length && timeSegments[0].index < tillIdx) {
    const segment = timeSegments.shift();
    const child = content.slice(segment.index, timeSegments[0]?.index);
    // console.log("buildTimeSpans, segment: %o, slicing from %o to %o", segment, segment.index, timeSegments[0]?.index, child);
    if (child) {
      spans.push(
        <TimedSpan key={segment.index} startTime={segment.start} endTime={segment.end} ref={setRef(segment.index + 1)}>
          {child}
        </TimedSpan>
      );
    }
  }
  return spans;
}

const InnerLineDiv = styled("div")({
  fontWeight: 600,
  lineHeight: 1,
  textWrap: "balance",
});

interface LineRendererProps {
  line: LyricsKitLyricsLine;
  start: number;
  end: number;
}

const InnerLineRenderer = forwardRef<LyricsAnimationRef, LineRendererProps>(function InnerLineRenderer({ line, start, end }, ref) {
  const animationRefs = useRef<{ [idx: number]: LyricsAnimationRef }>({});
  const setRef = (idx: number) => (ref?: LyricsAnimationRef) => { animationRefs.current[idx] = ref; };

  useImperativeHandle(ref, () => ({
    resume(time?: number) {
      if (start <= time && time <= end) {
        Object.values(animationRefs.current).forEach((ref) => ref?.resume(time - start));
      } else {
        Object.values(animationRefs.current).forEach((ref) => ref?.pause(time - start));
      }
    },
    pause(time?: number) {
      Object.values(animationRefs.current).forEach((ref) => ref?.pause(time - start));
    }
  }));

  if (!line.attachments?.timeTag?.tags?.length) {
    return (
      <InnerLineDiv>
        <TimedSpan startTime={0} endTime={end - start} ref={setRef(1)} static>{line.content}</TimedSpan>
      </InnerLineDiv>
    );
  }

  const spans: JSX.Element[] = [];
  const timeSegments = lineToTimeSegments(line, start, end);
  const rubyBoundaries = line.attachments?.furigana ?? [];
  rubyBoundaries.forEach((ruby) => {
    const tillIdx = ruby.rightIndex;
    // console.log("rubyBoundaries", ruby, timeSegments[0]);
    spans.push(
      ...buildTimeSpans(
        line.content,
        timeSegments,
        setRef,
        ruby.leftIndex
      )
    );
    // console.log("rubyBoundaries, before ruby", ruby, timeSegments[0]);
    const rubyStartTime = timeSegments[0].start;
    const inRubySpans = buildTimeSpans(
      line.content,
      timeSegments,
      setRef,
      tillIdx
    );
    // console.log("rubyBoundaries, in ruby", ruby, tillIdx, inRubySpans, timeSegments[0]);
    const rubyEndTime = timeSegments[0]?.start ?? end;
    spans.push(
      <ruby key={-ruby.leftIndex}>
        {inRubySpans}
        <rp>(</rp>
        <rt><TimedSpan startTime={rubyStartTime} endTime={rubyEndTime} ref={setRef(-ruby.leftIndex)}>{ruby.content}</TimedSpan></rt>
        <rp>)</rp>
      </ruby>
    );
  });
  spans.push(...buildTimeSpans(line.content, timeSegments, setRef));

  return <InnerLineDiv>{spans}</InnerLineDiv>;
});

export const LineRenderer = memo(
  InnerLineRenderer,
  (prev, next) => prev.line === next.line && prev.start === next.start && prev.end === next.end
);

LineRenderer.displayName = "LineRenderer";
