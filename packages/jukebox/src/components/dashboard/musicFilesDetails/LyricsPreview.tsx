import {
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
import { safeDuration } from "../../../frontendUtils/safeDuration";
import { useActiveLyrcsRanges } from "../../../hooks/useActiveLyricsRanges";
import { cn } from "@lyricova/components/utils";
import type {
  PlaybackAnimationController,
  PlaybackSnapshot,
} from "../../../hooks/types";
import { useWebAnimationController } from "../../../hooks/useWebAnimationController";
import { readPlaybackSnapshot } from "../../../hooks/useMediaClock";

interface LyricsRowRefs {
  synchronize(snapshot: PlaybackSnapshot): void;
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
  ref,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const animationControllerRef = useRef<PlaybackAnimationController>(null);
  const createAnimation = useCallback(
    (target: HTMLDivElement) => {
      const tags = line.attachments?.timeTag?.tags ?? [];
      const lengths = measureTextWidths(target);
      const length = lengths.at(-1) ?? 0;
      const percentages = lengths.map((value) =>
        length > 0 ? (value / length) * 100 : 0,
      );
      const duration = safeDuration(start, end, 1, { line });
      const keyframes = tags
        .map((tag) => ({
          offset: Math.min(1, Math.max(tag.timeTag / duration, 0)),
          backgroundSize: `${percentages[tag.index - 1] ?? 0}% 100%`,
        }))
        .toSorted((left, right) => left.offset - right.offset);

      return target.animate(keyframes, {
        duration: Math.max(0.1, duration * 1000),
        fill: "forwards",
        id: `background-size-${line.position}`,
      });
    },
    [end, line, start],
  );
  const animationTargetRef = useWebAnimationController(
    animationControllerRef,
    createAnimation,
  );

  useImperativeHandle(ref, () => ({
    synchronize(snapshot) {
      const isInRange =
        start <= snapshot.currentTime && snapshot.currentTime <= end;
      animationControllerRef.current?.synchronize({
        ...snapshot,
        currentTime: snapshot.currentTime - start,
        state: isInRange ? snapshot.state : "paused",
      });
    },
    scrollToCenter() {
      requestAnimationFrame(() =>
        boxRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        }),
      );
    },
  }));

  return (
    <div
      data-active={isActive}
      className={cn(
        "mb-2 text-start text-lg min-h-8 text-muted-foreground group/lyrics-row",
        isActive && "text-foreground font-medium",
        line.attachments.role % 3 === 1 && "text-end",
        line.attachments.role % 3 === 2 && "text-center",
        line.attachments.minor && "text-base opacity-75",
      )}
      ref={boxRef}
    >
      <div
        ref={animationTargetRef}
        className="furigana group-data-[active=true]/lyrics-row:inline group-data-[active=true]/lyrics-row:bg-linear-to-r group-data-[active=true]/lyrics-row:from-info-foreground/30 group-data-[active=true]/lyrics-row:to-info-foreground/30 group-data-[active=true]/lyrics-row:bg-blend-difference group-data-[active=true]/lyrics-row:bg-no-repeat"
        style={{ backgroundSize: "0% 100%" }}
      >
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
  lyrics: Lyrics | null;
  fileId: number;
  className?: string;
}

export default function LyricsPreview({ lyrics, fileId, className }: Props) {
  const playerRef = useRef<HTMLAudioElement>(null!);
  const containerRef = useRef<HTMLDivElement>(null);

  const { playerState, currentFrame, segments } = useActiveLyrcsRanges(
    lyrics?.lines ?? [],
    playerRef,
  );
  const currentFrameRef = useRef(currentFrame);
  currentFrameRef.current = currentFrame;

  const rowRefs = useRef<(LyricsRowRefs | null)[]>([]);

  // Controls the progress of timeline
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const snapshot = readPlaybackSnapshot(player);
    rowRefs.current.forEach((rowRef) => rowRef?.synchronize(snapshot));
    const activeSegments = currentFrameRef.current?.data.activeSegments ?? [];
    if (activeSegments.length) {
      const lastActiveSegment = activeSegments.at(-1);
      if (lastActiveSegment !== undefined) {
        rowRefs.current[lastActiveSegment]?.scrollToCenter();
      }
    }
  }, [playerState, currentFrame]);

  // Row ref cache to prevent row rerender.
  const rowRefUpdaterCache = useRef<((rowRef: LyricsRowRefs | null) => void)[]>(
    [],
  );
  const rowRefUpdater = useCallback(
    (idx: number) => {
      if (!rowRefUpdaterCache.current[idx]) {
        rowRefUpdaterCache.current[idx] = (rowRef: LyricsRowRefs | null) => {
          rowRefs.current[idx] = rowRef;
          const player = playerRef.current;
          if (rowRef && player) {
            rowRef.synchronize(readPlaybackSnapshot(player));
          }
        };
      }
      return rowRefUpdaterCache.current[idx];
    },
    [playerRef],
  );

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
