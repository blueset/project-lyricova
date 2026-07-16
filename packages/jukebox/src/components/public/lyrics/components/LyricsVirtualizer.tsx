import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@lyricova/components/utils";
import type { LyricsKitLyricsLine } from "@lyricova/components/gql/schema";
import {
  type LyricsSegment,
  useActiveLyrcsRanges,
} from "../../../../hooks/useActiveLyricsRanges";
import { useAppContext } from "../../AppContext";
import type { VirtualizerRowRenderProps } from "./useLyricsVirtualizer";
import { useLyricsVirtualizer } from "./useLyricsVirtualizer";
import type { LyricsAnimationRef } from "./AnimationRef.type";
import { readPlaybackSnapshot } from "../../../../hooks/useMediaClock";

export interface RowRendererProps<T> {
  row: T;
  segment: LyricsSegment;
  isActive?: boolean;
  isActiveScroll?: boolean;
  isUserScrolling?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  top: number;
  transLang?: string;
  absoluteIndex: number;
  animationRef?: React.Ref<LyricsAnimationRef>;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export interface LyricsVirtualizerProps<
  T,
  TELement extends React.ElementType = React.ElementType,
> {
  children: (props: RowRendererProps<T>) => React.ReactNode;
  rows: T[];
  estimatedRowHeight?: number;
  align?: "start" | "center" | "end";
  /** Align anchor, between 0 and 1 inclusive. */
  alignAnchor?: number;
  containerAs?: TELement;
  containerProps?: React.ComponentProps<TELement>;
  viewportClassName?: string;
}

/**
 * Virtualize lyric rows and keep their imperative animations on the media clock.
 *
 * Animation refs are synchronized both when playback changes and when a
 * virtualized row mounts. Clicking a row seeks to its segment start.
 */
export function LyricsVirtualizer({
  children: rowRenderer,
  rows,
  estimatedRowHeight = 20,
  align = "center",
  alignAnchor = 0.5,
  containerAs: ContainerAs = "div",
  containerProps = {},
  viewportClassName,
}: LyricsVirtualizerProps<LyricsKitLyricsLine>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { playerRef } = useAppContext();
  const { currentFrame, segments, playerState } = useActiveLyrcsRanges(
    rows,
    playerRef,
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const snapshot = readPlaybackSnapshot(player);
    animationRefs.current.forEach((animationRef) => {
      animationRef?.synchronize(snapshot);
    });
  }, [currentFrame, playerRef, playerState]);

  const endRow = currentFrame?.data?.rangeEnd ?? 0;
  const startRow = currentFrame?.data?.rangeStart ?? 0;
  const activeSegments = currentFrame?.data?.activeSegments;
  const animationRefs = useRef<(LyricsAnimationRef | null)[]>([]);
  const setRef = useCallback(
    (index: number) => (ref: LyricsAnimationRef | null) => {
      if (animationRefs.current[index] === ref) return;
      animationRefs.current[index] = ref;
      const player = playerRef.current;
      if (ref && player) {
        ref.synchronize(readPlaybackSnapshot(player));
      }
    },
    [playerRef],
  );

  const virtualizerRowRender = useCallback(
    ({
      index,
      absoluteIndex,
      top,
      rowRefHandler,
      isActiveScroll,
      isUserScrolling,
    }: VirtualizerRowRenderProps) =>
      rowRenderer({
        row: rows[index]!,
        segment: segments[index]!,
        ref: (el) => {
          if (el) rowRefHandler(el);
        },
        top,
        absoluteIndex,
        isActiveScroll,
        isUserScrolling,
        isActive: activeSegments?.includes(index) ?? false,
        animationRef: setRef(index),
        onClick: () => {
          const segment = segments[index];
          if (playerRef.current && segment?.start) {
            playerRef.current.currentTime = segment.start;
          }
        },
      }),
    [activeSegments, playerRef, rowRenderer, rows, segments, setRef],
  );

  const {
    renderedRows,
    scrollContentHeight,
    scrollViewportHeight,
    isActiveScroll,
    isUserScrolling,
  } = useLyricsVirtualizer({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    startRow,
    endRow,
    align,
    alignAnchor,
    rowRenderer: virtualizerRowRender,
    estimatedRowHeight,
    rowCount: rows.length,
  });

  return (
    <ContainerAs {...containerProps}>
      <div
        ref={containerRef}
        className="no-scrollbar size-full touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain"
        data-active-scroll={isActiveScroll}
        data-user-scrolling={isUserScrolling}
      >
        <div
          className="relative w-full"
          style={{ height: scrollContentHeight }}
        >
          <div
            className={cn("sticky top-0 w-full", viewportClassName)}
            style={{ height: scrollViewportHeight }}
          >
            {renderedRows}
          </div>
        </div>
      </div>
    </ContainerAs>
  );
}
