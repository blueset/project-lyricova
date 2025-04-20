import {
  ElementType,
  FC,
  PropsWithChildren,
  ReactElement,
  RefAttributes,
  forwardRef,
  memo,
  useImperativeHandle,
  useRef,
} from "react";
import { LyricsAnimationRef } from "./AnimationRef.type";
import { LyricsKitLyricsLine } from "@lyricova/api/graphql/types";
import FuriganaLyricsLine from "../../../FuriganaLyricsLine";

function lineToTimeSegments(
  line: LyricsKitLyricsLine,
  lineStart: number,
  lineEnd: number
) {
  const timeTags = line.attachments?.timeTag?.tags ?? [];
  const rubyBoundaries = (
    line.attachments?.furigana?.flatMap((f) => [f.leftIndex, f.rightIndex]) ??
    []
  ).reduce((acc, cur) => {
    if (acc.at(-1) !== cur) acc.push(cur);
    return acc;
  }, [] as number[]);
  const segments: { index: number; start: number; end: number }[] = [];
  if (timeTags.length === 0) {
    return [{ index: 0, start: lineStart, end: lineEnd }];
  }
  if (timeTags[0].index > 0) {
    segments.push({ index: 0, start: 0, end: timeTags[0].timeTag });
  }
  timeTags.forEach((tag, idx) => {
    let segmentIndex = tag.index;
    let segmentStart = tag.timeTag;
    const segmentEnd = timeTags[idx + 1]
      ? timeTags[idx + 1].timeTag
      : lineEnd - lineStart;

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
      const start = segmentStart + percentage * (segmentEnd - segmentStart);
      segments.push({ index: segmentIndex, start: segmentStart, end: start });
      // console.log("lineToTimeSegments, #%o, line: %o, lineStart: %o, lineEnd: %o, percentage: %o, rubyBoundaries: %o, segmentIndex: %o", segmentIndex, line.content[segmentIndex], segmentStart, start, percentage, rubyBoundaries, segmentIndex);
      segmentIndex = rubyBoundaries[0];
      segmentStart = start;
      rubyBoundaries.shift();
    }
    // console.log("lineToTimeSegments, #%o, line: %o, lineStart: %o, lineEnd: %o", segmentIndex, line.content[segmentIndex], segmentStart, segmentEnd);
    segments.push({
      index: segmentIndex,
      start: segmentStart,
      end: segmentEnd,
    });
  });

  while (timeTags.length && rubyBoundaries.length) {
    segments.push({
      index: rubyBoundaries[0],
      start: segments.at(-1).start,
      end: lineEnd - lineStart,
    });
    rubyBoundaries.shift();
  }

  if (segments.at(-1).index < line.content.length) {
    segments.push({
      index: line.content.length,
      start: segments.at(-1).end,
      end: lineEnd,
    });
  }

  // console.log("lineToTimeSegments, line: %o, lineStart: %o, lineEnd: %o, segments:", line.content, lineStart, lineEnd);
  // console.log(...segments);

  return segments;
}

export type TimedSpanProps = PropsWithChildren<{
  startTime: number;
  endTime: number;
  static?: boolean;
}>;
export type TimedSpanPropsWithRef = TimedSpanProps &
  RefAttributes<LyricsAnimationRef>;
export type TimedSpanComponent = FC<TimedSpanPropsWithRef>;

function buildTimeSpans(
  TimedSpan: TimedSpanComponent,
  content: string,
  timeSegments: { index: number; start: number; end: number }[],
  setRef: (idx: number) => (ref: LyricsAnimationRef) => void,
  tillIdx: number = Infinity
) {
  // console.log("buildTimeSpans, content: %o, lineAnchorMs: %o, timeSegments: %o, tillIdx: %o", content, lineAnchorMs, timeSegments, tillIdx);
  const spans: ReactElement[] = [];
  while (timeSegments.length && timeSegments[0].index < tillIdx) {
    const segment = timeSegments.shift();
    const child = content.slice(segment.index, timeSegments[0]?.index);
    // console.log("buildTimeSpans, segment: %o, slicing from %o to %o", segment, segment.index, timeSegments[0]?.index, child);
    if (child) {
      spans.push(
        <TimedSpan
          key={segment.index}
          startTime={segment.start}
          endTime={segment.end}
          ref={setRef(segment.index + 1)}
        >
          {child}
        </TimedSpan>
      );
    }
  }
  return spans;
}

