import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState, LyricsFrameCallback } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";
import { CSSProperties, useRef, RefObject, useCallback } from "react";

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
    return <BalancedText resize={true} className={className} style={style} progressorRef={progressorRef}>{children}</BalancedText>;
  }
  return <span className={className} style={style} ref={progressorRef}>{children}</span>;
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
        <BalancedTextSpanWrap animate={animate} className={`overlay ${theme}`} progressorRef={progressorRef}>{line.content}</BalancedTextSpanWrap>
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

  const progressCallback = useCallback<LyricsFrameCallback>((thisLine, lyrics, player) => {
    if (progressorRef.current) {
      const progressorSpan = progressorRef.current;
      if (thisLine >= lyrics.lines.length) {
        progressorSpan.style.backgroundSize = "100% 100%";
      } else {
        const time = player.currentTime;
        let endTime = player.duration;
        if (thisLine + 1 < lyrics.lines.length) {
          endTime = lyrics.lines[thisLine + 1].position;
        }
        const percentage = _.clamp((time - lyrics.lines[thisLine].position) / (endTime - lyrics.lines[thisLine].position), 0, 1);
        progressorSpan.style.backgroundSize = `${percentage * 100}% 100%`;
      }
    }
  }, []);

  const line = useLyricsState(playerRef, lyrics, progressCallback);

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
      progressorRef={progressorRef}
    />);
  }

  return (
    <div className={styles.container}>
      {lineElement}
    </div>
  );
}