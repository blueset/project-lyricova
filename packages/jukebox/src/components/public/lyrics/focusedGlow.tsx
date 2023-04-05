import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { styled } from "@mui/material";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import Balancer from "react-wrap-balancer";

const ANIMATION_THRESHOLD = 0.25;

const SxMotionDiv = styled(motion.div)``;

const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  line: LyricsKitLyricsLine | null;
  animate: boolean;
}

function LyricsLineElement({ line, animate }: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };
  const content = (
    <>
      <Balancer>{line.content}</Balancer>
      {line.attachments?.translation && (
        <div className="translate" lang="zh">
          <Balancer>{line.attachments.translation}</Balancer>
        </div>
      )}
    </>
  );

  return (
    <SxMotionDiv
      lang="ja"
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
      sx={{
        fontWeight: 100,
        lineHeight: 1.2,
        fontSize: "4em",
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        width: "calc(100% - 32px)",
        color: "white",
        fontVariationSettings: "'wght' 150, 'palt' 1",
        "& .translate": {
          display: "block",
          fontSize: "0.6em",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        },
        "& .overlay": {
          position: "absolute",
          width: "100%",
          filter: "blur(5px) drop-shadow(0 0 5px white)",
          maskImage: "url(/images/glowMask.png)",
          maskSize: "200%",
          maskPosition: "0% 0%",
          animation: "lyricsGlowEffect 20s linear infinite alternate",
        },
        "@keyframes lyricsGlowEffect": {
          from: {
            maskPosition: "0 1024px",
          },
          to: {
            maskPosition: "1024px 0",
          },
        },
      }}
    >
      <div className="overlay">{content}</div>
      <div className="text">{content}</div>
    </SxMotionDiv>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function FocusedGlowLyrics({ lyrics }: Props) {
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
      {line !== null &&
        lines.map((l, idx) => {
          if (idx < line || idx > line) return null;
          const animate =
            idx + 1 > lines.length ||
            !lines[idx + 1] ||
            lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD;
          return <LyricsLineElement line={l} key={idx} animate={animate} />;
        })}
    </motion.div>
  );
}
