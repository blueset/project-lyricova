import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/components/gql/schema";
import { useAppContext } from "../AppContext";
import type {
  PlayerLyricsKeyframe,
  PlayerLyricsState,
} from "../../../hooks/types";
import { usePlayerLyricsState } from "../../../hooks/usePlayerLyricsState";
import _ from "lodash";
import { useQuery } from "@apollo/client/react";
import type { RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useResizeObserver } from "../../../hooks/useResizeObserver";
import measureElement, {
  measureTextWidths,
} from "../../../frontendUtils/measure";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import gsap from "gsap";
import { graphql } from "@lyricova/components/gql";
import { cn } from "@lyricova/components/utils";
import { readPlaybackSnapshot } from "../../../hooks/useMediaClock";
import { synchronizeGsapTimeline } from "../../../hooks/useTrackwiseTimelineControl";

type Timeline = gsap.core.Timeline;
const COUNTDOWN_DURATION = 3;

const SEQUENCE_QUERY = graphql(`
  query KaraokeTransliteration(
    $text: String!
    $furigana: [[FuriganaLabel!]!]! = []
  ) {
    transliterate(text: $text, furigana: $furigana) {
      text
      karaoke
    }
  }
`);

//#region Page builders
interface KaraokePage {
  /** Show countdown? */
  countdown: boolean;

  /** Index number of lines on the page. */
  lines: number[];

  start: number;
  end: number;
}

const FOUR_LINE_PAGE_SEC_PER_CHAR_THRESHOLD = 0.15;

/** Get line numbers of next page by looking ahead. */
function lookAhead(index: number, lineLengths: number[], secPerChar: number[]) {
  let i = index;
  // Skip initial dividers
  while (i < secPerChar.length && secPerChar[i] === 0) i++;
  let total = 0,
    belowThreshold = 0;
  const lines: number[] = [];

  while (i < secPerChar.length && total < 4) {
    total++;
    belowThreshold +=
      secPerChar[i] < FOUR_LINE_PAGE_SEC_PER_CHAR_THRESHOLD ? 1 : 0;
    lines.push(i);
    i++;
    if (total === 2 && belowThreshold === 0) return lines;

    // Skip dismissible dividers
    while (i < secPerChar.length && secPerChar[i] === 0 && lineLengths[i] < 1)
      i++;

    // Break on long dividers
    if (secPerChar[i] === 0) break;
  }

  // return result
  if (total === 4) {
    if (belowThreshold >= 3) return lines;
    else return lines.slice(0, 2);
  }
  return lines;
}

/**
 * @param lyrics Lyrics to process
 * @param duration Duration of the song
 */
function buildPages(lyrics: LyricsKitLyrics, duration: number): KaraokePage[] {
  duration = lyrics.length ?? duration;
  const lineLengths = lyrics.lines.map((v, idx, arr) =>
    idx + 1 !== arr.length
      ? arr[idx + 1].position - v.position
      : duration - v.position,
  );
  const secPerChar = lyrics.lines.map((v, idx) => {
    const t = v.content.trim().length;
    return t === 0 ? 0 : lineLengths[idx] / t;
  });

  const pages: KaraokePage[] = [];

  let i = 0,
    countdown = true;

  // Skip all leading empty lines
  while (i < secPerChar.length && secPerChar[i] === 0) i++;

  while (i < lyrics.lines.length) {
    if (secPerChar[i] > 0) {
      // Line is non-empty
      const lines = lookAhead(i, lineLengths, secPerChar);
      if (lines.length < 1) {
        i++;
        continue;
      }
      const start = lyrics.lines[lines[0]].position;
      const end =
        lines[lines.length - 1] + 1 < lyrics.lines.length
          ? lyrics.lines[lines[lines.length - 1] + 1].position
          : duration;
      pages.push({
        countdown,
        lines,
        // start: countdown ? start - COUNTDOWN_DURATION : start,
        start,
        end,
      });
      i = lines[lines.length - 1] + 1;
      countdown = false;
    } else {
      // Line is empty
      if (lineLengths[i] > COUNTDOWN_DURATION) {
        countdown = true;
      }
      i++;
    }
  }

  return pages;
}

