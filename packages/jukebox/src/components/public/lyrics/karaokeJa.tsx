import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useNamedState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import _ from "lodash";
import { gql, useQuery } from "@apollo/client";
import clsx from "clsx";
import { useMemo, RefObject, useRef, useCallback, useEffect } from "react";
import Measure from "react-measure";
import measureElement from "../../../frontendUtils/measure";

const SEQUENCE_QUERY = gql`
  query TypingSequence($text: String!) {
    transliterate(text: $text) {
      text
      karaoke
    }
  }
`;

interface SequenceQueryResult {
  transliterate: {
    text: string;
    karaoke: [string, string][][];
  };
}

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      "& .row": {
        height: "9rem",
        display: "flex",
        flexDirection: "row",
        position: "relative",
        alignItems: "flex-end",
      },
      // "& .line-1-1:before, & .line-3-2:before, & .line-1-1:after, & .line-3-2:after": { content: "\"\"", flexGrow: 1 },
      // "& .line-4-2:before, & .line-4-3:after": { content: "\"\"", flexGrow: 1 },
      // "& .line-4-2:after, & .line-4-3:before": { content: "\"\"", flexGrow: 2 },
      // "& .line-2-2:before, & .line-3-3:before, & .line-4-4:before": { content: "\"\"", flexGrow: 1 },
      "& .countdown": {
        position: "absolute",
        top: "-1em",
        fontSize: "1.5rem",
        letterSpacing: "0.1em",
      },
    },
    measureLayer: {
      display: "inline-block",
      position: "absolute",
      visibility: "hidden",
      zIndex: -1,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    line: {
      position: "relative",
      fontWeight: 800,
      fontSize: "3.5rem",
      fontFamily: "serif",
      whiteSpace: "pre",
      "& rt": {
        transform: "translateY(0.5em)",
      },
      "& > span.after": {
        color: theme.palette.primary.dark,
        filter: "url(#nicokaraAfter)",
        clipPath: "inset(-30% 102% 0 -2%)",
      },
      "&.done > span.after": {
        color: theme.palette.primary.dark,
        filter: "url(#nicokaraAfter)",
        clipPath: ["none", "!important"],
      },
      "&.pending > span.after": {
        clipPath: ["inset(-30% 102% -10% -2%)", "!important"],
      },
      "& > span.before": {
        position: "absolute",
        top: 0,
        left: 0,
        color: "#fff",
        filter: "url(#nicokaraBefore)",
      },
    },
  };
});

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
  let total = 0, belowThreshold = 0;
  const lines: number[] = [];

  while (i < secPerChar.length && total < 4) {
    total++; belowThreshold += (secPerChar[i] < FOUR_LINE_PAGE_SEC_PER_CHAR_THRESHOLD) ? 1 : 0;
    lines.push(i);
    i++;
    if (total === 2 && belowThreshold === 0) return lines;

    // Skip dismissible dividers
    while (i < secPerChar.length && secPerChar[i] === 0 && lineLengths[i] < 1) i++;

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
    idx + 1 !== arr.length ?
      arr[idx + 1].position - v.position :
      duration - v.position
  );
  const secPerChar = lyrics.lines.map((v, idx) => {
    const t = v.content.trim().length;
    return t === 0 ? 0 : lineLengths[idx] / t;
  });

  const pages: KaraokePage[] = [];

  let i = 0, countdown = true;

  // Skip all empty lines;
  while (i < secPerChar.length && secPerChar[i] === 0) i++;

  while (i < lyrics.lines.length) {
    if (secPerChar[i] > 0) {
      const lines = lookAhead(i, lineLengths, secPerChar);
      if (lines.length < 1) {
        i++;
        continue;
      }
      const start = lyrics.lines[lines[0]].position;
      const end =
        lines[lines.length - 1] + 1 < lyrics.lines.length ?
          lyrics.lines[lines[lines.length - 1] + 1].position :
          duration;
      pages.push({
        countdown,
        lines,
        start: countdown ? start - 3 : start,
        end
      });
      i = lines[lines.length - 1] + 1;
      countdown = false;
    } else {
      if (lineLengths[i] > 5) {
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
export type KaraokeJaFrameCallback = (page: number, line: number, lyrics: LyricsKitLyrics, player: HTMLAudioElement, lineStart: number | null, lineEnd: number | null) => void;
interface KaraokeJaState {
  pageIdx: number;
  lineIdx: number;
  showNext: boolean
}

function getLineStartEnd(thisLine: number, page: KaraokePage, lyrics: LyricsKitLyrics): [number | null, number | null] {
  if (thisLine === null) {
    return [null, null];
  } else if (thisLine < 0) {
    return [
      page.start,
      page.lines.length > 0 ? lyrics.lines[page.lines[0]].position : page.end
    ];
  } else {
    return [
      lyrics.lines[page.lines[thisLine]].position,
      thisLine + 1 < page.lines.length ?
        lyrics.lines[page.lines[thisLine + 1]].position : page.end
    ];
  }
}

function useKaraokeJaLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics, pages: KaraokePage[], callback?: KaraokeJaFrameCallback): KaraokeJaState {
  const [pageIdx, setPage] = useNamedState<number | null>(null, "page");
  const [lineIdx, setLine] = useNamedState<number | null>(null, "line");
  const [showNext, setShowNext] = useNamedState(false, "showNext");
  const pageRef = useRef<number>();
  pageRef.current = pageIdx;
  const lineRef = useRef<number>();
  lineRef.current = lineIdx;
  const showNextRef = useRef<boolean>();
  showNextRef.current = showNext;

  const onTimeUpdate = useCallback((recur: boolean = true) => {
    const player = playerRef.current;
    if (player !== null) {
      const time = player.currentTime;
      let thisPage = pageRef.current, thisLine = lineRef.current;
      const start = pages[thisPage]?.start ?? 0;
      const end = thisPage !== null ?
        (pages[thisPage + 1]?.start != null ? (pages[thisPage + 1]?.start + pages[thisPage]?.end) / 2 : pages[thisPage]?.end) :
        (pages.length > 0 ? pages[0].start : player.duration);
      let thisShowNext = showNextRef.current;

      // If not on the same page...
      if (start > time || time >= end) {
        // Locate new page...
        const thisPageIndex = _.sortedIndexBy<{ start: number }>(pages, { start: time }, "start");
        if (thisPageIndex === 0 && pages[0].start > time) {
          if (pageRef.current !== null) setPage(null);
          if (lineRef.current !== null) setLine(null);
          thisPage = null; thisLine = null;
        } else {
          thisPage = thisPageIndex;
          if (thisPage >= pages.length ||
            (thisPage > 0 && pages[thisPage - 1].end >= time)
          ) thisPage--;
          if (thisPage !== pageRef.current) {
            setPage(thisPage);
          }
          thisLine = null;
        }
      }

      let lineStart: number | null = null, lineEnd: number | null = null;
      // If page is not null...
      if (thisPage !== null) {
        const page = pages[thisPage];

        // Get current line timing;
        [lineStart, lineEnd] = getLineStartEnd(thisLine, page, lyrics);

        // If not on the same line...
        if (lineStart > time || time >= lineEnd) {
          // Find new line.
          if (time > page.end) {
            thisLine = page.lines.length - 1;
          } else {
            thisLine = 0;
            while (thisLine < page.lines.length && lyrics.lines[page.lines[thisLine]].position < time) thisLine++;
            thisLine--;
          }
          if (lineRef.current !== thisLine) {
            setLine(thisLine);
          }
          [lineStart, lineEnd] = getLineStartEnd(thisLine, page, lyrics);
        }
      }

      // Update showNext.
      if (
        thisPage !== null && thisLine !== null &&
        thisLine === pages[thisPage].lines.length - 1 &&
        time > (lineStart + (lineEnd - lineStart) / 2)
      ) {
        thisShowNext = true;
      } else {
        thisShowNext = false;
      }
      if (showNextRef.current !== thisShowNext) setShowNext(thisShowNext);

      // run callback.
      if (thisPage !== null && thisLine !== null) {
        callback && callback(thisPage, thisLine, lyrics, player, lineStart, lineEnd);
      } else {
        callback && callback(null, null, lyrics, player, null, null);
      }
      if (recur && !player.paused) {
        window.requestAnimationFrame(() => onTimeUpdate());
      }
    } else {
      setLine(null);
    }
  }, [playerRef, lyrics, pages]);

  const onPlay = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate());
  }, [playerRef]);
  const onTimeChange = useCallback(() => {
    window.requestAnimationFrame(() => onTimeUpdate(/* recur */false));
  }, [playerRef]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      onTimeUpdate();
      player.addEventListener("play", onPlay);
      player.addEventListener("timeupdate", onTimeChange);
      if (!player.paused) {
        onPlay();
      }
      return () => {
        player.removeEventListener("play", onPlay);
        player.removeEventListener("timeupdate", onTimeChange);
      };
    }
  }, [playerRef]);

  return { pageIdx, lineIdx, showNext };
}
//#endregion Lyrics state

