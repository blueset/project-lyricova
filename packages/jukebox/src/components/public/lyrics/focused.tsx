import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/api/graphql/types";
import { useAppContext } from "../AppContext";
import type { Theme } from "@mui/material";
import { styled } from "@mui/material";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import type { SxProps } from "@mui/system";
import { useActiveLyrcsRanges } from "../../../hooks/useActiveLyricsRanges";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { LyricsAnimationRef } from "./components/AnimationRef.type";
import { LineRenderer, TimedSpanProps } from "./components/RubyLineRenderer";

const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

const TimedSpanGenerator = (full: boolean) =>
  forwardRef<LyricsAnimationRef, TimedSpanProps>(function TimedSpan(
    { startTime, endTime, children },
    ref
  ) {
    const webAnimationRef = useRef<Animation | null>(null);
    const refCallback = useCallback(
      (node?: HTMLSpanElement) => {
        if (node && node.style.opacity !== "1") {
          node.style.opacity = "1";
          const duration = Math.max(0.1, endTime - startTime);
          webAnimationRef.current = node.animate(
            full
              ? [
                  { opacity: "0.3" },
                  { opacity: "1", offset: 0.1 },
                  { opacity: "1" },
                ]
              : [
                  { opacity: "0.3" },
                  { opacity: "1", offset: 0.1 },
                  { opacity: "1", offset: 0.9 },
                  { opacity: "0.6", offset: 1 },
                ],
            {
              delay: startTime * 1000,
              duration: duration * 1000,
              fill: "both",
              id: `static-mask-${startTime}-${endTime}-${children}`,
            }
          );
        }
      },
      [children, startTime, endTime]
    );
    useImperativeHandle(ref, () => ({
      resume(time?: number) {
        const anim = webAnimationRef.current;
        if (anim) {
          anim.currentTime = time ? time * 1000 : 0;
          if (time <= endTime) anim.play();
          else anim.pause();
        }
      },
      pause(time?: number) {
        const anim = webAnimationRef.current;
        if (anim) {
          anim.pause();
          anim.currentTime = time ? time * 1000 : 0;
        }
      },
    }));
    return <span ref={refCallback}>{children}</span>;
  });

const TimedSpan = TimedSpanGenerator(true);
const TimedSpanPerSyllable = TimedSpanGenerator(false);

interface LyricsLineElementProps {
  className?: string;
  line: LyricsKitLyricsLine | null;
  start: number;
  end: number;
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
  "&[data-minor='true']": {
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

const PlainLineElement = forwardRef<LyricsAnimationRef, LyricsLineElementProps>(
  function PlainLineElement(
    { className, line, start, end, transLang, sx, idx },
    ref
  ) {
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
        <LineRenderer
          line={line}
          start={start}
          end={end}
          lineContainer="div"
          timedSpan={TimedSpan}
          ref={ref}
        />
        {line.attachments.translations[transLang] && (
          <div lang={transLang || "zh"} className="translation">
            {line.attachments.translations[transLang]}
          </div>
        )}
      </PlainDiv>
    );
  }
);

// #endregion

// #region glow style
const GlowDiv = styled(motion.div)({
  fontWeight: 100,
  lineHeight: 1.2,
  fontSize: "4em",
  color: "white",
  margin: "16px",
  fontVariationSettings: "'wght' 150, 'palt' 1",
  "&": {
    textWrap: "balance",
    wordBreak: "auto-phrase",
  },
  "&[data-minor='true']": {
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
    width: "calc(100% - 32px)",
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

const GlowLineElementGenerator = (full: boolean) =>
  forwardRef<LyricsAnimationRef, LyricsLineElementProps>(
    function GlowLineElement({ line, start, end, transLang, idx }, ref) {
      if (!line) return null;
      const content = (
        <>
          <LineRenderer
            line={line}
            start={start}
            end={end}
            lineContainer="div"
            timedSpan={full ? TimedSpan : TimedSpanPerSyllable}
            ref={ref}
          />
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
  );

const GlowLineElement = GlowLineElementGenerator(true);
const GlowPerSyllableLineElement = GlowLineElementGenerator(false);

// #endregion

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx?: number;
  variant?: "plain" | "glow" | "glowPerSyllable";
}

export function FocusedLyrics({
  lyrics,
  transLangIdx,
  variant = "plain",
}: Props) {
  const { playerRef } = useAppContext();
  const { currentFrame, segments, playerState } = useActiveLyrcsRanges(
    lyrics.lines,
    playerRef
  );
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;

  const animationRefs = useRef<LyricsAnimationRef[]>([]);
  useEffect(() => {
    if (playerState.state === "playing") {
      const currentTime =
        (performance.now() - playerState.startingAt) / playerState.rate / 1000;
      animationRefs.current.forEach((ref) => {
        if (ref) {
          ref.resume(currentTime);
        }
      });
    } else {
      animationRefs.current.forEach((ref) => {
        if (ref) {
          ref.pause(playerState.progress);
        }
      });
    }
  }, [playerState]);

  const lines = lyrics.lines;
  const lang = lyrics.translationLanguages[transLangIdx ?? 0];
  const LineElement =
    variant === "plain"
      ? PlainLineElement
      : variant === "glow"
      ? GlowLineElement
      : GlowPerSyllableLineElement;

  const setRef = useCallback(
    (index: number) => (ref?: LyricsAnimationRef) => {
      if (animationRefs.current[index] === ref) return;
      animationRefs.current[index] = ref;
      if (ref) {
        if (playerStateRef.current.state === "playing") {
          const currentTime =
            (performance.now() - playerStateRef.current.startingAt) /
            playerStateRef.current.rate /
            1000;
          ref.resume(currentTime);
        } else {
          ref.pause(playerStateRef.current.progress);
        }
      }
    },
    []
  );

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
          start={segments[segment].start}
          end={segments[segment].end}
          transLang={lang}
          idx={segment}
          key={segment}
          animate={true}
          ref={setRef(segment)}
        />
      ))}
    </motion.div>
  );
}