//#endregion Page builders

//#region Lyrics state

// Line = -1 means countdown
type KaraokeJaState =
  | {
      /**
       * Null to hide the page.
       */
      pageIdx: number;
      /**
       * Line Index.
       * * -1 for countdown
       * * `lines.length` to stay on the end of the page
       * * `null` to stay on the beginning of the page
       */
      lineIdx: number | null;
      showNext: boolean;
    }
  | {
      pageIdx: null;
      lineIdx: null;
      showNext: false;
    };

function useNicokaraLyricsState(
  lyrics: LyricsKitLyrics,
  playerRef: RefObject<HTMLAudioElement>,
  pages: KaraokePage[],
): PlayerLyricsState<KaraokeJaState> {
  const keyframes = useMemo<PlayerLyricsKeyframe<KaraokeJaState>[]>(() => {
    const frames: PlayerLyricsKeyframe<KaraokeJaState>[] = [];
    pages.forEach((v, idx) => {
      const gapAfter =
        (idx + 1 < pages.length
          ? pages[idx + 1].start // Has next page
          : playerRef.current?.duration
            ? playerRef.current.duration // Has duration
            : v.end + COUNTDOWN_DURATION + 1) - v.end; // fallback to 11

      if (v.countdown) {
        if (
          (frames?.[frames.length - 1]?.start ?? 0) <
          v.start - COUNTDOWN_DURATION * 2
        )
          frames.push({
            start: v.start - COUNTDOWN_DURATION * 2,
            data: { pageIdx: idx, lineIdx: null, showNext: false },
          });
        frames.push({
          start: v.start - COUNTDOWN_DURATION,
          data: { pageIdx: idx, lineIdx: -1, showNext: false },
        });
      }
      for (let i = 0; i < v.lines.length; i++) {
        const line = lyrics.lines[v.lines[i]];
        frames.push({
          start: line.position,
          data: { pageIdx: idx, lineIdx: i, showNext: false },
        });
        if (i + 1 === v.lines.length) {
          if (gapAfter < COUNTDOWN_DURATION) {
            frames.push({
              // Time to show next screen preview: after 1/4 of the last line has past
              start: line.position + (v.end - line.position) / 4,
              data: { pageIdx: idx, lineIdx: i, showNext: true },
            });
            if (gapAfter > 0 && idx + 1 < pages.length) {
              frames.push({
                start: v.end,
                data: { pageIdx: idx + 1, lineIdx: null, showNext: false },
              });
            }
          } else {
            // >= COUNTDOWN_DURATION seconds gap after
            frames.push({
              start: v.end,
              data: { pageIdx: idx, lineIdx: v.lines.length, showNext: false },
            });
            if (gapAfter > COUNTDOWN_DURATION * 3) {
              frames.push({
                start: v.end + COUNTDOWN_DURATION,
                data: { pageIdx: null, lineIdx: null, showNext: false },
              });
            }
          }
        }
      }
    });
    return frames;
  }, [lyrics.lines, pages, playerRef]);

  return usePlayerLyricsState(keyframes, playerRef);
}

//#endregion Lyrics state

interface CountdownProps {
  activeRef?: RefObject<HTMLSpanElement | null>;
  className?: string;
}

function Countdown({ activeRef, className }: CountdownProps) {
  const content = "●●●●●";
  return (
    <div
      className={cn(
        "relative w-0 tracking-widest -translate-y-16 text-[max(0.5em,1.5rem)]",
        className,
      )}
    >
      <span className="before absolute top-0 left-0 color-white [filter:url(#nicokaraBefore)]">
        {content}
      </span>
      <span
        className="after group-data-done/line:![clip-path:none] [clip-path:inset(-50%_102%_-10%_-2%)] group-data-pending/line:![clip-path:inset(-50%_102%_-10%_-2%)] group-data-active/line:[clip-path:inset(-50%_102%_-10%_-2%)] text-primary-darker"
        ref={activeRef}
      >
        <span className="[filter:url(#nicokaraAfter)]">{content}</span>
      </span>
    </div>
  );
}

