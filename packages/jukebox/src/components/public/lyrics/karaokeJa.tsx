import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState, useNamedState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import _ from "lodash";
import { gql, useQuery } from "@apollo/client";
import clsx from "clsx";
import { useMemo, RefObject, useRef, useCallback, useEffect } from "react";

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
      fontWeight: 800,
      fontSize: "3.5em",
      fontFamily: "serif",
      "& rt": {
        transform: "translateY(0.5em)",
      },
      "& .row": {
        height: "2.25em",
        display: "flex",
        flexDirection: "row",
        whiteSpace: "pre",
        position: "relative",
        alignItems: "flex-end",
      },
      "& .line-1-1:before, & .line-3-2:before, & .line-1-1:after, & .line-3-2:after": { content: "\"\"", flexGrow: 1 },
      "& .line-4-2:before, & .line-4-3:after": { content: "\"\"", flexGrow: 1 },
      "& .line-4-2:after, & .line-4-3:before": { content: "\"\"", flexGrow: 2 },
      "& .line-2-2:before, & .line-3-3:before, & .line-4-4:before": { content: "\"\"", flexGrow: 1 },
      "& .line": {
        position: "relative",
      },
      "& .line > span.after": {
        color: theme.palette.primary.dark,
        filter: "url(#nicokaraAfter)",
        clipPath: "inset(-30% 102% 0 -2%)",
        // clip-path: inset(-30% [39%]<<< -2% - 102% reversed >>> 0 -2%);
      },
      "& .line.done > span.after": {
        color: theme.palette.primary.dark,
        filter: "url(#nicokaraAfter)",
        clipPath: ["none", "!important"],
      },
      "& .line.pending > span.after": {
        clipPath: ["inset(-30% 102% -10% -2%)", "!important"],
      },
      "& .line > span.before": {
        position: "absolute",
        top: 0,
        left: 0,
        color: "#fff",
        filter: "url(#nicokaraBefore)",
      },
      "& .countdown": {
        position: "absolute",
        top: "-1em",
        fontSize: "1.5rem",
        letterSpacing: "0.1em",
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
      const start = pages[thisPage]?.start ?? null;
      const end = pages[thisPage + 1]?.start ?? pages[thisPage]?.end ?? null;
      let thisShowNext = showNextRef.current;

      // If not on the same page...
      if (start > time || time >= end) {
        // Locate new page...
        const thisPageIndex = _.sortedIndexBy<{ start: number }>(pages, { start: time }, "start");
        if (thisPageIndex === 0) {
          if (pageRef.current !== null) setPage(null);
          if (lineRef.current !== null) setLine(null);
          thisPage = null; thisLine = null;
        } else {
          thisPage = thisPageIndex;
          if (thisPage >= pages.length || pages[thisPage].start > time) thisPage--;
          if (thisPage != pageRef.current) {
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
}

function Countdown({ activeRef }: CountdownProps) {
  const content = "●●●●●";
  return <div className="countdown line">
    <span className="before">{content}</span>
    <span className="after" ref={activeRef} style={activeRef ? undefined : {}}>{content}</span>
  </div>;
}

interface LyricsLineProps {
  textLine: string;
  furiganaLine?: [string, string][];
  done?: boolean;
  activeRef?: RefObject<HTMLSpanElement>;
}

function LyricsLine({ textLine, furiganaLine, done, activeRef }: LyricsLineProps) {
  const content = furiganaLine ?
    furiganaLine.map(([text, ruby], k) => {
      if (text === ruby) {
        return <span key={k}>{text}</span>;
      } else {
        return <ruby key={k}>
          {text}<rp>(</rp><rt>{ruby}</rt><rp>)</rp>
        </ruby>;
      }
    }) :
    <span>{textLine}</span>;
  return <div className={clsx("line", done && "done", !done && !activeRef && "pending")}>
    <span className="before">{content}</span>
    <span className="after" ref={activeRef} style={activeRef ? undefined : {}}>{content}</span>
  </div>;
}

function buildPageClasses(lines: number[]) {
  const result: ([number, string] | null)[] = lines.map((v, idx) => [v, `line-${lines.length}-${idx + 1}`]);
  if (result.length === 1) result.push(null);
  return result;
}

interface LyricsScreenProps {
  thisPage: KaraokePage | null;
  nextPage: KaraokePage | null;
  showNext: boolean;
  lineIdx: number;
  lyrics: LyricsKitLyrics;
  furigana?: [string, string][][];
  activeRef?: RefObject<HTMLSpanElement>;
}

function LyricsScreen({ thisPage, nextPage, showNext, lineIdx, lyrics, furigana, activeRef }: LyricsScreenProps) {
  let linesToShow: ([number, string] | null)[] = [null, null, null, null];
  let offsetLineIdx = lineIdx;
  showNext = showNext && nextPage && !nextPage.countdown && (nextPage.start - thisPage.end < 1);

  if (thisPage !== null) {
    const thisPageWithClass = buildPageClasses(thisPage.lines);
    if (showNext) {
      const nextPageLines = buildPageClasses(nextPage.lines);
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

  const countdown = (thisPage && thisPage.countdown && lineIdx === -1) ? <Countdown activeRef={activeRef} /> : null;
  const firstNotNull = linesToShow.reduce<number | null>((prev, curr, idx) => prev === null && curr !== null ? idx : prev, null);

  return <>
    <div className={clsx("row", "row-4", linesToShow[0] && linesToShow[0][1])}>{
      linesToShow[0] !== null && <>
        {firstNotNull === 0 && countdown}
        <LyricsLine
          textLine={lyrics.lines[linesToShow[0][0]].content}
          furiganaLine={furigana && furigana[linesToShow[0][0]]}
          done={!showNext && (offsetLineIdx > 0 || offsetLineIdx === null)}
          activeRef={offsetLineIdx === 0 ? activeRef : null} />
      </>
    }</div>
    <div className={clsx("row", "row-3", linesToShow[1] && linesToShow[1][1])}>{
      linesToShow[1] !== null && <>
        {firstNotNull === 1 && countdown}
        <LyricsLine
          textLine={lyrics.lines[linesToShow[1][0]].content}
          furiganaLine={furigana && furigana[linesToShow[1][0]]}
          done={!showNext && (offsetLineIdx > 1 || offsetLineIdx === null)}
          activeRef={offsetLineIdx === 1 ? activeRef : null} />
      </>
    }</div>
    <div className={clsx("row", "row-2", linesToShow[2] && linesToShow[2][1])}>{
      linesToShow[2] !== null && <>
        {firstNotNull === 2 && countdown}
        <LyricsLine
          textLine={lyrics.lines[linesToShow[2][0]].content}
          furiganaLine={furigana && furigana[linesToShow[2][0]]}
          done={!showNext && (offsetLineIdx > 2 || offsetLineIdx === null)}
          activeRef={offsetLineIdx === 2 ? activeRef : null} />
      </>
    }</div>
    <div className={clsx("row", "row-1", linesToShow[3] && linesToShow[3][1])}>{
      linesToShow[3] !== null && <>
        {firstNotNull === 3 && countdown}
        <LyricsLine
          textLine={lyrics.lines[linesToShow[3][0]].content}
          furiganaLine={furigana && furigana[linesToShow[3][0]]}
          done={offsetLineIdx > 3 || offsetLineIdx === null}
          activeRef={offsetLineIdx === 3 ? activeRef : null} />
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
        activeSpan.style.clipPath = `inset(-30% ${scaledPercentage}% -10% -2%)`;
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
    <div className={styles.container} lang="ja">
      {node}
      <LyricsScreen
        thisPage={pages[pageIdx] ?? null} nextPage={pages[pageIdx + 1] ?? null}
        showNext={showNext} lineIdx={lineIdx} lyrics={lyrics}
        furigana={sequenceQuery.data?.transliterate.karaoke ?? null}
        activeRef={activeRef}
      />
    </div>
  );
}