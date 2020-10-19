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
      flexDirection: "column-reverse",
      maskBorderImageSource: "linear-gradient(0deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBorderImageSlice: "49% 0 fill",
      maskBorderImageWidth: "40px 0 0 0",
      maskBoxImageSource: "linear-gradient(0deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBoxImageSlice: "49% 0 fill",
      maskBoxImageWidth: "40px 0 0 0",
    },
    line: {
      fontSize: "3em",
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
    pastLine: {
      fontSize: "2em",
      // fontWeight: 600,
      opacity: 0.7,
      marginBottom: "0.5em",
    },
    "@keyframes blink": {
      from: { background: "#fff0", },
      to: { background: "#ffff", },
    }
  };
});

interface Props {
  lyrics: LyricsKitLyrics;
}

export function TypingStackedLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const doneRef = useRef<HTMLSpanElement>();
  const typingRef = useRef<HTMLSpanElement>();

  const { sequenceQuery, currentFrameId } = usePlayerLyricsTypingState(lyrics, playerRef, 0.75, doneRef, typingRef);

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
      {sequenceQuery.data && sequenceQuery.data.transliterate.typingSequence.map((v, idx) => {
        if (idx >= currentFrameId || idx < currentFrameId - 20) return null;
        return (
          <div className={styles.pastLine} key={idx}>
            {v.map((vv) => vv.sequence.length > 0 ? vv.sequence[vv.sequence.length - 1] : "").join("")}
          </div>
        );
      }).reverse()}
    </div>
  );
}