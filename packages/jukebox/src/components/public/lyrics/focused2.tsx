import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { motion, Variants, AnimatePresence, Transition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import clsx from "clsx";
import _ from "lodash";

const ANIMATION_THRESHOLD = 0.25;

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
    nextLine: {
      fontWeight: 600,
      lineHeight: 1.2,
      textWrap: "balance",
      fontSize: "2.5em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      width: "62.5%",
      color: "rgba(255, 255, 255, 0.4)",
      filter: "var(--jukebox-cover-filter-bright)",
      "& > div": {
        display: "block",
        fontSize: "0.8em",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      },
    },
  };
});

const MAIN_LINE_VARIANTS: Variants = {
  current: {
    marginBottom: 32,
    fontSize: 14 * 4,
    opacity: 1,
    width: "100%",
    color: "rgba(255, 255, 255, 0.7)",
    filter: "var(--jukebox-cover-filter-brighter)",
  },
  next: {
    fontSize: 14 * 2.5,
    opacity: 1,
    marginBottom: 0,
    width: "62.5%",
    color: "rgba(255, 255, 255, 0.4)",
    filter: "var(--jukebox-cover-filter-bright)",
  },
  exit: {
    opacity: 0,
    marginBottom: 0,
    height: 0,
  },
};

const TRANSLATION_LINE_VARIANTS: Variants = {
  current: {
    fontSize: 14 * 4 * 0.6,
  },
  next: {
    fontSize: 14 * 2.5 * 0.8,
  },
  exit: {
    height: 0,
  },
};

const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  isCurrent: boolean;
  animate: boolean;
}


function LyricsLineElement({ className, line, isCurrent, animate }: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };
  return (
    <motion.div
      lang="ja"
      className={clsx(className, "coverMask")}
      transition={transition}
      animate={isCurrent ? "current" : "next"}
      exit="exit"
      variants={MAIN_LINE_VARIANTS}
    >
      {
        animate ? (
          <BalancedText
            resize={true} > {line.content}</BalancedText>
        ) : line.content}
      {
        line.attachments?.translation && (
          <motion.div
            variants={TRANSLATION_LINE_VARIANTS}
            transition={transition}
            animate={isCurrent ? "current" : "next"}
            exit="exit"
            lang="zh">
            {animate ? (
              <BalancedText
                resize={true}>{line.attachments.translation}</BalancedText>
            ) : line.attachments.translation}
          </motion.div>
        )
      }
    </motion.div >
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
}

export function FocusedLyrics2({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const styles = useStyle();

  const lines = lyrics.lines;

  return (
    <motion.div className={styles.container}>

      <AnimatePresence initial={false}>
        {line !== null && lines.map((l, idx) => {
          if (idx < line || idx > line + 1) return null;
          const animate =
            (idx + 1 > lines.length) || (!lines[idx + 1]) ||
            (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
          return (
            <LyricsLineElement
              className={clsx(styles.nextLine, "coverMask")}
              line={l}
              key={idx}
              animate={animate}
              isCurrent={idx === line} />);
        })}
      </AnimatePresence>
    </motion.div>
  );
}