import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import type { Theme } from "@mui/material";
import { styled } from "@mui/material";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import type { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";
import { useActiveLyrcsRanges } from "../../../hooks/useActiveLyricsRanges";

const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className?: string;
  line: LyricsKitLyricsLine | null;
  idx: number;
  transLang?: string;
  animate: boolean;
  sx?: SxProps<Theme>;
}

// #region plain style

const PlainDiv = styled(motion.div)({
  fontWeight: 600,
  lineHeight: 1.2,
  fontSize: "3.5em",
  color: "rgba(255, 255, 255, 0.8)",
  "&.minor": {
    fontSize: "2.5em",
  },
  "&[data-role='1']": {
    textAlign: "end",
  },
  "&[data-role='2']": {
    textAlign: "center",
  },
  "& > div": {
    textWrap: "balance",
    wordBreak: "auto-phrase",
  },
  "& > .translation": {
    marginTop: 8,
    display: "block",
    fontSize: "0.6em",
  },
});

function PlainLineElement({
  className,
  line,
  transLang,
  sx,
  idx,
}: LyricsLineElementProps) {
  if (!line) return null;

  return (
    <PlainDiv
      lang="ja"
      layout
      className={className}
      transition={TRANSITION}
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
      data-role={line.attachments.role}
      data-minor={line.attachments.minor}
      layoutId={`${idx}`}
    >
      <div>{line.content}</div>
      {line.attachments.translations[transLang] && (
        <div lang={transLang || "zh"} className="translation">
            {line.attachments.translations[transLang]}
        </div>
      )}
    </PlainDiv>
  );
}

// #endregion

// #region glow style
const GlowDiv = styled(motion.div)({
  fontWeight: 100,
  lineHeight: 1.2,
  fontSize: "4em",
  // top: "50%",
  color: "white",
  margin: "16px",
  fontVariationSettings: "'wght' 150, 'palt' 1",
  "&.minor": {
    fontSize: "2.5em",
  },
  "&[data-role='1']": {
    textAlign: "end",
  },
  "&[data-role='2']": {
    textAlign: "center",
  },
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
});

function GlowLineElement({ line, transLang, idx }: LyricsLineElementProps) {
  if (!line) return null;
  const content = (
    <>
      <div>{line.content}</div>
      {line.attachments?.translations[transLang] && (
        <div className="translate" lang={transLang || "zh"}>
          {line.attachments.translations[transLang]}
        </div>
      )}
    </>
  );

  return (
    <GlowDiv
      lang="ja"
      transition={TRANSITION}
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      data-role={line.attachments.role}
      data-minor={line.attachments.minor}
      layout
      layoutId={`${idx}`}
    >
      <div className="overlay">{content}</div>
      <div className="text">{content}</div>
    </GlowDiv>
  );
}
// #endregion

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
  variant?: "plain" | "glow";
}

export function FocusedLyrics({ lyrics, transLangIdx, variant = "plain" }: Props) {
  const { playerRef } = useAppContext();
  const { currentFrame } = useActiveLyrcsRanges(
    lyrics.lines,
    playerRef
  );

  const lines = lyrics.lines;
  const lang = lyrics.translationLanguages[transLangIdx ?? 0];
  const LineElement = variant === "plain" ? PlainLineElement : GlowLineElement;

  return (
    <motion.div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "absolute",
        inset: "20px",
        gap: "20px",
      }}
      layout
    >
        {currentFrame?.data?.activeSegments.map((segment) => (
          <LineElement
            line={lines[segment]}
            transLang={lang}
            idx={segment}
            key={segment}
            animate={true}
          />
        ))}
    </motion.div>
  );
}
