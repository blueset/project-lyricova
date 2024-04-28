import {
  Ref,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { Lyrics, LyricsLine } from "lyrics-kit/core";
import FuriganaLyricsLine from "../../FuriganaLyricsLine";
import { measureTextWidths } from "../../../frontendUtils/measure";
import { Box, styled } from "@mui/material";
import { useActiveLyrcsRanges } from "../../../hooks/useActiveLyricsRanges";
import { FullWidthAudio } from "./FullWIdthAudio";

const TranslationRow = styled("div")({
  fontSize: "0.8em",
});

interface LyricsRowRefs {
  resume(time: number): void;
  pause(time: number): void;
  scrollToCenter(): void;
}

type LyricsRowProps = { line: LyricsLine; isActive?: boolean, start?: number, end?: number };

const LyricsRow = forwardRef<LyricsRowRefs, LyricsRowProps>(function LyricsRow({ line, isActive, start = 0, end = 1e100 }, ref) {
  const boxRef = useRef<HTMLDivElement>();
  const webAnimationRef = useRef<Animation>(null);

  useImperativeHandle(ref, () => ({
    resume(time: number) {
      if (webAnimationRef.current && start <= time && time <= end) {
        webAnimationRef.current.currentTime = (time - start) * 1000;
        webAnimationRef.current.play();
      }
    },
    pause(time: number) {
      if (webAnimationRef.current) {
        if (start <= time && time <= end) {
          webAnimationRef.current.currentTime = (time - start) * 1000;
        }
        webAnimationRef.current.pause();
      }
    },
    scrollToCenter() {
      requestAnimationFrame(() => boxRef.current.scrollIntoView({
        block: "center",
        behavior: "smooth",
      }));
    },
  }));

  return (
    <Box
      sx={[
        {
          color: "text.secondary",
          marginBottom: 2,
          textAlign: "center",
          fontSize: "1rem",
          minHeight: "1.5em",
        },
        isActive && {
          color: "secondary.main",
          fontWeight: "bold",
          "& > .furigana": {
            display: "inline",
            backgroundImage: "linear-gradient(0deg, #923cbd, #923cbd)",
            backgroundBlendMode: "difference",
            backgroundRepeat: "no-repeat",
            backgroundSize: "0% 100%",
          },
        },
      ]}
      ref={(elm: HTMLDivElement) => {
        if (!elm || boxRef.current === elm) return;
        console.log("called row ref", elm);
        boxRef.current = elm;
        const tags = line?.attachments?.timeTag?.tags;
        if (elm && tags?.length) {
          const target = elm.querySelector(".furigana") as HTMLDivElement;
          target.style.backgroundSize = "0% 100%";
          const lengths = measureTextWidths(target);
          const length = lengths.at(-1);
          const percentages = lengths.map((v) => (v / length) * 100);
          const duration = end - start;
          const keyframes = tags.map((v) => ({
            offset: Math.min(1, Math.max(v.timeTag / duration, 0)),
            backgroundSize: `${percentages[v.index - 1] ?? 0}% 100%`,
          }));

          webAnimationRef.current = target.animate(keyframes, {
            duration: duration * 1000,
            fill: "forwards",
            id: `background-size-${line.position}`
          });
          webAnimationRef.current.pause();
        }
      }}
    >
      <div className="furigana">
        <FuriganaLyricsLine lyricsKitLine={line} />
      </div>
      <TranslationRow>{line.attachments.translation()}</TranslationRow>
    </Box>
  );
})
const LyricsRowMemo = memo(LyricsRow, (prev, next) => {
  return prev.line === next.line && !!prev.isActive === !!next.isActive && prev.start === next.start && prev.end === next.end;
});

LyricsRowMemo.displayName = "LyricsRowMemo";

interface Props {
  lyrics: Lyrics;
  fileId: number;
}

export default function LyricsPreview({ lyrics, fileId }: Props) {
  const playerRef = useRef<HTMLAudioElement>();
  const containerRef = useRef<HTMLDivElement>();
  
  const { playerState, currentFrame, segments } = useActiveLyrcsRanges(
    lyrics.lines,
    playerRef
  );
  const currentFrameRef = useRef(currentFrame);
  currentFrameRef.current = currentFrame;

  const rowRefs = useRef<LyricsRowRefs[]>([]);

  // Controls the progress of timeline
  useEffect(() => {
    const activeSegments = currentFrameRef.current?.data.activeSegments ?? [];
    activeSegments.forEach((idx) => {
      if (playerState.state === "playing") {
        const now = performance.now();
        const progress = (now - playerState.startingAt) / 1000;
        rowRefs.current[idx]?.resume(progress);
      } else {
        rowRefs.current[idx]?.pause(playerState.progress);
      }
    });
    if (activeSegments.length) {
      rowRefs.current[activeSegments.at(-1)]?.scrollToCenter();
    }
  }, [playerState, currentFrame]);

  // Row ref cache to prevent row rerender.
  const rowRefUpdaterCache = useRef<((r: LyricsRowRefs) => void)[]>([]);
  const rowRefUpdater = useCallback((idx: number) => {
    if (!rowRefUpdaterCache.current[idx]) {
      rowRefUpdaterCache.current[idx] = (r: LyricsRowRefs) => {
        rowRefs.current[idx] = r;
      };
    }
    return rowRefUpdaterCache.current[idx];
   }, []);

  return (
    <div>
      <FullWidthAudio
        ref={playerRef}
        src={`/api/files/${fileId}/file`}
        controls
      />
      <Box
        sx={{
          height: "calc(100vh - 15rem)",
          overflow: "scroll",
          "&:before, &:after": {
            content: '""',
            height: "50%",
            display: "block",
          },
        }}
        ref={containerRef}
      >
        {(lyrics?.lines ?? []).map((v, idx) => (
          <LyricsRowMemo
            key={idx}
            line={v}
            start={segments[idx]?.start}
            end={segments[idx]?.end}
            isActive={currentFrame?.data.activeSegments.includes(idx)}
            ref={rowRefUpdater(idx)}
          />
        ))}
      </Box>
    </div>
  );
}
