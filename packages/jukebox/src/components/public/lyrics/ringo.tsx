import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/api/graphql/types";
import { useAppContext } from "../AppContext";
import { useLyricsState } from "../../../hooks/useLyricsState";
import type { Variants, Transition, TargetAndTransition } from "framer-motion";
import { motion, AnimatePresence } from "framer-motion";
import Balancer from "react-wrap-balancer";
import { cn } from "@lyricova/components/utils";

const ANIMATION_THRESHOLD = 0.25;

const motionDivLineBaseClasses = cn(
  "font-semibold leading-tight text-balance text-[3em] flex flex-col-reverse text-white/40 origin-top-left"
);

const TRANSLATION_LINE_VARIANTS: Variants = {
  current: {
    fontSize: 14 * 5 * 0.6,
  },
  next: {
    fontSize: 14 * 2.5 * 0.8,
  },
  exit: {
    height: 0,
  },
};

const TRANSITION: Transition = {
  duration: 0.1,
  ease: "easeOut",
};

interface LyricsLineElementProps {
  className?: string;
  line: LyricsKitLyricsLine | null;
  offsetIndex: number;
  animate: boolean;
  resize: boolean;
  // sx prop removed as SxMotionDiv is removed
}

function LyricsLineElement({
  className,
  line,
  offsetIndex,
  animate,
}: LyricsLineElementProps) {
  if (!line) return null;
  const transition: Transition = animate ? TRANSITION : { duration: 0 };

  const styles: TargetAndTransition = {
    opacity: 1,
    height: "auto",
    marginBottom: 50,
    // width: resize ? "72.5%" : "100%", // Handled by sx prop before, now needs direct class or style if required
    fontSize: "3em", // Replaced theme calculation with direct value, adjust if needed
    // trans
    transitionEnd: {
      filter: "blur(var(--jukebox-ringo-blur-radius))",
      mixBlendMode: "hard-light",
    },
  };

  if (offsetIndex === 0) {
    // if (resize) {
    //   styles.scale = 1.3;
    // } else {
    // }
    // styles.transitionEnd.filter = "var(--jukebox-cover-filter-brighter)";
    styles.transitionEnd.mixBlendMode = "hard-light";
    styles.color = "rgba(255, 255, 255, 0.7)";
  } else {
    // styles["--jukebox-ringo-blur-radius"] = `${0.4 * Math.abs(offsetIndex)}px`;
    styles.opacity = 0.75;
    styles.transitionEnd.mixBlendMode = "overlay";
    styles.color = "rgba(255, 255, 255, 0.4)";
    if (offsetIndex < 0) {
      styles.height = 35;
    }
  }

  // const translationVariants = resize ? TRANSLATION_LINE_VARIANTS : {
  //   exit: TRANSLATION_LINE_VARIANTS.exit,
  // };
  const translationVariants = {
    exit: TRANSLATION_LINE_VARIANTS.exit,
  };

  return (
    <motion.div
      lang="ja"
      layout
      className={cn(motionDivLineBaseClasses, className)}
      transition={transition}
      animate={styles}
      exit={{
        opacity: 0,
        height: 0,
        marginBottom: 0,
      }}
    >
      <div className="wrapper">
        {animate ? <Balancer>{line.content}</Balancer> : line.content}
        {line.attachments?.translation && (
          <motion.div
            variants={translationVariants}
            transition={transition}
            animate={offsetIndex === 0 ? "current" : "next"}
            exit="exit"
            className="translation"
            lang="zh"
          >
            {animate ? (
              <Balancer>{line.attachments.translation}</Balancer>
            ) : (
              line.attachments.translation
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface Props {
  lyrics: LyricsKitLyrics;
  resize?: boolean;
}

export function RingoLyrics({ lyrics, resize }: Props) {
  const { playerRef } = useAppContext();
  const line = useLyricsState(playerRef, lyrics);

  const lines = lyrics.lines;

  const lineNumber = line || 0;

  const containerStyle: React.CSSProperties = {
    // @ts-expect-error Non-standard properties
    maskBorderImageSource:
      "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    maskBorderImageSlice: "49% 0 fill",
    maskBorderImageWidth: "100px 0",
    WebkitMaskBoxImageSource:
      "linear-gradient(180deg, rgba(0,0,0,0) 0% , rgba(0,0,0,1) 49%, rgba(0,0,0,1) 51%, rgba(0,0,0,0) 100%)",
    WebkitMaskBoxImageSlice: "49% 0 fill",
    WebkitMaskBoxImageWidth: "35px 0 50%",
  };

  return (
    <motion.div
      className="pl-16 w-full h-full flex flex-col justify-start overflow-hidden" // Converted sx to Tailwind
      style={containerStyle} // Kept mask properties as inline style
      transition={{ staggerChildren: 1 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {lineNumber === 0 && (
          <motion.div animate={{ minHeight: 35 }} exit={{ minHeight: 0 }} />
        )}
        {lines.map((l, idx) => {
          if (idx < lineNumber - 1 || idx > lineNumber + 12) return null;
          const animate =
            idx + 1 > lines.length ||
            !lines[idx + 1] ||
            lines[idx + 1].position - l.position >= ANIMATION_THRESHOLD;
          return (
            <LyricsLineElement
              className={cn(resize && "w-[62.5%]")} // Apply width conditionally
              // className="coverMask" // This class seems unused
              line={l}
              key={idx}
              animate={animate}
              resize={resize}
              offsetIndex={line !== null ? idx - line : idx + 1}
            />
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
