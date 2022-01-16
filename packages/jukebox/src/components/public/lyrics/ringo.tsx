import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles, styled, Theme, useTheme } from "@mui/material";
import { motion, Variants, AnimatePresence, Transition, TargetAndTransition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";
import { CSSProperties } from "react";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

const ANIMATION_THRESHOLD = 0.25;

const SxMotionDiv = styled(motion.div)``;

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
  offsetIndex: number;
  animate: boolean;
  resize: boolean;
  sx?: SxProps<Theme>;
}

function LyricsLineElement({ className, line, offsetIndex, animate, resize, sx }: LyricsLineElementProps) {
  const theme = useTheme();
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };

  const styles: TargetAndTransition = {
    opacity: 1,
    height: "auto",
    marginBottom: 50,
    width: "100%",
    fontSize: theme.typography.fontSize * 3,
    transitionEnd: {
      filter: "var(--jukebox-cover-filter-bright-blur, blur(var(--jukebox-ringo-blur-radius)))",
    },
  };

  if (offsetIndex === 0) {
    if (resize) {
      styles.fontSize = theme.typography.fontSize * 5;
    } else {
    }
    styles.transitionEnd.filter = "var(--jukebox-cover-filter-brighter)";
    styles.transitionEnd.mixBlendMode = "hard-light";
    styles.color = "rgba(255, 255, 255, 0.7)";
  } else {
    if (resize) {
      styles.fontSize = 14 * 3;
      styles.width = "62.5%";
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    styles["--jukebox-ringo-blur-radius"] = `${0.4 * Math.abs(offsetIndex)}px`;
    styles.transitionEnd.mixBlendMode = "overlay";
    styles.color = "rgba(255, 255, 255, 0.4)";
    if (offsetIndex < 0) {
      styles.height = 35;
    }
  }


  const translationVariants = resize ? TRANSLATION_LINE_VARIANTS : {
    exit: TRANSLATION_LINE_VARIANTS.exit,
  };

  return (
    <SxMotionDiv
      lang="ja"
      className={className}
      sx={sx}
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
    </SxMotionDiv >
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
    } as unknown as CSSProperties}>
      <AnimatePresence initial={false}>
        {lineNumber === 0 && <motion.div animate={{ minHeight: 35, }} exit={{ minHeight: 0, }} />}
        {lines.map((l, idx) => {
          if (idx < lineNumber - 1 || idx > lineNumber + 12) return null;
          const animate =
            (idx + 1 > lines.length) || (!lines[idx + 1]) ||
            (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
          return (
            <LyricsLineElement
              sx={{
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
                "--jukebox-cover-filter-bright-blur": "var(--jukebox-cover-filter-bright) blur(var(--jukebox-ringo-blur-radius))",
                filter: "var(--jukebox-cover-filter-bright-blur, blur(var(--jukebox-ringo-blur-radius)))",
                "& .translation": {
                  display: "block",
                  fontSize: "0.7em",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundAttachment: "fixed",
                },
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