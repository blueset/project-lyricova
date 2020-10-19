import { LyricsKitLyrics } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { makeStyles } from "@material-ui/core";
import { useRef } from "react";
import { usePlayerLyricsTypingState } from "../../../frontendUtils/hooks";

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    line: {
      fontSize: "4em",
      fontWeight: 600,
    },
    typing: {
      backgroundColor: theme.palette.primary.light + "80",
    },
    cursor: {
      backgroundColor: "white",
      display: "inline-block",
      width: "2px",
      height: "1.2em",
      verticalAlign: "text-top",
      animation: "$blink 0.5s infinite alternate",
    },
    "@keyframes blink": {
      from: { background: "#fff0", },
      to: { background: "#ffff", },
    }
  };
});

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function TypingFocusedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLSpanElement>();
  const typingRef = useRef<HTMLSpanElement>();

  const { sequenceQuery } = usePlayerLyricsTypingState(lyrics, playerRef, 0.75, doneRef, typingRef);

  const styles = useStyle();

  let node = <span>{lyrics.lines.length} lines, starting at {lyrics.lines[0].position} second.</span>;
  if (sequenceQuery.loading) node = <span>loading</span>;
  else if (sequenceQuery.error) node = <span>Error: {JSON.stringify(sequenceQuery.error)}</span>;
  else if (sequenceQuery.data) {
    node = <div className={styles.line}>
      <span ref={doneRef}/><span ref={typingRef} className={styles.typing}/>
    </div>;
  }

  return (
    <div className={styles.container}>
      {node}
    </div>
  );
}