import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { usePlainPlayerLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import BalancedText from "react-balance-text-cj";
import gsap from "gsap";
import clsx from "clsx";
import { CSSProperties, RefObject, useEffect, useMemo, useRef } from "react";
import { measureTextWidths } from "../../../frontendUtils/measure";

type Timeline = gsap.core.Timeline;

const ANIMATION_THRESHOLD = 0.25;

const useStyle = makeStyles((theme) => {
  return {
    container: {
      padding: theme.spacing(4),
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    line: {
      fontWeight: 600,
      lineHeight: 1.2,
      fontSize: "4em",
      textWrap: "balance",
      position: "relative",
      "& span.base": {
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        color: "rgba(255, 255, 255, 0.6)",
        filter: "var(--jukebox-cover-filter-bright)",
        position: "absolute",
      },
      "& span.overlay": {
        color: "transparent",
        backgroundRepeat: "no-repeat",
        backgroundSize: "0% 100%",
        mixBlendMode: "overlay",
        // transition: "background-size 0.1s",
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
    },
    translation: {
      display: "block",
      fontSize: "2.2em",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      lineHeight: 1.2,
      fontWeight: 600,
      textWrap: "balance",
      color: "rgba(255, 255, 255, 0.6)",
      filter: "var(--jukebox-cover-filter-bright)",
    },
  };
});

interface WrapProps {
  animate: boolean;
  children: string;
  className?: string;
  style?: CSSProperties;
  progressorRef?: RefObject<HTMLSpanElement>;
}

function BalancedTextSpanWrap({ animate, children, className, style, progressorRef }: WrapProps) {
  if (animate) {
    return <BalancedText resize={true} className={className} style={style}
                         progressorRef={progressorRef}><span>{children}</span></BalancedText>;
  }
  return <span className={className} style={style} ref={progressorRef}><span>{children}</span></span>;
}

interface LyricsLineElementProps {
  className: string;
  translationClassName: string;
  line: LyricsKitLyricsLine | null;
  animate: boolean;
  theme: string;
  progressorRef?: RefObject<HTMLSpanElement>;
}

function LyricsLineElement({ className, line, animate, translationClassName, theme, progressorRef }: LyricsLineElementProps) {
  if (!line) return null;

  return (
    <div>
      <div className={className} lang="ja">
        <BalancedTextSpanWrap animate={animate} className="base coverMask">{line.content}</BalancedTextSpanWrap>
        <BalancedTextSpanWrap animate={animate} className={`overlay ${theme}`}
                              progressorRef={progressorRef}>{line.content}</BalancedTextSpanWrap>
      </div>
      {
        line.attachments?.translation && (
          <div lang="zh" className={translationClassName}>
            {animate ? (
              <BalancedText
                resize={true}>{line.attachments.translation}</BalancedText>
            ) : line.attachments.translation}
          </div>
        )
      }
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

  const { playerState, currentFrame, endTime } = usePlainPlayerLyricsState(lyrics, playerRef);

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
        const percentages = lengths.map(v => v / length * 100);
        const tags = currentFrame.data.attachments.timeTag.tags;
        tags.forEach((v, idx) => {
          const duration = idx > 0 ? v.timeTag - tags[idx - 1].timeTag : v.timeTag;
          const start = idx > 0 ? tags[idx - 1].timeTag : 0;
          let percentage = 0;
          if (v.index > 0) percentage = percentages[v.index - 1];
          tl.to(progressorRef.current, {
            backgroundSize: `${percentage}% 100%`,
            ease: "none",
            duration
          }, start);
        });
      } else {
        tl.fromTo(progressorRef.current, {
          backgroundSize: "0% 100%",
        }, {
          backgroundSize: "100% 100%",
          ease: "none",
          duration,
        });
      }
    }
    timelineRef.current = tl;
  }, [currentFrame, endTime, playerState.state]);

  useEffect(() => {
    if (progressorRef.current) progressorRef.current.style.backgroundSize = "0% 100%";
  }, [currentFrame]);

  // Controls the progress of timeline
  useEffect(() => {
    const timeline = timelineRef.current;
    const now = performance.now();
    const startTime = currentFrame?.start ?? 0;

    if (timeline) {
      if (playerState.state === "playing") {
        const inlineProgress = (now - playerState.startingAt) / 1000 - startTime;
        timeline.seek(inlineProgress);
        timeline.play();
      } else {
        const inlineProgress = playerState.progress - startTime;
        timeline.pause();
        timeline.seek(inlineProgress);
      }
    }
  }, [playerState]);

  const styles = useStyle();

  let lineElement = null;
  if (currentFrame !== null) {
    const animate = endTime - currentFrame.start >= ANIMATION_THRESHOLD;
    lineElement = (<LyricsLineElement
      className={styles.line}
      theme={cover ? "cover" : "underline"}
      translationClassName={clsx(styles.translation, "coverMask")}
      line={currentFrame.data}
      animate={animate}
      progressorRef={progressorRef}
    />);
  }

  return (
    <div className={styles.container}>
      {lineElement}
    </div>
  );
}