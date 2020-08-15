import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { Box, makeStyles, Theme } from "@material-ui/core";
import { blendStyleProperties, BlendStyleParams } from "../../../frontendUtils/blendStyle";
import { motion, AnimateSharedLayout, AnimatePresence } from "framer-motion";

const useStyle = makeStyles<Theme, BlendStyleParams>((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    currentLine: {
      fontSize: "4.5em",
      fontWeight: 600,
      marginBottom: theme.spacing(6),
      lineHeight: 1.2,
      transition: "font-size 0.05s ease-in-out",
      ...blendStyleProperties(),
      "& > small": {
        display: "block",
        fontSize: "0.6em",
      }
    },
    nextLine: {
      fontSize: "2.5em",
      fontWeight: 600,
      color: "rgba(255, 255, 255, 0.3)",
      lineHeight: 1.2,
      transition: "font-size 0.05s ease-in-out",
      ...blendStyleProperties({ filterName: "#sharpBlurBright" }),
      "& > small": {
        display: "block",
        fontSize: "0.8em",
      }
    }
  };
});

interface Props {
  lyrics: LyricsKitLyrics;
}


interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
}

function LyricsLineElement({ className, line }: LyricsLineElementProps) {
  if (!line) return null;
  return (
    <AnimatePresence>
      <motion.div layout className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease: "easeInOut" }} exit={{ opacity: 0 }} lang="ja">
        {line.content}
        {line.attachments?.translation && (
          <small lang="zh">{line.attachments.translation}</small>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function StaticLyrics({ lyrics }: Props) {
  const { playerRef, playlist } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const styles = useStyle({ coverUrl: playlist.getCurrentCoverUrl() });

  const lines = lyrics.lines;


  return (
    <AnimateSharedLayout>
      <motion.div layout className={styles.container}>
        {line !== null && lines.map((l, idx) => {
          if (idx < line || idx > line + 1) return null;
          return <LyricsLineElement className={idx === line ? styles.currentLine : styles.nextLine} line={l} key={idx} />;
        })}
      </motion.div>
    </AnimateSharedLayout>
  );
}