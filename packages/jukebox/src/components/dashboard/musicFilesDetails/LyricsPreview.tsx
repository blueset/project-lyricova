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
import { useActiveLyrcsRanges } from "../../../hooks/useActiveLyricsRanges";
import { cn } from "@lyricova/components/utils";

interface LyricsRowRefs {
  resume(time: number): void;
  pause(time: number): void;
  scrollToCenter(): void;
}

type LyricsRowProps = {
  line: LyricsLine;
  isActive?: boolean;
  start?: number;
  end?: number;
};

const LyricsRow = forwardRef<LyricsRowRefs, LyricsRowProps>(function LyricsRow(
  { line, isActive, start = 0, end = 1e100 },
  ref
) {
  const boxRef = useRef<HTMLDivElement>(null);
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
      requestAnimationFrame(() =>
        boxRef.current.scrollIntoView({
          block: "center",
          behavior: "smooth",
        })
      );
    },
  }));

  return (
    <div
      data-active={isActive}
      className={cn(
        "mb-8 text-start text-lg min-h-8 text-muted-foreground group/lyrics-row",
        isActive && "text-foreground font-medium",
        line.attachments.role % 3 === 1 && "text-end",
        line.attachments.role % 3 === 2 && "text-center",
        line.attachments.minor && "text-base opacity-75"
      )}
      ref={(elm: HTMLDivElement) => {
        if (!elm || boxRef.current === elm) return;
        boxRef.current = elm;
        const tags = line?.attachments?.timeTag?.tags;
        if (elm && tags?.length) {
          const target = elm.querySelector(".furigana") as HTMLDivElement;
          target.style.backgroundSize = "0% 100%";
          const lengths = measureTextWidths(target);
          const length = lengths.at(-1);
          const percentages = lengths.map((v) => (v / length) * 100);
          const duration = Math.max(end - start, 1);
          const keyframes = tags.map((v) => ({
            offset: Math.min(1, Math.max(v.timeTag / duration, 0)),
            backgroundSize: `${percentages[v.index - 1] ?? 0}% 100%`,
          }));
          keyframes.sort((a, b) => a.offset - b.offset);

          webAnimationRef.current = target.animate(keyframes, {
            duration: duration * 1000,
            fill: "forwards",
            id: `background-size-${line.position}`,
          });
          webAnimationRef.current.pause();
        }
      }}
    >
      <div className="furigana group-data-[active=true]/lyrics-row:inline group-data-[active=true]/lyrics-row:bg-linear-to-r group-data-[active=true]/lyrics-row:from-info-foreground/30 group-data-[active=true]/lyrics-row:to-info-foreground/30 group-data-[active=true]/lyrics-row:bg-blend-difference group-data-[active=true]/lyrics-row:bg-no-repeat group-data-[active=true]/lyrics-row:bg-size-[0%_100%]">
        <FuriganaLyricsLine lyricsKitLine={line} />
      </div>
      {Object.entries(line.attachments.translations).map(([lang, content]) => (
        <div key={lang} lang={lang} className="text-sm">
          <span
            lang="en"
            className="inline-block border border-y-0 border-solid border-accent-foreground text-accent-foreground font-mono py-0 px-1 uppercase text-sm rounded-sm mr-2"
          >
            {lang || "-"}
          </span>
          {content}
        </div>
      ))}
    </div>
  );
});

const LyricsRowMemo = memo(LyricsRow, (prev, next) => {
  return (
    prev.line === next.line &&
    !!prev.isActive === !!next.isActive &&
    prev.start === next.start &&
    prev.end === next.end
  );
});

LyricsRowMemo.displayName = "LyricsRowMemo";

interface Props {
  lyrics: Lyrics;
  fileId: number;
  className?: string;
}

export default function LyricsPreview({ lyrics, fileId, className }: Props) {
  const playerRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { playerState, currentFrame, segments } = useActiveLyrcsRanges(
    lyrics?.lines ?? [],
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
    <div className={cn("h-[calc(100vh-10rem)] flex flex-col", className)}>
      <audio
        className="w-full"
        ref={playerRef}
        src={`/api/files/${fileId}/file`}
        controls
      />
      <div
        className="grow basis-0 overflow-y-scroll px-[calc(50%-30ch)] before:h-1/2 before:block after:content-[''] after:h-1/2 after:block"
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
      </div>
    </div>
  );
}
