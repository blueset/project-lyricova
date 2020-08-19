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
    nextLine: {
      fontWeight: 600,
      lineHeight: 1.2,
      textWrap: "balance",
      fontSize: "2.5em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      width: "62.5%",
      "& > div": {
        display: "block",
        fontSize: "0.8em",
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

const MAIN_LINE_VARIANTS: Variants = {
  current: ({ coverUrl }) => {
    const styles: RoughStyle = {
      marginBottom: 32,
      fontSize: 14 * 4,
      opacity: 1,
      width: "100%",
    };
    if (coverUrl) {
      styles.filter = "url(#sharpBlurBrighter)";
    } else {
      styles.mixBlendMode = "hard-light";
      styles.color = "rgba(255, 255, 255, 0.7)";
    }
    return styles;
  },
  next: ({ coverUrl }) => {
    const styles: RoughStyle = {
      fontSize: 14 * 2.5,
      opacity: 1,
      marginBottom: 0,
      width: "62.5%",
    };
    if (coverUrl) {
      styles.filter = "url(#sharpBlurBright)";
    } else {
      styles.mixBlendMode = "overlay";
      styles.color = "rgba(255, 255, 255, 0.4)";
    }
    return styles;
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
  coverUrl: string | null;
  isCurrent: boolean;
  animate: boolean;
}


function LyricsLineElement({ className, line, coverUrl, isCurrent, animate }: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };
  return (
    <motion.div
      lang="ja"
      className={className}
      transition={transition}
      animate={isCurrent ? "current" : "next"}
      exit="exit"
      custom={{ coverUrl }}
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
          const animate =
            (idx + 1 > lines.length) || (!lines[idx + 1]) ||
            (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
          return (
            <LyricsLineElement
              className={styles.nextLine}
              coverUrl={coverUrl}
              line={l}
              key={idx}
              animate={animate}
              isCurrent={idx === line} />);
        })}
      </AnimatePresence>
    </motion.div>
  );
}