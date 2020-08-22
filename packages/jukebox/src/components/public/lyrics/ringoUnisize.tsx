import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { motion, Variants, AnimatePresence, Transition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";

const ANIMATION_THRESHOLD = 0.25;

const useStyle = makeStyles((theme) => {
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
      fontSize: "3em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      display: "flex",
      flexDirection: "column-reverse",
      color: "rgba(255, 255, 255, 0.4)",
      filter: "var(--jukebox-cover-filter-bright)",
      "& .translation": {
        display: "block",
        fontSize: "0.7em",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      },
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
    if (coverUrl) {
      styles.filter = "url(#sharpBlurBrighter)";
    } else {
      styles.mixBlendMode = "hard-light";
      styles.color = "rgba(255, 255, 255, 0.7)";
    }
  } else {
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

export function RingoUnisizeLyrics({ lyrics }: Props) {
  const { playerRef, playlist } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const coverUrl = playlist.getCurrentCoverUrl();
  const styles = useStyle({ coverUrl });

  const lines = lyrics.lines;

  const lineNumber = line || 0;

  return (
    <motion.div className={styles.container}>
      <AnimatePresence initial={false}>
        {lineNumber === 0 && <motion.div animate={{ minHeight: 35, }} exit={{ minHeight: 0, }} ></motion.div>}
        {lines.map((l, idx) => {
          if (idx < lineNumber - 1 || idx > lineNumber + 12) return null;
          const animate =
            (idx + 1 > lines.length) || (!lines[idx + 1]) ||
            (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
          return (
            <LyricsLineElement
              className={clsx(styles.nextLine, "coverMask")}
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