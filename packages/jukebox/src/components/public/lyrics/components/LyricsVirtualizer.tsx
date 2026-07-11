import type React from "react";
import { useCallback, useEffect, useRef } from "react";
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
}

export function LyricsVirtualizer({
  children: rowRenderer,
  rows,
  estimatedRowHeight = 20,
  align = "center",
  alignAnchor = 0.5,
  containerAs: ContainerAs = "div",
  containerProps = {},
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

  const { renderedRows, isActiveScroll } = useLyricsVirtualizer({
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
    <ContainerAs
      ref={containerRef}
      isActiveScroll={isActiveScroll}
      {...containerProps}
    >
      {renderedRows}
    </ContainerAs>
  );
}
