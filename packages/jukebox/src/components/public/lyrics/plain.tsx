import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { useRef, useEffect } from "react";
import clsx from "clsx";
import BalanceText from "react-balance-text-cj";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";

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
      overflow: "scroll",
      maskBorderImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBorderImageSlice: "49% 0 fill",
      maskBorderImageWidth: "100px 0",
      maskBoxImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBoxImageSlice: "49% 0 fill",
      maskBoxImageWidth: "100px 0",
    },
    line: {
      fontWeight: 400,
      opacity: 0.7,
      minHeight: "1.2em",
      fontSize: "1.5em",
      textAlign: "center",
      marginBottom: theme.spacing(1),
      "&.active": {
        opacity: 1,
        fontWeight: 600,
      },
      "& .translation": {
        fontSize: "0.8em",
      },
    },
    filler: {
      height: "50%",
    },
  };
});

export function PlainLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);
  const styles = useStyle();
  const currentLine = useRef<HTMLDivElement>();

  useEffect(() => {
    const curLine = currentLine.current;
    const lines = lyrics.lines;
    const animate = lines && line !== null &&
      ((line + 1 > lines.length) || (!lines[line + 1]) ||
        (lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD));
    if (curLine) {
      curLine.scrollIntoView({ block: "center", behavior: animate ? "smooth" : "auto" });
    }
  }, [currentLine, line, lyrics.lines]);

  return <div className={styles.container}>
    <div className={styles.filler} />
    {lyrics.lines.map((v, idx) => {
      return (
        <div key={idx} className={clsx(styles.line, idx === line && "active")} ref={idx === line ? currentLine : null}>
          <BalanceText resize={true}><FuriganaLyricsLine graphQLSourceLine={v} /></BalanceText>
          {v.attachments.translation && (
            <div className="translation"><BalanceText resize={true}>{v.attachments.translation}</BalanceText></div>
          )}
        </div>
      );
    })}
    <div className={styles.filler} />
  </div>;
}