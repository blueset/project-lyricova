import {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../frontendUtils/hooks";
import { styled, Theme } from "@mui/material";
import { motion, Transition } from "framer-motion";
import Balancer from "react-wrap-balancer";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

const ANIMATION_THRESHOLD = 0.25;

const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  animate: boolean;
  sx?: SxProps<Theme>;
}

const SxMotionDiv = styled(motion.div)``;

function LyricsLineElement({
  className,
  line,
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
      {line.attachments?.translation && (
        <div lang="zh">
          {animate ? (
            <Balancer>{line.attachments.translation}</Balancer>
          ) : (
            line.attachments.translation
          )}
        </div>
      )}
    </SxMotionDiv>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function FocusedLyrics({ lyrics, blur }: Props) {
  const { playerRef } = useAppContext();
  const { currentFrame, currentFrameId, endTime } = usePlainPlayerLyricsState(
    lyrics,
    playerRef
  );

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
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                color: "rgba(255, 255, 255, 0.8)",
                filter: blur
                  ? "var(--jukebox-cover-filter-brighter)"
                  : "var(--jukebox-cover-filter-brighter-blurless)",
                "& > div": {
                  display: "block",
                  fontSize: "0.6em",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundAttachment: "fixed",
                },
              }}
              className={"coverMask"}
              line={l}
              key={idx}
              animate={animate}
            />
          );
        })}
    </motion.div>
  );
}