interface CountdownProps {
  activeRef?: RefObject<HTMLSpanElement>;
  className?: string;
}

function Countdown({ activeRef, className }: CountdownProps) {
  const content = "●●●●●";
  return <div className={clsx("countdown", className)}>
    <span className="before">{content}</span>
    <span className="after" ref={activeRef} style={activeRef ? undefined : {}}>{content}</span>
  </div>;
}

interface LyricsLineProps {
  className?: string;
  textLine: string;
  furiganaLine?: [string, string][];
  done?: boolean;
  activeRef?: RefObject<HTMLSpanElement>;
}

function LyricsLine({ textLine, furiganaLine, done, activeRef, className }: LyricsLineProps) {
  const content = furiganaLine !== null ?
    furiganaLine.reduce<[string, string][]>((prev, [text, ruby]) => {
      const [_t, textL, textC, textR] = text.match(/^(\s*)(.*?)(\s*)$/u);
      const [_r, rubyL, rubyC, rubyR] = ruby.match(/^(\s*)(.*?)(\s*)$/u);
      if (textL.length > 0 || rubyL.length > 0) {
        if (textL.length === 0) prev.push([rubyL, rubyL]);
        else if (ruby.length === 0) prev.push([textL, textL]);
        else prev.push([textL, rubyL]);
      }
      prev.push([textC, rubyC]);
      if (textR.length > 0 || rubyR.length > 0) {
        if (textR.length === 0) prev.push([rubyR, rubyR]);
        else if (ruby.length === 0) prev.push([textR, textR]);
        else prev.push([textR, rubyR]);
      }
      return prev;
    }, []).map(([text, ruby], k) => {
      if (text === ruby) {
        return <span key={k}>{text}</span>;
      } else {
        return <ruby key={k}>
          {text}<rp>(</rp><rt>{ruby}</rt><rp>)</rp>
        </ruby>;
      }
    }) :
    <span>{textLine}</span>;
  return <div className={clsx(className, done && "done", !done && !activeRef && "pending")}>
    <span className="before">{content}</span>
    <span className="after" ref={activeRef} style={activeRef ? undefined : {}}>{content}</span>
  </div>;
}

