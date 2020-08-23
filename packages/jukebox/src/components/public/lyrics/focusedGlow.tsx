import { LyricsKitLyrics, LyricsKitLyricsLine } from "../../../graphql/LyricsKitObjects";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core";
import { motion, Transition } from "framer-motion";
import BalancedText from "react-balance-text-cj";
import _ from "lodash";
import clsx from "clsx";

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
      fontWeight: 200,
      lineHeight: 1.2,
      textWrap: "balance",
      fontSize: "4em",
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      color: "white",
      fontFamily: theme.typography.fontFamily.replace("FiraGO", "\"FiraGO UltraLight\""),
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
        animation: "$lyricsGlowEffect 20s linear infinite alternate",
      },
    },
    "@keyframes lyricsGlowEffect": {
      from: {
        maskPosition: "0 1024px",
      },
      to: {
        maskPosition: "1024px 0",
      },
    },
  };
});


const TRANSITION: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className: string;
  line: LyricsKitLyricsLine | null;
  animate: boolean;
}


function LyricsLineElement({ className, line, animate }: LyricsLineElementProps) {
  if (!line) return null;
  const transition = animate ? TRANSITION : { duration: 0 };
  const content = <>
    {
      animate ? (
        <BalancedText
          resize={true} > {line.content}</BalancedText>
      ) : line.content}
    {
      line.attachments?.translation && (
        <div className="translate"
          lang="zh">
          {animate ? (
            <BalancedText
              resize={true}>{line.attachments.translation}</BalancedText>
          ) : line.attachments.translation}
        </div>
      )
    }
  </>;

  return (
    <motion.div
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
    >
      <div className="overlay">{content}</div>
      <div className="text">{content}</div>
    </motion.div >
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  blur?: boolean;
}

export function FocusedGlowLyrics({ lyrics }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const styles = useStyle();

  const lines = lyrics.lines;

  return (
    <motion.div className={styles.container}>
      {line !== null && lines.map((l, idx) => {
        if (idx < line || idx > line) return null;
        const animate =
          (idx + 1 > lines.length) || (!lines[idx + 1]) ||
          (lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD);
        return (
          <LyricsLineElement
            className={styles.line}
            line={l}
            key={idx}
            animate={animate} />);
      })}
    </motion.div>
  );
}