interface LineRendererProps<TContainer extends ElementType = ElementType> {
  line: LyricsKitLyricsLine;
  start: number;
  end: number;
  lineContainer: TContainer;
  lineContainerProps?: Omit<PropsWithChildren<TContainer>, "children">;
  timedSpan: TimedSpanComponent;
}

const InnerLineRenderer = forwardRef<LyricsAnimationRef, LineRendererProps>(
  function InnerLineRenderer(
    {
      line,
      start,
      end,
      lineContainer: LineContainer,
      timedSpan: TimedSpan,
      lineContainerProps,
    },
    ref
  ) {
    const animationRefs = useRef<{ [idx: number]: LyricsAnimationRef }>({});
    const setRef = (idx: number) => (ref?: LyricsAnimationRef) => {
      animationRefs.current[idx] = ref;
    };

    useImperativeHandle(ref, () => ({
      resume(time?: number) {
        if (!Object.keys(animationRefs.current).length) {
          console.log("no refs found in array");
          return;
        }

        if (start <= time && time <= end) {
          Object.values(animationRefs.current).forEach((ref) =>
            ref
              ? ref?.resume(time - start)
              : console.log("ref is not found", ref)
          );
        } else {
          Object.values(animationRefs.current).forEach((ref) =>
            ref
              ? ref?.pause(time - start)
              : console.log("ref is not found", ref)
          );
        }
      },
      pause(time?: number) {
        if (!Object.keys(animationRefs.current).length) {
          console.log("no refs found in array");
          return;
        }

        Object.values(animationRefs.current).forEach((ref) =>
          ref ? ref?.pause(time - start) : console.log("ref is not found", ref)
        );
      },
    }));

    if (!line.attachments?.timeTag?.tags?.length) {
      return (
        <LineContainer {...lineContainerProps}>
          <TimedSpan startTime={0} endTime={end - start} ref={setRef(1)} static>
            <FuriganaLyricsLine graphQLSourceLine={line} />
          </TimedSpan>
        </LineContainer>
      );
    }

    const spans: React.ReactNode[] = [];
    const timeSegments = lineToTimeSegments(line, start, end);
    const rubyBoundaries = line.attachments?.furigana ?? [];
    rubyBoundaries.forEach((ruby) => {
      const tillIdx = ruby.rightIndex;
      // console.log("rubyBoundaries", ruby, timeSegments[0]);
      spans.push(
        ...buildTimeSpans(
          TimedSpan,
          line.content,
          timeSegments,
          setRef,
          ruby.leftIndex
        )
      );
      // console.log("rubyBoundaries, before ruby", ruby, timeSegments[0]);
      const rubyStartTime = timeSegments[0].start;
      const inRubySpans = buildTimeSpans(
        TimedSpan,
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
          <rt>
            <TimedSpan
              startTime={rubyStartTime}
              endTime={rubyEndTime}
              ref={setRef(-ruby.leftIndex)}
            >
              {ruby.content}
            </TimedSpan>
          </rt>
          <rp>)</rp>
        </ruby>
      );
    });
    spans.push(
      ...buildTimeSpans(TimedSpan, line.content, timeSegments, setRef)
    );

    return <LineContainer {...lineContainerProps}>{spans}</LineContainer>;
  }
);

export const LineRenderer = memo(
  InnerLineRenderer,
  (prev, next) =>
    prev.line === next.line &&
    prev.start === next.start &&
    prev.end === next.end
);

LineRenderer.displayName = "LineRenderer";