interface LyricsLineProps {
  textLine: string;
  furiganaLine?: [string, string][] | null;
  done?: boolean;
  activeRef?: RefObject<HTMLSpanElement | null> | null;
}

function LyricsLine({
  textLine,
  furiganaLine,
  done,
  activeRef,
}: LyricsLineProps) {
  const thisRef = useRef<HTMLSpanElement>(null);
  const elm = thisRef.current;
  if (elm && (activeRef === null || done)) {
    elm.style.clipPath = "inset(-50% 102% -10% -2%)";
  }

  const content = furiganaLine ? (
    <FuriganaLyricsLine transliterationLine={furiganaLine} />
  ) : (
    <span>{textLine}</span>
  );
  return (
    <div
      className="relative font-extrabold font-serif whitespace-nowrap group/line"
      data-done={done ? "true" : undefined}
      data-pending={!done && !activeRef ? "true" : undefined}
      data-active={activeRef ? "true" : undefined}
    >
      <span className="before absolute top-0 left-0 text-white [filter:url(#nicokaraBefore)]">
        {content}
      </span>
      <span
        className="after text-primary-darker [clip-path:inset(-50%_102%_-10%_-2%)] group-data-done/line:![clip-path:none] group-data-pending/line:![clip-path:inset(-50%_102%_-10%_-2%)] group-data-active/line:[clip-path:inset(-50%_102%_-10%_-2%)]"
        ref={(elm) => {
          thisRef.current = elm;
          if (activeRef) activeRef.current = elm;
        }}
      >
        <span className="[filter:url(#nicokaraAfter)]">{content}</span>
      </span>
    </div>
  );
}

function LyricsLineHTML({ textLine, furiganaLine }: LyricsLineProps): string {
  const content = furiganaLine
    ? furiganaLine
        .map(([text, ruby]) => {
          if (text === ruby) {
            return `<span>${text}</span>`;
          } else {
            return `<ruby>${text}<rp>(</rp><rt>${ruby}</rt><rp>)</rp></ruby>`;
          }
        })
        .join("")
    : `<span>${textLine}</span>`;
  return `<span style="position:relative;font-weight: 800;font-family: Source Han Serif,Noto Serif CJK,Noto Serif JP,serif;white-space:pre;">${content}</span>`;
}

const LINE_OVERLAP_FACTOR = 0.1;

interface PageClassInfo {
  index: number;
  className: string;
  left: number | null;
  right: number | null;
}

function buildPageClasses(
  lines: number[],
  lyrics: LyricsKitLyrics,
  furigana: [string, string][][] | null | undefined,
  containerWidth: number,
) {
  const lineWidths = lines.map((v) => {
    const line = lyrics.lines[v];
    return line
      ? measureElement(
          LyricsLineHTML({
            textLine: line.content,
            furiganaLine: furigana?.[v],
          }),
        ).width
      : 0;
  });

  const classes: string[] = lines.map(
    (v, idx) => `line-${lines.length}-${idx + 1}`,
  );

  const result: (PageClassInfo | null)[] = [];
  lines.forEach((v, idx) => {
    result.push({
      index: v,
      className: classes[idx] ?? "",
      left: null,
      right: null,
    });
  });
  const lineOverlap = containerWidth * LINE_OVERLAP_FACTOR;
  const stretchedWidth =
    _.sum(lineWidths) - lineOverlap * (lineWidths.length - 1);
  const padding = (containerWidth - stretchedWidth) / 2;
  if (result.length === 1) {
    result[0]!.left = 1;
    result[0]!.right = 1;
  } else {
    if (stretchedWidth < containerWidth) {
      let i = 0,
        left = padding;
      while (i < result.length) {
        const resultLine = result[i]!;
        const lineWidth = lineWidths[i] ?? 0;
        resultLine.left = left;
        resultLine.right = containerWidth - lineWidth - left;
        left += lineWidth - lineOverlap;
        i++;
      }
    } else {
      for (let i = 0; i < result.length; i++) {
        const resultLine = result[i]!;
        if (i === 0) resultLine.right = 1;
        else if (i === result.length - 1) resultLine.left = 1;
        else {
          resultLine.left = i;
          resultLine.right = result.length - i - 1;
        }
      }
    }
  }
  if (result.length === 1) result.push(null);
  return result;
}