function LyricsLineHTML({ textLine, furiganaLine, className }: LyricsLineProps): string {
  const content = furiganaLine ?
    furiganaLine.map(([text, ruby]) => {
      if (text === ruby) {
        return `<span>${text}</span>`;
      } else {
        return `<ruby>${text}<rp>(</rp><rt>${ruby}</rt><rp>)</rp></ruby>`;
      }
    }).join("") :
    `<span>${textLine}</span>`;
  return `<span class="${className}">${content}</span>`;
}

const LINE_OVERLAP_FACTOR = 0.1;

interface PageClassInfo {
  index: number;
  className: string;
  left: number | null;
  right: number | null;
}

function buildPageClasses(lines: number[], lyrics: LyricsKitLyrics, furigana: [string, string][][] | null, containerWidth: number, lineClassName: string) {
  const lineWidths = lines.map(v =>
    measureElement(LyricsLineHTML({
      textLine: lyrics.lines[v].content,
      furiganaLine: furigana && furigana[v],
      className: lineClassName
    })).width
  );
  const classes: string[] = lines.map((v, idx) => `line-${lines.length}-${idx + 1}`);


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
  const stretchedWidth = _.sum(lineWidths) - lineOverlap * (lineWidths.length - 1);
  const padding = (containerWidth - stretchedWidth) / 2;
  if (result.length === 1) {
    result[0].left = 1;
    result[0].right = 1;
  } else {
    if (stretchedWidth < containerWidth) {
      let i = 0, left = padding;
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
  lineClassName?: string;
}

function LyricsScreen({ thisPage, nextPage, showNext, lineIdx, lyrics, furigana, activeRef, containerWidth, lineClassName }: LyricsScreenProps) {
  let linesToShow: (PageClassInfo | null)[] = [null, null, null, null];
  let offsetLineIdx = lineIdx;
  showNext = showNext && nextPage && !nextPage.countdown && (nextPage.start - thisPage.end < 1);

  if (thisPage !== null) {
    const thisPageWithClass = buildPageClasses(thisPage.lines, lyrics, furigana, containerWidth, lineClassName);
    if (showNext) {
      const nextPageLines = buildPageClasses(nextPage.lines, lyrics, furigana, containerWidth, lineClassName);
      linesToShow = linesToShow.concat(nextPageLines.slice(0, nextPageLines.length - 1));
      linesToShow.push(thisPageWithClass[thisPageWithClass.length - 1]);
    } else if (lineIdx !== null) {
      linesToShow = linesToShow.concat(thisPageWithClass);
    }
    linesToShow = linesToShow.slice(linesToShow.length - 4);
    offsetLineIdx = lineIdx < 0 || lineIdx === null ? lineIdx : 4 - thisPage.lines.length + lineIdx;
    if (thisPage.lines.length === 1) {
      offsetLineIdx--;
    }
  }

  const countdown = (thisPage && thisPage.countdown && lineIdx === -1) ? <Countdown activeRef={activeRef} className={lineClassName} /> : null;
  const firstNotNull = linesToShow.reduce<number | null>((prev, curr, idx) => prev === null && curr !== null ? idx : prev, null);

  return <>
    <div className={clsx("row", "row-4")}>{
      linesToShow[0] !== null && <>
        {linesToShow[0].left !== null && <div style={{ flexGrow: linesToShow[0].left, }}></div>}
        {firstNotNull === 0 && countdown}
        <LyricsLine
          className={lineClassName}
          textLine={lyrics.lines[linesToShow[0].index].content}
          furiganaLine={furigana && furigana[linesToShow[0].index]}
          done={!showNext && (offsetLineIdx > 0 || offsetLineIdx === null)}
          activeRef={offsetLineIdx === 0 ? activeRef : null} />
        {linesToShow[0].right !== null && <div style={{ flexGrow: linesToShow[0].right, }}></div>}
      </>
    }</div>
    <div className={clsx("row", "row-3")}>{
      linesToShow[1] !== null && <>
        {linesToShow[1].left !== null && <div style={{ flexGrow: linesToShow[1].left, }}></div>}
        {firstNotNull === 1 && countdown}
        <LyricsLine
          className={lineClassName}
          textLine={lyrics.lines[linesToShow[1].index].content}
          furiganaLine={furigana && furigana[linesToShow[1].index]}
          done={!showNext && (offsetLineIdx > 1 || offsetLineIdx === null)}
          activeRef={offsetLineIdx === 1 ? activeRef : null} />
        {linesToShow[1].right !== null && <div style={{ flexGrow: linesToShow[1].right, }}></div>}
      </>
    }</div>
    <div className={clsx("row", "row-2")}>{
      linesToShow[2] !== null && <>
        {linesToShow[2].left !== null && <div style={{ flexGrow: linesToShow[2].left, }}></div>}
        {firstNotNull === 2 && countdown}
        <LyricsLine
          className={lineClassName}
          textLine={lyrics.lines[linesToShow[2].index].content}
          furiganaLine={furigana && furigana[linesToShow[2].index]}
          done={!showNext && (offsetLineIdx > 2 || offsetLineIdx === null)}
          activeRef={offsetLineIdx === 2 ? activeRef : null} />
        {linesToShow[2].right !== null && <div style={{ flexGrow: linesToShow[2].right, }}></div>}
      </>
    }</div>
    <div className={clsx("row", "row-1")}>{
      linesToShow[3] !== null && <>
        {linesToShow[3].left !== null && <div style={{ flexGrow: linesToShow[3].left, }}></div>}
        {firstNotNull === 3 && countdown}
        <LyricsLine
          className={lineClassName}
          textLine={lyrics.lines[linesToShow[3].index].content}
          furiganaLine={furigana && furigana[linesToShow[3].index]}
          done={offsetLineIdx > 3 || offsetLineIdx === null}
          activeRef={offsetLineIdx === 3 ? activeRef : null} />
        {linesToShow[3].right !== null && <div style={{ flexGrow: linesToShow[3].right, }}></div>}
      </>
    }</div>
  </>;
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function KaraokeJaLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();

  const pages = useMemo(() => buildPages(lyrics, playerRef.current.duration), [lyrics, playerRef.current.duration]);
  const activeRef = useRef<HTMLSpanElement>();

  const progressCallback = useCallback<KaraokeJaFrameCallback>((page, line, lyrics, player, lineStart, lineEnd) => {
    if (activeRef.current) {
      const activeSpan = activeRef.current;
      if (line !== null) {
        const time = player.currentTime;
        const percentage = _.clamp((time - lineStart) / (lineEnd - lineStart), 0, 1);
        const scaledPercentage = (1 - percentage) * 104 - 2;
        if (line < 0) {
          activeSpan.style.clipPath = `inset(-30% -2% -10% ${scaledPercentage}%)`;
        } else {
          activeSpan.style.clipPath = `inset(-30% ${scaledPercentage}% -10% -2%)`;
        }
      }
    }
  }, [activeRef]);

  const { pageIdx, lineIdx, showNext } = useKaraokeJaLyricsState(playerRef, lyrics, pages, progressCallback);
  const styles = useStyle();

  const sequenceQuery = useQuery<SequenceQueryResult>(
    SEQUENCE_QUERY,
    {
      variables: {
        text: lyrics.lines.map((v) => v.content).join("\n")
      },
    }
  );

  let node = <span>...</span>;
  if (sequenceQuery.error) node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else { node = null; }

  return (
    <Measure bounds>{
      ({ contentRect, measureRef }) => <div className={styles.container} lang="ja" ref={measureRef}>
        {node}
        <LyricsScreen
          thisPage={pages[pageIdx] ?? null} nextPage={pages[pageIdx + 1] ?? null}
          showNext={showNext} lineIdx={lineIdx} lyrics={lyrics}
          furigana={sequenceQuery.data?.transliterate.karaoke ?? null}
          activeRef={activeRef}
          containerWidth={contentRect.bounds.width}
          lineClassName={styles.line}
        />
        <div id="measure-layer" className={styles.measureLayer} />
      </div>
    }</Measure>
  );
}