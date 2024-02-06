import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import type {
  PlayerLyricsKeyframe,
  PlayerLyricsState,
} from "../../../frontendUtils/hooks";
import { usePlayerLyricsState } from "../../../frontendUtils/hooks";
import { Box, styled } from "@mui/material";
import _ from "lodash";
import { gql, useQuery } from "@apollo/client";
import clsx from "clsx";
import type { MutableRefObject, RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import type { MeasuredComponentProps } from "react-measure";
import Measure from "react-measure";
import measureElement, {
  measureTextWidths,
} from "../../../frontendUtils/measure";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import gsap from "gsap";
import type { DocumentNode } from "graphql";

type Timeline = gsap.core.Timeline;
const COUNTDOWN_DURATION = 3;

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!, $furigana: [[FuriganaLabel!]!]! = []) {
    transliterate(text: $text, furigana: $furigana) {
      text
      karaoke
    }
  }
` as DocumentNode;

interface SequenceQueryResult {
  transliterate: {
    text: string;
    karaoke: [string, string][][];
  };
}

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
      : duration - v.position
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
export type KaraokeJaFrameCallback = (
  page: number,
  line: number,
  lyrics: LyricsKitLyrics,
  player: HTMLAudioElement,
  lineStart: number | null,
  lineEnd: number | null
) => void;

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
  pages: KaraokePage[]
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
  activeRef?: RefObject<HTMLSpanElement>;
  className?: string;
}

function Countdown({ activeRef, className }: CountdownProps) {
  const content = "●●●●●";
  return (
    <div className={clsx("countdown", className)}>
      <span className="before">{content}</span>
      <span className="after" ref={activeRef}>
        <span>{content}</span>
      </span>
    </div>
  );
}

interface LyricsLineProps {
  textLine: string;
  furiganaLine?: [string, string][];
  done?: boolean;
  activeRef?: MutableRefObject<HTMLSpanElement>;
}

function LyricsLine({
  textLine,
  furiganaLine,
  done,
  activeRef,
}: LyricsLineProps) {
  const thisRef = useRef<HTMLSpanElement>();
  const elm = thisRef.current;
  if (elm && (activeRef === null || done)) {
    elm.style.clipPath = "inset(-50% 102% -10% -2%)";
  }

  const content =
    furiganaLine !== null ? (
      <FuriganaLyricsLine transliterationLine={furiganaLine} />
    ) : (
      <span>{textLine}</span>
    );
  return (
    <Box
      sx={{
        position: "relative",
        fontWeight: 800,
        fontFamily:
          'var(--font-source-han-serif), "Source Han Serif", "Noto Serif CJK", "Noto Serif JP", serif',
        whiteSpace: "nowrap",
        "& span.after": {
          color: "primary.dark",
          clipPath: "inset(-50% 102% 0 -2%)",
          "& > span": {
            filter: "url(#nicokaraAfter)",
          },
        },
        "&.done span.after": {
          clipPath: "none !important",
        },
        "&.pending span.after": {
          clipPath: "inset(-50% 102% -10% -2%) !important",
        },
        "&.active span.after": {
          clipPath: "inset(-50% 102% -10% -2%)",
        },
        "& span.before": {
          position: "absolute",
          top: 0,
          left: 0,
          color: "#fff",
          filter: "url(#nicokaraBefore)",
        },
      }}
      className={clsx(
        done && "done",
        !done && !activeRef && "pending",
        activeRef && "active"
      )}
    >
      <span className="before">{content}</span>
      <span
        className="after"
        ref={(elm) => {
          thisRef.current = elm;
          if (activeRef) activeRef.current = elm;
        }}
      >
        <span>{content}</span>
      </span>
    </Box>
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
  furigana: [string, string][][] | null,
  containerWidth: number
) {
  const lineWidths = lines.map(
    (v) =>
      measureElement(
        LyricsLineHTML({
          textLine: lyrics.lines[v].content,
          furiganaLine: furigana && furigana[v],
        })
      ).width
  );

  const classes: string[] = lines.map(
    (v, idx) => `line-${lines.length}-${idx + 1}`
  );

  const result: (PageClassInfo | null)[] = [];
  lines.forEach((v, idx) => {
    result.push({
      index: v,
      className: classes[idx],
      left: null,
      right: null,
    });
  });
  const lineOverlap = containerWidth * LINE_OVERLAP_FACTOR;
  const stretchedWidth =
    _.sum(lineWidths) - lineOverlap * (lineWidths.length - 1);
  const padding = (containerWidth - stretchedWidth) / 2;
  if (result.length === 1) {
    result[0].left = 1;
    result[0].right = 1;
  } else {
    if (stretchedWidth < containerWidth) {
      let i = 0,
        left = padding;
      while (i < result.length) {
        result[i].left = left;
        result[i].right = containerWidth - lineWidths[i] - left;
        left += lineWidths[i] - lineOverlap;
        i++;
      }
    } else {
      for (let i = 0; i < result.length; i++) {
        if (i === 0) result[i].right = 1;
        else if (i === result.length - 1) result[i].left = 1;
        else {
          result[i].left = i;
          result[i].right = result.length - i - 1;
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
  lineIdx: number;
  containerWidth: number;
  lyrics: LyricsKitLyrics;
  furigana?: [string, string][][];
  activeRef?: RefObject<HTMLSpanElement>;
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
  showNext =
    showNext &&
    nextPage &&
    !nextPage.countdown &&
    nextPage.start - thisPage.end < 1;

  if (thisPage !== null) {
    const thisPageWithClass = buildPageClasses(
      thisPage.lines,
      lyrics,
      furigana,
      containerWidth
    );
    if (showNext) {
      const nextPageLines = buildPageClasses(
        nextPage.lines,
        lyrics,
        furigana,
        containerWidth
      );
      linesToShow = linesToShow.concat(
        nextPageLines.slice(0, nextPageLines.length - 1)
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
    if (thisPage.lines.length === 1) {
      offsetLineIdx--;
    }
  }

  const countdown =
    thisPage && thisPage.countdown && lineIdx === -1 ? (
      <Countdown activeRef={activeRef} />
    ) : null;
  const firstNotNull = linesToShow.reduce<number | null>(
    (prev, curr, idx) => (prev === null && curr !== null ? idx : prev),
    null
  );

  return (
    <>
      <div className={clsx("row", "row-4")}>
        {linesToShow[0] !== null && (
          <>
            {linesToShow[0].left !== null && (
              <div style={{ flexGrow: linesToShow[0].left }} />
            )}
            {firstNotNull === 0 && countdown}
            <LyricsLine
              textLine={lyrics.lines[linesToShow[0].index].content}
              furiganaLine={furigana && furigana[linesToShow[0].index]}
              done={!showNext && offsetLineIdx > 0}
              activeRef={offsetLineIdx === 0 ? activeRef : null}
            />
            {linesToShow[0].right !== null && (
              <div style={{ flexGrow: linesToShow[0].right }} />
            )}
          </>
        )}
      </div>
      <div className={clsx("row", "row-3")}>
        {linesToShow[1] !== null && (
          <>
            {linesToShow[1].left !== null && (
              <div style={{ flexGrow: linesToShow[1].left }} />
            )}
            {firstNotNull === 1 && countdown}
            <LyricsLine
              textLine={lyrics.lines[linesToShow[1].index].content}
              furiganaLine={furigana && furigana[linesToShow[1].index]}
              done={!showNext && offsetLineIdx > 1}
              activeRef={offsetLineIdx === 1 ? activeRef : null}
            />
            {linesToShow[1].right !== null && (
              <div style={{ flexGrow: linesToShow[1].right }} />
            )}
          </>
        )}
      </div>
      <div className={clsx("row", "row-2")}>
        {linesToShow[2] !== null && (
          <>
            {linesToShow[2].left !== null && (
              <div style={{ flexGrow: linesToShow[2].left }} />
            )}
            {firstNotNull === 2 && countdown}
            <LyricsLine
              textLine={lyrics.lines[linesToShow[2].index].content}
              furiganaLine={furigana && furigana[linesToShow[2].index]}
              done={!showNext && offsetLineIdx > 2}
              activeRef={offsetLineIdx === 2 ? activeRef : null}
            />
            {linesToShow[2].right !== null && (
              <div style={{ flexGrow: linesToShow[2].right }} />
            )}
          </>
        )}
      </div>
      <div className={clsx("row", "row-1")}>
        {linesToShow[3] !== null && (
          <>
            {linesToShow[3].left !== null && (
              <div style={{ flexGrow: linesToShow[3].left }} />
            )}
            {firstNotNull === 3 && countdown}
            <LyricsLine
              textLine={lyrics.lines[linesToShow[3].index].content}
              furiganaLine={furigana && furigana[linesToShow[3].index]}
              done={offsetLineIdx > 3}
              activeRef={offsetLineIdx === 3 ? activeRef : null}
            />
            {linesToShow[3].right !== null && (
              <div style={{ flexGrow: linesToShow[3].right }} />
            )}
          </>
        )}
      </div>
    </>
  );
}

const MeasureLayer = styled("div")({
  display: "inline-block",
  position: "absolute",
  visibility: "hidden",
  zIndex: -1,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
});

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function KaraokeJaLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();

  // Page should only be rebuild if the 2 parameters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pages = useMemo(
    () => buildPages(lyrics, playerRef.current.duration),
    [lyrics, playerRef.current.duration]
  );
  const activeRef = useRef<HTMLSpanElement>();

  const { currentFrame, playerState } = useNicokaraLyricsState(
    lyrics,
    playerRef,
    pages
  );
  const pageIdx = currentFrame?.data.pageIdx ?? null;
  const lineIdx = currentFrame?.data.lineIdx ?? null;
  const showNext = currentFrame?.data.showNext ?? null;
  const [currentLine, currentLineStart, currentLineEnd, nextLineStart] =
    useMemo(():
      | [LyricsKitLyricsLine | null, number, number, number]
      | [null, null, null, null] => {
      if (pageIdx === null) return [null, null, null, null] as const;
      const page = pages[pageIdx];
      if (lineIdx > page.lines.length) return [null, null, null, null] as const;
      if (currentFrame !== null && lineIdx === null) {
        return [
          null,
          currentFrame?.start,
          lyrics.lines[page.lines[0]].position,
          lyrics.lines[page.lines[0]].position,
        ];
      }

      // Countdown pages starts COUNTDOWN_DURATION seconds earlier than first line.
      if (lineIdx < 0)
        return [null, currentFrame.start, page.start, page.start];
      const line = lyrics.lines[page.lines[lineIdx]];
      if (!line) return [null, null, null, null];
      const start = line.position;
      const end =
        lineIdx + 1 === page.lines.length
          ? page.end
          : lyrics.lines[page.lines[lineIdx + 1]].position;
      const nextStart = lyrics.lines[page.lines[lineIdx + 1]].position;
      return [line, start, end, nextStart] as const;
    }, [pageIdx, pages, lineIdx, currentFrame, lyrics.lines]);
  const currentLineStartRef = useRef<number | null>();
  currentLineStartRef.current = currentLineStart;

  const sequenceQuery = useQuery<SequenceQueryResult>(SEQUENCE_QUERY, {
    variables: {
      text: lyrics.lines.map((v) => v.content).join("\n"),
      furigana: lyrics.lines.map(
        (v) =>
          v.attachments?.furigana?.map(
            ({ content, leftIndex, rightIndex }) => ({
              content,
              leftIndex,
              rightIndex,
            })
          ) ?? []
      ),
    },
  });

  const timelineRef = useRef<Timeline>();
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
        paused: playerState.state === "paused",
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
            0
          );
          tags.forEach((v, idx) => {
            const duration =
              idx > 0 ? v.timeTag - tags[idx - 1].timeTag : v.timeTag;
            let start = idx > 0 ? tags[idx - 1].timeTag : 0;
            if (start === 0 && v.index !== 0) start = 0.0001;
            let percentage = -2;
            if (v.index > 0) percentage = percentages[v.index - 1];
            tl.to(
              activeSpan,
              {
                clipPath: `inset(-50% ${percentage}% -10% -2%)`,
                ease: "none",
                duration,
              },
              start
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
              currentLineEnd
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
              0
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
              0
            );
          }
        }
      }
      timelineRef.current = tl;
    }

    // Controls the progress of timeline
    const now = performance.now();
    const timeline = timelineRef.current;
    if (timeline) {
      const start = currentLineStartRef.current || 0;
      if (playerState.state === "playing") {
        const inlineProgress = (now - playerState.startingAt) / 1000 - start;
        timeline.play(inlineProgress);
      } else {
        const inlineProgress = playerState.progress - start;
        timeline.pause(inlineProgress);
      }
    }
  }, [
    playerState,
    pageIdx,
    lineIdx,
    currentLineEnd,
    currentLineStart,
    currentLine,
  ]);

  let node = <span>...</span>;
  if (sequenceQuery.error)
    node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else {
    node = null;
  }

  return (
    <Measure bounds>
      {({ contentRect, measureRef }: MeasuredComponentProps) => (
        <Box
          sx={{
            padding: 4,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            fontSize: {
              lg: "3.5rem",
              sm: "2.5rem",
              xs: "2rem",
            },
            "& .row": {
              height: "9rem",
              display: "flex",
              flexDirection: "row",
              position: "relative",
              alignItems: "flex-end",
            },
            "& .countdown": {
              position: "relative",
              width: "0",
              fontSize: "max(0.5em, 1.5rem)",
              letterSpacing: "0.1em",
              transform: "translateY(-3.75em)",
            },
            "& .countdown > span.after": {
              color: "primary.dark",
              clipPath: "inset(-50% 102% 0 -2%)",
              "& > span": {
                filter: "url(#nicokaraAfter)",
              },
            },
            "&.done .countdown > span.after": {
              clipPath: "none !important",
            },
            "&.pending .countdown > span.after": {
              clipPath: "inset(-50% 102% -10% -2%) !important",
            },
            "&.active .countdown > span.after": {
              clipPath: "inset(-50% 102% -10% -2%)",
            },
            "& .countdown > span.before": {
              position: "absolute",
              top: 0,
              left: 0,
              color: "#fff",
              filter: "url(#nicokaraBefore)",
            },
            "& rt": {
              fontSize: "max(0.35em, 1.125rem)",
            },
            "@supports (-moz-appearance: none)": {
              "& rt": {
                marginBottom: "-0.5em",
              },
            },
          }}
          lang="ja"
          ref={measureRef}
        >
          {node}
          <LyricsScreen
            thisPage={pages[pageIdx] ?? null}
            nextPage={pages[pageIdx + 1] ?? null}
            showNext={showNext}
            lineIdx={lineIdx}
            lyrics={lyrics}
            furigana={sequenceQuery.data?.transliterate.karaoke ?? null}
            activeRef={activeRef}
            containerWidth={contentRect.bounds.width}
          />
          <MeasureLayer id="measure-layer" />
        </Box>
      )}
    </Measure>
  );
}
