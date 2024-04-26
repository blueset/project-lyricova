import { memo } from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { styled } from "@mui/material/styles";

function lineToTimeSegments(line: LyricsKitLyricsLine) {
  const timeTags = line.attachments?.timeTag?.tags ?? [];
  const rubyBoundaries =
    line.attachments?.furigana?.flatMap((f) => [f.leftIndex, f.rightIndex]) ??
    [];
  const segments: { index: number; timeMs: number }[] = [];
  timeTags.forEach((tag, idx) => {
    segments.push({ index: tag.index, timeMs: tag.timeTag * 1000 });

    while (rubyBoundaries.length && tag.index === rubyBoundaries[0]) {
      rubyBoundaries.shift();
    }

    if (
      timeTags[idx + 1] &&
      rubyBoundaries.length &&
      timeTags[idx + 1].index > rubyBoundaries[0]
    ) {
      const percentage =
        (rubyBoundaries[0] - tag.index) / (timeTags[idx + 1].index - tag.index);
      const timeMs =
        tag.timeTag * 1000 +
        percentage * (timeTags[idx + 1].timeTag - tag.timeTag) * 1000;
      segments.push({ index: rubyBoundaries[0], timeMs });
      rubyBoundaries.shift();
    }
  });

  while (timeTags.length && rubyBoundaries.length) {
    segments.push({ index: rubyBoundaries[0], timeMs: segments.at(-1).timeMs });
    rubyBoundaries.shift();
  }

  return segments;
}

const TimedSpan = styled("span")(
  (props: { startTimeMs: number; endTimeMs?: number }) => ({
    opacity: `calc(sign(var(--lyrics-time) - ${props.startTimeMs}) * 0.25 + 0.75)`,
    willChange: "opacity",
  })
);

function buildTimeSpans(
  content: string,
  lineAnchorMs: number,
  timeSegments: { index: number; timeMs: number }[],
  tillIdx: number = Infinity
) {
  // console.log("buildTimeSpans, content: %o, lineAnchorMs: %o, timeSegments: %o, tillIdx: %o", content, lineAnchorMs, timeSegments, tillIdx);
  const spans: JSX.Element[] = [];
  while (timeSegments.length && timeSegments[0].index < tillIdx) {
    const segment = timeSegments.shift();
    // console.log("buildTimeSpans, segment: %o, slicing from %o to %o", segment, segment.index, timeSegments[0]?.index);
    spans.push(
      <TimedSpan startTimeMs={lineAnchorMs + segment.timeMs}>
        {content.slice(segment.index, timeSegments[0]?.index)}
      </TimedSpan>
    );
  }
  return spans;
}

const InnerLineDiv = styled("div")({
  fontWeight: 600,
  lineHeight: 1,
});

interface LineRendererProps {
  line: LyricsKitLyricsLine;
}

function InnerLineRenderer({ line }: LineRendererProps) {
  if (!line.attachments?.timeTag?.tags?.length) {
    return (
      <div>
        <TimedSpan startTimeMs={line.position * 1000}>{line.content}</TimedSpan>
      </div>
    );
  }

  const spans: JSX.Element[] = [];
  const timeSegments = lineToTimeSegments(line);
  const rubyBoundaries = line.attachments?.furigana ?? [];
  const lineAnchorMs = line.position * 1000;
  if (timeSegments[0].index > 0) {
    spans.push(
      <TimedSpan startTimeMs={lineAnchorMs}>
        {line.content.slice(0, timeSegments[0].index)}
      </TimedSpan>
    );
  }
  rubyBoundaries.forEach((ruby) => {
    const tillIdx = ruby.rightIndex;
    spans.push(
      ...buildTimeSpans(
        line.content,
        lineAnchorMs,
        timeSegments,
        ruby.leftIndex
      )
    );
    const rubyStartTimeMs = timeSegments[0].timeMs;
    // console.log("rubyBoundries, ruby: %o, tillIdx: %o, rubyStartTime: %o", ruby, tillIdx, rubyStartTimeMs);
    const inRubySpans = buildTimeSpans(
      line.content,
      lineAnchorMs,
      timeSegments,
      tillIdx
    );
    spans.push(
      <ruby>
        {inRubySpans}
        <rp>(</rp>
        <rt><TimedSpan startTimeMs={lineAnchorMs + rubyStartTimeMs}>{ruby.content}</TimedSpan></rt>
        <rp>)</rp>
      </ruby>
    );
  });
  spans.push(...buildTimeSpans(line.content, lineAnchorMs, timeSegments));

  return <InnerLineDiv>{spans}</InnerLineDiv>;
}

export const LineRenderer = memo<LineRendererProps>(
  InnerLineRenderer,
  (prev, next) => prev.line === next.line
);

LineRenderer.displayName = "LineRenderer";
