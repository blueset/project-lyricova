import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState, usePlainPlayerLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { motion, Transition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import clsx from "clsx";

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
    line: {
      fontWeight: 600,
      lineHeight: 1.2,
      textWrap: "balance",
      fontSize: "4em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      color: "rgba(255, 255, 255, 0.8)",
      "& > div": {
        display: "block",
        fontSize: "0.6em",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      },
    },
    blurredBrighter: {
      filter: "var(--jukebox-cover-filter-brighter)",
    },
    brighter: {
      filter: "var(--jukebox-cover-filter-brighter-blurless)",
    }
  };
});


const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  animate: boolean;
}


function LyricsLineElement({ className, line, animate }: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };

  return (
    <motion.div
      lang="ja"
      className={className}
      transition={transition}
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
    >
      {
        animate ? (
          <BalancedText
            resize={true} > {line.content}</BalancedText>
        ) : line.content}
      {
        line.attachments?.translation && (
          <div
            lang="zh">
            {animate ? (
              <BalancedText
                resize={true}>{line.attachments.translation}</BalancedText>
            ) : line.attachments.translation}
          </div>
        )
      }
    </motion.div >
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function FocusedLyrics({ lyrics, blur }: Props) {
  const { playerRef } = useAppContext();
  const {currentFrame, currentFrameId, endTime} = usePlainPlayerLyricsState(lyrics, playerRef);

  const styles = useStyle();

  const lines = lyrics.lines;

  const blurClass = blur ? styles.blurredBrighter : styles.brighter;

  return (
    <motion.div className={styles.container}>
      {currentFrame !== null && lines.map((l, idx) => {
        if (idx !== currentFrameId) return null;
        const animate = (endTime - currentFrame.start) >= ANIMATION_THRESHOLD;
        return (
          <LyricsLineElement
            className={clsx(styles.line, blurClass, "coverMask")}
            line={l}
            key={idx}
            animate={animate} />);
      })}
    </motion.div>
  );
}