import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { useRef, useEffect } from "react";
import clsx from "clsx";
import BalanceText from "react-balance-text-cj";

const ANIMATION_THRESHOLD = 0.25;

interface Props {
  lyrics: LyricsKitLyrics;
}

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      overflow: "hidden",
      textAlign: "justify",
      maskBorderImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBorderImageSlice: "49% 0 fill",
      maskBorderImageWidth: "40% 0",
      maskBoxImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBoxImageSlice: "49% 0 fill",
      maskBoxImageWidth: "40% 0",
    },
    line: {
      fontWeight: 400,
      fontSize: "2.5em",
      opacity: 0.5,
      marginBottom: theme.spacing(1),
      "&.active": {
        opacity: 1,
        fontWeight: 500,
      },
    },
    filler: {
      height: "50%",
    },
  };
});

export function ParagraphLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);
  const styles = useStyle();
  const container = useRef<HTMLDivElement>();
  const currentLine = useRef<HTMLSpanElement>();

  useEffect(() => {
    const cont = container.current, curLine = currentLine.current;
    const lines = lyrics.lines;
    const animate = lines && line !== null &&
      ((line + 1 > lines.length) || (!lines[line + 1]) ||
        (lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD));
    if (cont && curLine) {
      cont.scrollTo({
        top: curLine.offsetTop - cont.offsetHeight / 2 + curLine.offsetHeight / 2,
        behavior: animate ? "smooth" : "auto",
      });
    }
  }, [container, currentLine, line]);

  return <div className={styles.container} ref={container}>
    <div className={styles.filler} />
    {lyrics.lines.map((v, idx) => {
      const offset = line !== null ? Math.abs(line - idx) : idx;
      return (
        <>
          {idx !== 0 && <span className={styles.line} style={{ filter: `blur(${offset * 0.1}px)` }}> ・ </span>}
          <span
            key={idx}
            lang="ja"
            className={clsx(styles.line, idx === line && "active")} ref={idx === line ? currentLine : null}
            style={{ filter: `blur(${offset * 0.1}px)` }}
          >
            {v.content || "＊"}
          </span>
        </>
      );
    })}
    <div className={styles.filler} />
  </div>;
}