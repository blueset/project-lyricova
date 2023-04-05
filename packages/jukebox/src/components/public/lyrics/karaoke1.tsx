import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
  LyricsKitWordTimeTag,
} from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../frontendUtils/hooks";
import { Box, Stack } from "@mui/material";
import Balancer from "react-wrap-balancer";
import gsap from "gsap";
import type { CSSProperties, RefObject} from "react";
import { useEffect, useRef } from "react";
import { measureTextWidths } from "../../../frontendUtils/measure";

type Timeline = gsap.core.Timeline;

const ANIMATION_THRESHOLD = 0.25;

interface WrapProps {
  children: string;
  className?: string;
  style?: CSSProperties;
  progressorRef?: RefObject<HTMLSpanElement>;
}

function BalancedTextSpanWrap({
  children,
  className,
  style,
  progressorRef,
}: WrapProps) {
  return (
    <span className={className} style={style} ref={progressorRef}>
      {children}
    </span>
  );
}

interface LyricsLineElementProps {
  line: LyricsKitLyricsLine | null;
  animate: boolean;
  theme: string;
  progressorRef?: RefObject<HTMLSpanElement>;
}

function LyricsLineElement({
  line,
  theme,
  progressorRef,
}: LyricsLineElementProps) {
  if (!line) return null;

  return (
    <div>
      <Box
        sx={{
          fontWeight: 600,
          lineHeight: 1.2,
          fontSize: "4em",
          position: "relative",
          "& span.base": {
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            color: "rgba(255, 255, 255, 0.6)",
            filter: "var(--jukebox-cover-filter-bright)",
            position: "absolute",
            width: "calc(100% - 32px)",
          },
          "& span.overlay": {
            color: "transparent",
            backgroundRepeat: "no-repeat",
            backgroundSize: "0% 100%",
            mixBlendMode: "overlay",
            "&.underline": {
              backgroundImage: `linear-gradient(
              transparent 60%,
              white 60%,
              white 90%,
              transparent 90%
            )`,
            },
            "&.cover": {
              backgroundImage: `linear-gradient(
                transparent 7.5%,
                white 7.5%,
                white 85%,
                transparent 85%
              )`,
            },
          },
        }}
        lang="ja"
      >
        <BalancedTextSpanWrap className="base coverMask">
          {line.content}
        </BalancedTextSpanWrap>
        <BalancedTextSpanWrap
          className={`overlay ${theme}`}
          progressorRef={progressorRef}
        >
          {line.content}
        </BalancedTextSpanWrap>
      </Box>
      {line.attachments?.translation && (
        <Box
          lang="zh"
          sx={{
            display: "block",
            fontSize: "2.2em",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            lineHeight: 1.2,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.6)",
            filter: "var(--jukebox-cover-filter-bright)",
          }}
        >
          <Balancer>{line.attachments.translation}</Balancer>
        </Box>
      )}
    </div>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  cover?: boolean;
}

export function Karaoke1Lyrics({ lyrics, cover }: Props) {
  const { playerRef } = useAppContext();
  const progressorRef = useRef<HTMLSpanElement>();

  const { playerState, currentFrame, endTime } = usePlainPlayerLyricsState(
    lyrics,
    playerRef
  );

  const timelineRef = useRef<Timeline>();
  useEffect(() => {
    if (timelineRef.current) timelineRef.current.kill();
    const tl = gsap.timeline({ paused: playerState.state === "paused" });
    if (progressorRef.current) {
      const duration = endTime - (currentFrame?.start ?? 0);
      if (currentFrame.data.attachments?.timeTag) {
        progressorRef.current.style.backgroundSize = "0% 100%";
        const lengths = measureTextWidths(progressorRef.current);
        const length = lengths[lengths.length - 1];
        const percentages = lengths.map((v) => (v / length) * 100);
        const tags = currentFrame.data.attachments.timeTag.tags;
        tags.forEach((v: LyricsKitWordTimeTag, idx: number) => {
          const duration =
            idx > 0 ? v.timeTag - tags[idx - 1].timeTag : v.timeTag;
          const start = idx > 0 ? tags[idx - 1].timeTag : 0;
          let percentage = 0;
          if (v.index > 0) percentage = percentages[v.index - 1];
          tl.to(
            progressorRef.current,
            {
              backgroundSize: `${percentage}% 100%`,
              ease: "none",
              duration,
            },
            start
          );
        });
      } else {
        tl.fromTo(
          progressorRef.current,
          {
            backgroundSize: "0% 100%",
          },
          {
            backgroundSize: "100% 100%",
            ease: "none",
            duration,
          }
        );
      }
    }
    timelineRef.current = tl;
  }, [currentFrame, endTime, playerState.state]);

  // Controls the progress of timeline
  useEffect(() => {
    const timeline = timelineRef.current;
    const now = performance.now();
    const startTime = currentFrame?.start ?? 0;

    if (timeline) {
      if (playerState.state === "playing") {
        const inlineProgress =
          (now - playerState.startingAt) / 1000 - startTime;
        timeline.seek(inlineProgress);
        timeline.play();
      } else {
        const inlineProgress = playerState.progress - startTime;
        timeline.pause();
        timeline.seek(inlineProgress);
      }
    }
    // Removing currentFrame?.start as we don’t want it to trigger for every line update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState]);

  let lineElement = null;
  if (currentFrame !== null) {
    const animate = endTime - (currentFrame?.start ?? 0) >= ANIMATION_THRESHOLD;
    lineElement = (
      <LyricsLineElement
        theme={cover ? "cover" : "underline"}
        line={currentFrame.data}
        animate={animate}
        progressorRef={progressorRef}
      />
    );
  }

  return (
    <Stack
      sx={{ padding: 4, width: "100%", height: "100%" }}
      direction="column"
      justifyContent="center"
    >
      {lineElement}
    </Stack>
  );
}
