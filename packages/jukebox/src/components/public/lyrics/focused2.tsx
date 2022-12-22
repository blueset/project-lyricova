import {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { styled } from "@mui/material";
import { motion, Variants, AnimatePresence, Transition } from "framer-motion";
import _ from "lodash";
import Balancer from "react-wrap-balancer";

const ANIMATION_THRESHOLD = 0.25;

const SxMotionDiv = styled(motion.div)``;

const MAIN_LINE_VARIANTS: Variants = {
  current: {
    marginBottom: 32,
    opacity: 1,
    scale: 1,
    color: "rgba(255, 255, 255, 0.7)",
    filter: "var(--jukebox-cover-filter-brighter)",
  },
  next: {
    opacity: 1,
    marginBottom: 0,
    scale: 0.625,
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
  line: LyricsKitLyricsLine | null;
  isCurrent: boolean;
  animate: boolean;
}

function LyricsLineElement({
  line,
  isCurrent,
  animate,
}: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };
  return (
    <SxMotionDiv
      lang="ja"
      className={"coverMask"}
      transition={transition}
      animate={isCurrent ? "current" : "next"}
      exit="exit"
      variants={MAIN_LINE_VARIANTS}
      sx={{
        fontWeight: 600,
        lineHeight: 1.2,
        fontSize: "3.5em",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        width: "100%",
        color: "rgba(255, 255, 255, 0.4)",
        transformOrigin: "center left",
        transform: "scale(0.625)",
        filter: "var(--jukebox-cover-filter-bright)",
        "& > div": {
          display: "block",
          fontSize: "0.8em",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        },
      }}
    >
      <Balancer>{line.content}</Balancer>
      {line.attachments?.translation && (
        <motion.div
          variants={TRANSLATION_LINE_VARIANTS}
          transition={transition}
          animate={isCurrent ? "current" : "next"}
          exit="exit"
          lang="zh"
        >
          <Balancer>{line.attachments.translation}</Balancer>
        </motion.div>
      )}
    </SxMotionDiv>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
}

export function FocusedLyrics2({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const lines = lyrics.lines;

  return (
    <motion.div
      style={{
        padding: 16,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {line !== null &&
          lines.map((l, idx) => {
            if (idx < line || idx > line + 1) return null;
            const animate =
              idx + 1 > lines.length ||
              !lines[idx + 1] ||
              lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD;
            return (
              <LyricsLineElement
                line={l}
                key={idx}
                animate={animate}
                isCurrent={idx === line}
              />
            );
          })}
      </AnimatePresence>
    </motion.div>
  );
}
