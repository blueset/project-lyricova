import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { Box, makeStyles, Theme } from "@material-ui/core";
import { BlendStyleParams } from "../../../frontendUtils/blendStyle";
import { motion, Variants, AnimatePresence, Transition } from "framer-motion";

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
    line: {
      fontWeight: 600,
      lineHeight: 1.2,
      textWrap: "balance",
      "& > small": {
        display: "block",
      },
    },
  };
});

type GenericStyle = { [key: string]: string | number };

function setFilterProperties(styles: GenericStyle): GenericStyle {
  styles.backgroundSize = "cover";
  styles.backgroundPosition = "center";
  styles.backgroundAttachment = "fixed";
  styles.webkitBackgroundClip = "text";
  styles.backgroundClip = "text";
  styles.color = "transparent";
  return styles;
}

const MAIN_LINE_VARIANTS: Variants = {
  current: ({ coverUrl }) => {
    const styles: { [key: string]: string | number } = {
      marginBottom: 32,
      fontSize: 14 * 4,
      opacity: 1,
    };
    if (coverUrl) {
      styles.filter = "url(#sharpBlurBrighter)";
      styles.backgroundImage = `url(${coverUrl})`;
      setFilterProperties(styles);
    } else {
      styles.mixBlendMode = "hard-light";
      styles.color = "rgba(255, 255, 255, 0.7)";
    }
    return styles;
  },
  next: ({ coverUrl }) => {
    const styles: { [key: string]: string | number } = {
      fontSize: 14 * 2.5,
      opacity: 1,
      marginBottom: 0,
    };
    if (coverUrl) {
      styles.filter = "url(#sharpBlurBright)";
      styles.backgroundImage = `url(${coverUrl})`;
      setFilterProperties(styles);
    } else {
      styles.mixBlendMode = "overlay";
      styles.color = "rgba(255, 255, 255, 0.4)";
    }
    return styles;
  },
  initial: { opacity: 0, },
  exit: { opacity: 0, height: 0, marginBottom: 0, },
};

const TRANSLATION_LINE_VARIANTS: Variants = {
  current: {
    fontSize: 14 * 4 * 0.6,
  },
  next: {
    fontSize: 14 * 2.5 * 0.8,
  },
  initial: {},
  exit: { height: 0, },
};

const TRANSITION: Transition = {
  duration: 0.1,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  coverUrl: string | null;
  isCurrent: boolean;
}


function LyricsLineElement({ className, line, coverUrl, isCurrent }: LyricsLineElementProps) {
  if (!line) return null;
  return (
    <motion.div layout
      lang="ja"
      className={className}
      transition={TRANSITION}
      initial="initial"
      animate={isCurrent ? "current" : "next"}
      exit="exit"
      custom={{ coverUrl }}
      variants={MAIN_LINE_VARIANTS}>
      {line.content}
      {line.attachments?.translation && (
        <motion.div
          variants={TRANSLATION_LINE_VARIANTS}
          transition={TRANSITION}
          initial="initial"
          animate={isCurrent ? "current" : "next"}
          exit="exit"
          lang="zh">
          {line.attachments.translation}
        </motion.div>
      )}
    </motion.div>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
}

export function StaticLyrics({ lyrics }: Props) {
  const { playerRef, playlist } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const coverUrl = playlist.getCurrentCoverUrl();
  const styles = useStyle({ coverUrl });

  const lines = lyrics.lines;

  return (
    <motion.div className={styles.container}>
      <AnimatePresence initial={false}>
        {line !== null && lines.map((l, idx) => {
          if (idx < line || idx > line + 1) return null;
          return <LyricsLineElement className={styles.line} coverUrl={coverUrl} line={l} key={idx} isCurrent={idx === line} />;
        })}
      </AnimatePresence>
    </motion.div>
  );
}