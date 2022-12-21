import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { styled, Theme, useTheme } from "@mui/material";
import { motion, Variants, AnimatePresence, Transition, TargetAndTransition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import { CSSProperties } from "react";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

const ANIMATION_THRESHOLD = 0.25;

const SxMotionDiv = styled(motion.div)``;
const MotionDivLine = styled(motion.div)`
  font-weight: 600;
  line-height: 1.2;
  text-wrap: balance;
  font-size: 3em;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  display: flex;
  flex-direction: column-reverse;
  color: rgba(255, 255, 255, 0.4);
  --jukebox-cover-filter-bright-blur: var(--jukebox-cover-filter-bright) blur(var(--jukebox-ringo-blur-radius));
  filter: var(--jukebox-cover-filter-bright-blur, blur(var(--jukebox-ringo-blur-radius)));
  transform-origin: top left;
  & .translation {
    display: block;
    font-size: 0.7em;
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }
`;

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
  duration: 0.1,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  offsetIndex: number;
  animate: boolean;
  resize: boolean;
  sx?: SxProps<Theme>;
}

function LyricsLineElement({ className, line, offsetIndex, animate, resize, sx }: LyricsLineElementProps) {
  const theme = useTheme();
  if (!line) return null;
  const transition: Transition = animate ? TRANSITION : { duration: 0 };

  const styles: TargetAndTransition = {
    opacity: 1,
    height: "auto",
    marginBottom: 50,
    // width: resize ? "72.5%" : "100%",
    fontSize: theme.typography.fontSize * 3,
    // trans
    transitionEnd: {
      filter: "var(--jukebox-cover-filter-brighter, blur(var(--jukebox-ringo-blur-radius)))",
      mixBlendMode: "hard-light",
    },
  };

  if (offsetIndex === 0) {
    // if (resize) {
    //   styles.scale = 1.3;
    // } else {
    // }
    styles.transitionEnd.filter = "var(--jukebox-cover-filter-brighter)";
    styles.transitionEnd.mixBlendMode = "hard-light";
    styles.color = "rgba(255, 255, 255, 0.7)";
  } else {

    // @ts-ignore
    styles["--jukebox-ringo-blur-radius"] = `${0.4 * Math.abs(offsetIndex)}px`;
    styles.opacity = 0.75;
    styles.transitionEnd.mixBlendMode = "overlay";
    styles.color = "rgba(255, 255, 255, 0.4)";
    if (offsetIndex < 0) {
      styles.height = 35;
    }
  }
  
  // const translationVariants = resize ? TRANSLATION_LINE_VARIANTS : {
  //   exit: TRANSLATION_LINE_VARIANTS.exit,
  // };
  const translationVariants = {
    exit: TRANSLATION_LINE_VARIANTS.exit,
  };

  return (
    <MotionDivLine
      lang="ja"
      layout
      className={className}
      transition={transition}
      animate={styles}
      exit={{
        opacity: 0,
        height: 0,
        marginBottom: 0,
      }}
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
              variants={translationVariants}
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
    </MotionDivLine>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  resize?: boolean;
}

export function RingoLyrics({ lyrics, resize }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const lines = lyrics.lines;

  const lineNumber = line || 0;

  return (
    <SxMotionDiv sx={{
      paddingLeft: 4,
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
    } as unknown as CSSProperties} transition={{staggerChildren: 1}}>
      <AnimatePresence initial={false} mode="popLayout">
        {lineNumber === 0 && <motion.div animate={{ minHeight: 35, }} exit={{ minHeight: 0, }} />}
        {lines.map((l, idx) => {
          if (idx < lineNumber - 1 || idx > lineNumber + 12) return null;
          const animate =
            (idx + 1 > lines.length) || (!lines[idx + 1]) ||
            (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
          return (
            <LyricsLineElement
              sx={{
                ...(resize && {width: "62.5%",})
              } as unknown as CSSProperties}
              className="coverMask"
              line={l}
              key={idx}
              animate={animate}
              resize={resize}
              offsetIndex={line !== null ? idx - line : idx + 1} />);
        })}
      </AnimatePresence>
    </SxMotionDiv>
  );
}