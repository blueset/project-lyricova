import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles, Theme } from "@material-ui/core";
import { BlendStyleParams, blendStyleProperties } from "../../../frontendUtils/blendStyle";
import { motion, Variants, AnimatePresence, Transition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";

const ANIMATION_THRESHOLD = 0.25;

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
      fontSize: "4em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      "& > div": {
        display: "block",
        fontSize: "0.6em",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      },
      ...blendStyleProperties({ filterName: "#sharpBlurBrighter", color: "rgba(255, 255, 255, 0.4)" }),
    },
  };
});

type RoughStyle = {
  transitionEnd?: {
    [key: string]: string | number;
  };
  [key: string]: string | number | object;
};

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
}

export function FocusedLyrics({ lyrics }: Props) {
  const { playerRef, playlist } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const coverUrl = playlist.getCurrentCoverUrl();
  const styles = useStyle({ coverUrl });

  const lines = lyrics.lines;

  return (
    <motion.div className={styles.container}>
      {line !== null && lines.map((l, idx) => {
        if (idx < line || idx > line) return null;
        const animate =
          (idx + 1 > lines.length) || (!lines[idx + 1]) ||
          (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
        return (
          <LyricsLineElement
            className={styles.line}
            line={l}
            key={idx}
            animate={animate} />);
      })}
    </motion.div>
  );
}