import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../hooks/usePlainPlayerLyricsState";
import type { Theme } from "@mui/material";
import { styled } from "@mui/material";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import Balancer from "react-wrap-balancer";
import type { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

const ANIMATION_THRESHOLD = 0.25;

const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className?: string;
  line: LyricsKitLyricsLine | null;
  transLang?: string;
  animate: boolean;
  sx?: SxProps<Theme>;
}

const SxMotionDiv = styled(motion.div)``;

function LyricsLineElement({
  className,
  line,
  transLang,
  animate,
  sx,
}: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };

  return (
    <SxMotionDiv
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
      sx={sx}
    >
      {animate ? <Balancer>{line.content}</Balancer> : line.content}
      {line.attachments.translations[transLang] && (
        <div lang={transLang || "zh"}>
          {animate ? (
            <Balancer>{line.attachments.translations[transLang]}</Balancer>
          ) : (
            line.attachments.translations[transLang]
          )}
        </div>
      )}
    </SxMotionDiv>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
  blur?: boolean;
}

export function FocusedLyrics({ lyrics, transLangIdx }: Props) {
  const { playerRef } = useAppContext();
  const { currentFrame, currentFrameId, endTime } = usePlainPlayerLyricsState(
    lyrics,
    playerRef
  );

  const lines = lyrics.lines;
  const lang = lyrics.translationLanguages[transLangIdx ?? 0];

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
      {currentFrame !== null &&
        lines.map((l, idx) => {
          if (idx !== currentFrameId) return null;
          const animate = endTime - currentFrame.start >= ANIMATION_THRESHOLD;
          return (
            <LyricsLineElement
              sx={{
                fontWeight: 600,
                lineHeight: 1.2,
                fontSize: "4em",
                color: "rgba(255, 255, 255, 0.8)",
                "& > div": {
                  display: "block",
                  fontSize: "0.6em",
                },
              }}
              line={l}
              transLang={lang}
              key={idx}
              animate={animate}
            />
          );
        })}
    </motion.div>
  );
}