interface LyricsScreenProps {
  thisPage: KaraokePage | null;
  nextPage: KaraokePage | null;
  showNext: boolean;
  lineIdx: number | null;
  containerWidth: number;
  lyrics: LyricsKitLyrics;
  furigana?: [string, string][][] | null;
  activeRef?: RefObject<HTMLSpanElement | null>;
}

function LyricsScreen({
  thisPage,
  nextPage,
  showNext,
  lineIdx,
  lyrics,
  furigana,
  activeRef,
  containerWidth,
}: LyricsScreenProps) {
  let linesToShow: (PageClassInfo | null)[] = [null, null, null, null];
  let offsetLineIdx = lineIdx;
  showNext = Boolean(
    showNext &&
    thisPage &&
    nextPage &&
    !nextPage.countdown &&
    nextPage.start - thisPage.end < 1,
  );

  if (thisPage !== null) {
    const thisPageWithClass = buildPageClasses(
      thisPage.lines,
      lyrics,
      furigana,
      containerWidth,
    );
    if (showNext && nextPage) {
      const nextPageLines = buildPageClasses(
        nextPage.lines,
        lyrics,
        furigana,
        containerWidth,
      );
      linesToShow = linesToShow.concat(
        nextPageLines.slice(0, nextPageLines.length - 1),
      );
      linesToShow.push(thisPageWithClass[thisPageWithClass.length - 1]);
    } else {
      linesToShow = linesToShow.concat(thisPageWithClass);
    }
    linesToShow = linesToShow.slice(linesToShow.length - 4);
    offsetLineIdx =
      lineIdx === null || lineIdx < 0
        ? lineIdx
        : 4 - thisPage.lines.length + lineIdx;
    if (thisPage.lines.length === 1 && offsetLineIdx !== null) {
      offsetLineIdx--;
    }
  }

  const countdown =
    thisPage && thisPage.countdown && lineIdx === -1 ? (
      <Countdown activeRef={activeRef} />
    ) : null;
  const firstNotNull = linesToShow.reduce<number | null>(
    (prev, curr, idx) => (prev === null && curr !== null ? idx : prev),
    null,
  );
  const renderRow = (rowIndex: number, rowClass: string, done: boolean) => {
    const lineInfo = linesToShow[rowIndex];
    if (!lineInfo) return null;
    const lyricLine = lyrics.lines[lineInfo.index];
    if (!lyricLine) return null;
    return (
      <div
        className={cn(
          "h-36 flex flex-row relative items-end" /* row */,
          rowClass,
        )}
      >
        {lineInfo.left !== null && <div style={{ flexGrow: lineInfo.left }} />}
        {firstNotNull === rowIndex && countdown}
        <LyricsLine
          textLine={lyricLine.content}
          furiganaLine={furigana?.[lineInfo.index]}
          done={done}
          activeRef={offsetLineIdx === rowIndex ? activeRef : null}
        />
        {lineInfo.right !== null && (
          <div style={{ flexGrow: lineInfo.right }} />
        )}
      </div>
    );
  };

  return (
    <>
      {renderRow(0, "row-4", !showNext && (offsetLineIdx ?? -Infinity) > 0)}
      {renderRow(1, "row-3", !showNext && (offsetLineIdx ?? -Infinity) > 1)}
      {renderRow(2, "row-2", !showNext && (offsetLineIdx ?? -Infinity) > 2)}
      {renderRow(3, "row-1", (offsetLineIdx ?? -Infinity) > 3)}
    </>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

/**
 * Render paginated Japanese karaoke lyrics with line-local GSAP progress.
 *
 * Timelines are rebuilt for each active line or countdown, synchronized from
 * the media clock, and killed when replaced or unmounted.
 */
export function KaraokeJaLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const { ref: measureRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();

  const pages = useMemo(
    () => buildPages(lyrics, playerRef.current?.duration ?? lyrics.length ?? 0),
    // Page should only be rebuild if the 2 parameters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lyrics, playerRef.current?.duration],
  );
  const activeRef = useRef<HTMLSpanElement>(null);

  const { currentFrame, playerState } = useNicokaraLyricsState(
    lyrics,
    playerRef,
    pages,
  );
  const pageIdx = currentFrame?.data.pageIdx ?? null;
  const lineIdx = currentFrame?.data.lineIdx ?? null;
  const showNext = currentFrame?.data.showNext ?? false;
  const [currentLine, currentLineStart, currentLineEnd, nextLineStart] =
    useMemo(():
      | [LyricsKitLyricsLine | null, number, number, number]
      | [null, null, null, null] => {
      if (pageIdx === null) return [null, null, null, null];
      const page = pages[pageIdx];
      if (!page) return [null, null, null, null];
      if (lineIdx !== null && lineIdx > page.lines.length)
        return [null, null, null, null];
      if (currentFrame !== null && lineIdx === null) {
        const firstLineIndex = page.lines[0];
        const firstLine =
          firstLineIndex !== undefined
            ? lyrics.lines[firstLineIndex]
            : undefined;
        if (!firstLine) return [null, null, null, null];
        return [
          null,
          currentFrame.start,
          firstLine.position,
          firstLine.position,
        ];
      }
      if (lineIdx === null) return [null, null, null, null];

      // Countdown pages starts COUNTDOWN_DURATION seconds earlier than first line.
      if (lineIdx < 0)
        return currentFrame
          ? [null, currentFrame.start, page.start, page.start]
          : [null, null, null, null];
      const lineIndex = page.lines[lineIdx];
      if (lineIndex === undefined) return [null, null, null, null];
      const line = lyrics.lines[lineIndex];
      if (!line) return [null, null, null, null];
      const start = line.position;
      const nextLineIndex = page.lines[lineIdx + 1];
      const nextLine =
        nextLineIndex !== undefined ? lyrics.lines[nextLineIndex] : undefined;
      const end =
        lineIdx + 1 === page.lines.length
          ? page.end
          : (nextLine?.position ?? page.end);
      return [line, start, end, end];
    }, [pageIdx, pages, lineIdx, currentFrame, lyrics.lines]);
  const currentLineStartRef = useRef<number | null>(null);
  currentLineStartRef.current = currentLineStart;

  const sequenceQuery = useQuery(SEQUENCE_QUERY, {
    variables: {
      text: lyrics.lines.map((v) => v.content).join("\n"),
      furigana: lyrics.lines.map(
        (v) =>
          v.attachments?.furigana?.map(
            ({ content, leftIndex, rightIndex }) => ({
              content,
              leftIndex,
              rightIndex,
            }),
          ) ?? [],
      ),
    },
  });

  const timelineRef = useRef<Timeline | null>(null);
  // Line object or -1 for countdown.
  const timelineForRef = useRef<LyricsKitLyricsLine | -1 | null>(null);

  useEffect(() => {
    const activeSpan = activeRef.current;
    const shouldUseTimelineFor =
      currentLine !== null ? currentLine : activeSpan !== null ? -1 : null;

    // Build new timeline for new lyrics line
    if (shouldUseTimelineFor !== timelineForRef.current) {
      if (timelineRef.current) timelineRef.current.kill();
      const tl = gsap.timeline({
        paused: true,
      });
      timelineForRef.current = shouldUseTimelineFor;
      if (currentLine === null && activeSpan !== null)
        timelineForRef.current = -1;
      if (activeSpan && currentLineEnd !== null && currentLineStart !== null) {
        const duration = currentLineEnd - currentLineStart;
        if (currentLine?.attachments?.timeTag?.tags?.length) {
          const lengths = measureTextWidths(activeSpan);
          const length = lengths[lengths.length - 1];
          const percentages = lengths.map((v) => {
            // Scale percentages
            const val = (1 - v / length) * 100;
            if (val === 0) return -2;
            if (val === 100) return 102;
            return val;
          });
          const tags = currentLine.attachments.timeTag.tags;
          tl.set(
            activeSpan,
            {
              clipPath: "inset(-50% 102% -10% -2%)",
            },
            0,
          );
          tags.forEach((v, idx) => {
            const duration =
              idx > 0 ? v.timeTag - tags[idx - 1].timeTag : v.timeTag;
            let start = idx > 0 ? tags[idx - 1].timeTag : 0;
            if (start === 0 && v.index !== 0) start = 0.0001;
            let percentage = 102;
            if (v.index > 0) percentage = percentages[v.index - 1];
            tl.to(
              activeSpan,
              {
                clipPath: `inset(-50% ${percentage}% -10% -2%)`,
                ease: "none",
                duration,
              },
              start,
            );
          });
          if (
            currentLineEnd !== nextLineStart &&
            tags[tags.length - 1].index !== currentLine.content.length + 1
          ) {
            tl.to(
              activeSpan,
              {
                clipPath: "inset(-50% 102% -10% -2%)",
                ease: "none",
                duration: nextLineStart - currentLineEnd,
              },
              currentLineEnd,
            );
          }
        } else {
          if (currentLine !== null) {
            tl.fromTo(
              activeSpan,
              {
                clipPath: "inset(-50% 102% -10% -2%)",
              },
              {
                clipPath: "inset(-50% -2% -10% -2%)",
                ease: "none",
                duration,
              },
              0,
            );
          } else {
            // Countdown
            tl.fromTo(
              activeSpan,
              {
                clipPath: "inset(-50% -2% -10% 102%)",
              },
              {
                clipPath: "inset(-50% -2% -10% -2%)",
                ease: "none",
                duration,
              },
              0,
            );
          }
        }
      }
      timelineRef.current = tl;
    }

    // Controls the progress of timeline
    const timeline = timelineRef.current;
    const player = playerRef.current;
    if (timeline && player) {
      const start = currentLineStartRef.current || 0;
      synchronizeGsapTimeline(timeline, readPlaybackSnapshot(player), start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    playerState,
    pageIdx,
    lineIdx,
    currentLineEnd,
    currentLineStart,
    currentLine,
  ]);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
    },
    [],
  );

  let node: React.ReactNode = <span>...</span>;
  if (sequenceQuery.error)
    node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else {
    node = null;
  }

  const page = pageIdx !== null ? (pages[pageIdx] ?? null) : null;
  const nextPage = pageIdx !== null ? (pages[pageIdx + 1] ?? null) : null;
  const karaokeFurigana: [string, string][][] | null =
    sequenceQuery.data?.transliterate.karaoke?.map((line) =>
      line.flatMap((pair) => {
        const [text, ruby] = pair;
        if (text === undefined || ruby === undefined) return [];
        const tuple: [string, string] = [text, ruby];
        return [tuple];
      }),
    ) ?? null;

  return (
    <div
      lang="ja"
      ref={measureRef}
      className={cn(
        "p-16 size-full flex flex-col justify-end text-white",
        "lg:text-6xl sm:text-4xl text-3xl", // Font sizes
        "[&_rt]:text-[max(0.35em,1.125rem)]", // Ruby text styles
      )}
      // Add group/page for conditional countdown styles based on parent state
      data-done={
        lineIdx !== null && page && lineIdx >= page.lines.length
          ? "true"
          : undefined
      }
      data-pending={lineIdx === null ? "true" : undefined}
      data-active={lineIdx !== null ? "true" : undefined}
    >
      {node}
      <LyricsScreen
        thisPage={page}
        nextPage={nextPage}
        showNext={showNext}
        lineIdx={lineIdx}
        lyrics={lyrics}
        furigana={karaokeFurigana}
        activeRef={activeRef}
        containerWidth={containerWidth}
      />
      <div
        id="measure-layer"
        className="absolute inset-0 size-full opacity-0 -z-10 pointer-events-none"
      />
    </div>
  );
}
