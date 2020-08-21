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
      padding: theme.spacing(0, 4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "start",
      overflow: "hidden",
      maskBorderImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBorderImageSlice: "49% 0 fill",
      maskBorderImageWidth: "100px 0",
      maskBoxImageSource: "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
      maskBoxImageSlice: "49% 0 fill",
      maskBoxImageWidth: "35px 0 50%",
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
      display: "flex",
      flexDirection: "column-reverse",
      "& .translation": {
        display: "block",
        fontSize: "0.6em",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      },
      ...blendStyleProperties({ filterName: "#sharpBlurBright", color: "rgba(255, 255, 255, 0.4)" }),
    },
  };
});

type RoughStyle = {
  transitionEnd?: {
    [key: string]: string | number;
  };
  [key: string]: string | number | object;
};

const TRANSLATION_LINE_VARIANTS: Variants = {
  current: {
    fontSize: 14 * 5 * 0.6,
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
  offsetIndex: number;
  animate: boolean;

}


function LyricsLineElement({ className, line, coverUrl, offsetIndex, animate }: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };
  const styles: RoughStyle = {
    opacity: 1,
    height: "auto",
    marginBottom: 50,
  };

  if (offsetIndex === 0) {
    styles.fontSize = 14 * 5;
    styles.width = "100%";
    if (coverUrl) {
      styles.filter = "url(#sharpBlurBrighter)";
    } else {
      styles.mixBlendMode = "hard-light";
      styles.color = "rgba(255, 255, 255, 0.7)";
    }
  } else {
    styles.fontSize = 14 * 3;
    styles.width = "62.5%";
    const blurFilter = `blur(${0.4 * Math.abs(offsetIndex)}px)`;
    if (coverUrl) {
      styles.filter = `url(#sharpBlurBright) ${blurFilter}`;
    } else {
      styles.mixBlendMode = "overlay";
      styles.color = "rgba(255, 255, 255, 0.4)";
      styles.filter = blurFilter;
    }
    if (offsetIndex < 0) {
      styles.height = 35;
    }
  }

  return (
    <motion.div
      lang="ja"
      className={className}
      transition={transition}
      animate={styles}
      exit={{
        opacity: 0,
        height: 0,
        marginBottom: 0,
      }}
      custom={{ coverUrl }}
    >
      <div className="wrapper">
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
              animate={offsetIndex === 0 ? "current" : "next"}
              exit="exit"
              className="translation"
              lang="zh">
              {animate ? (
                <BalancedText
                  resize={true}>{line.attachments.translation}</BalancedText>
              ) : line.attachments.translation}
            </motion.div>
          )
        }
      </div>
    </motion.div >
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
}

export function RingoLyrics({ lyrics }: Props) {
  const { playerRef, playlist } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const coverUrl = playlist.getCurrentCoverUrl();
  const styles = useStyle({ coverUrl });

  const lines = lyrics.lines;

  const lineNumber = line || 0;

  return (
    <motion.div className={styles.container}>
      <AnimatePresence initial={false}>
        {lines.map((l, idx) => {
          if (idx < lineNumber - 1 || idx > lineNumber + 12) return null;
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
              offsetIndex={line !== null ? idx - line : idx + 1} />);
        })}
      </AnimatePresence>
    </motion.div>
  );
}