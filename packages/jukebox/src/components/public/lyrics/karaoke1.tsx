import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { motion, Transition, MotionConfig } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";
import { CSSProperties } from "react";

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
        backgroundSize: "20% 100%",
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
            transparent 10%,
            white 10%,
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
}

function BalancedTextSpanWrap({ animate, children, className, style }: WrapProps) {
  if (animate) {
    return <BalancedText resize={true} className={className} style={style}>{children}</BalancedText>;
  }
  return <span className={className} style={style}>{children}</span>;
}

interface LyricsLineElementProps {
  className: string;
  translationClassName: string;
  line: LyricsKitLyricsLine | null;
  animate: boolean;
  theme: string;
  progress: number;
}


function LyricsLineElement({ className, line, animate, translationClassName, progress, theme }: LyricsLineElementProps) {
  if (!line) return null;

  return (
    <div>
      <div className={className} lang="ja">
        <BalancedTextSpanWrap animate={animate} className="base coverMask">{line.content}</BalancedTextSpanWrap>
        <BalancedTextSpanWrap animate={animate} className={`overlay ${theme}`} style={{
          backgroundSize: `${(progress ?? 1) * 100}% 100%`,
        }}>{line.content}</BalancedTextSpanWrap>
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
  const [line, percentage] = useLyricsState(playerRef, lyrics, { usePercentage: true });

  const styles = useStyle();

  const lines = lyrics.lines;

  let lineElement = null;
  if (line !== null) {
    const animate =
      (line + 1 > lines.length) || (!lines[line + 1]) ||
      (lines[line + 1].position - lines[line].position >= ANIMATION_THRESHOLD);
    lineElement = (<LyricsLineElement
      className={styles.line}
      theme={cover ? "cover" : "underline"}
      translationClassName={clsx(styles.translation, "coverMask")}
      line={lines[line]}
      animate={animate}
      progress={percentage}
    />);
  }

  return (
    <div className={styles.container}>
      {lineElement}
    </div>
  );
}