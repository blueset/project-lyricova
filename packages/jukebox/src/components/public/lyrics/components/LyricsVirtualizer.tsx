import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@lyricova/components/utils";
import type { LyricsKitLyricsLine } from "@lyricova/components/gql/schema";
import {
  lyricsToSegments,
  type LyricsSegment,
  useActiveLyricsSegmentRanges,
} from "../../../../hooks/useActiveLyricsRanges";
import { useAppContext } from "../../AppContext";
import type { VirtualizerRowRenderProps } from "./useLyricsVirtualizer";
import { useLyricsVirtualizer } from "./useLyricsVirtualizer";
import type { LyricsAnimationRef } from "./AnimationRef.type";
import { readPlaybackSnapshot } from "../../../../hooks/useMediaClock";
import type { LyricsViewportPaddingInput } from "./lyricsLayoutProjection";

const EMPTY_ACTIVE_ROWS: number[] = [];

export interface RowRendererProps<T> {
  row: T;
  segment: LyricsSegment;
  isActive?: boolean;
  isCompacted?: boolean;
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
  /**
   * Optional presentation schedule for active-row and scroll timing. Row
   * rendering, click-to-seek, and lyric animation still use the authored
   * timestamps derived from {@link rows}.
   */
  timingSegments?: LyricsSegment[];
  /**
   * In compact mode, overflowing inactive rows inside the cumulative active
   * frontier are removed from layout while auto-follow is enabled. Nearby
   * removed rows stay mounted long enough for the row renderer's compacted
   * state to animate out. Manual scrolling restores the natural document flow.
   */
  activeRangeMode?: "continuous" | "compact";
  /**
   * Layout-specific viewport area reserved around an active range. Compact
   * mode uses these guards both to decide when the natural range overflows and
   * to keep the projected range inside the usable viewport.
   */
  activeRangeViewportPadding?: LyricsViewportPaddingInput;
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
  timingSegments,
  activeRangeMode = "continuous",
  activeRangeViewportPadding,
}: LyricsVirtualizerProps<LyricsKitLyricsLine>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { playerRef } = useAppContext();
  const segments = useMemo(() => lyricsToSegments(rows), [rows]);
  const { currentFrame, playerState } = useActiveLyricsSegmentRanges(
    timingSegments ?? segments,
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
      isCompacted,
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
        isCompacted,
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
    activeRows: activeSegments ?? EMPTY_ACTIVE_ROWS,
    compactActiveRange: activeRangeMode === "compact",
    activeRangeViewportPadding,
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
