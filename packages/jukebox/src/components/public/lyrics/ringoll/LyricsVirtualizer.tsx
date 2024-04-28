import React, {
  useCallback,
  useEffect,
  useRef,
} from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { type LyricsSegment, useActiveLyrcsRanges } from "../../../../hooks/useActiveLyricsRanges";
import { useAppContext } from "../../AppContext";
import { VirtualizerRowRenderProps, useLyricsVirtualizer } from "./useLyricsVirtualizer";
import { usePlayerState } from "../../../../hooks/usePlayerState";
import { LyricsAnimationRef } from "./AnimationRef.type";

export interface RowRendererProps<T> {
  row: T;
  segment: LyricsSegment;
  isActive?: boolean;
  isActiveScroll?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  top: number;
  absoluteIndex: number;
  animationRef?: React.Ref<LyricsAnimationRef>;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export interface LyricsVirtualizerProps<T> {
  children: (props: RowRendererProps<T>) => React.ReactNode;
  rows: T[];
  estimatedRowHeight?: number;
  align?: "start" | "center" | "end";
  /** Align anchor, between 0 and 1 inclusive. */
  alignAnchor?: number;
  containerAs?: React.ElementType;
}

export function LyricsVirtualizer({
  children: rowRenderer,
  rows,
  estimatedRowHeight = 20,
  align = "center",
  alignAnchor = 0.5,
  containerAs: ContainerAs = "div",
}: LyricsVirtualizerProps<LyricsKitLyricsLine>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { playerRef } = useAppContext();
  const { currentFrame, segments, playerState } = useActiveLyrcsRanges(rows, playerRef);
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;

  useEffect(() => {
    if (playerState.state === "playing") {
      const currentTime = (performance.now() - playerState.startingAt) / playerState.rate / 1000;
      animationRefs.current.forEach((ref) => {
        if (ref) {
          ref.resume(currentTime);
        }
      });
    } else {
      animationRefs.current.forEach((ref) => {
        if (ref) {
          ref.pause(playerState.progress);
        }
      });
    }
  }, [playerState]);

  const endRow = currentFrame?.data?.rangeEnd ?? 0;
  const startRow = currentFrame?.data?.rangeStart ?? 0;
  const activeSegmentsRef = useRef<number[]>([]);
  activeSegmentsRef.current = currentFrame?.data?.activeSegments ?? [];
  const animationRefs = useRef<LyricsAnimationRef[]>([]);
  const setRef = useCallback((index: number) => (ref?: LyricsAnimationRef) => {
    if (animationRefs.current[index] === ref) return;
    animationRefs.current[index] = ref;
    if (ref) {
      if (playerStateRef.current.state === "playing") {
        const currentTime = (performance.now() - playerStateRef.current.startingAt) / playerStateRef.current.rate / 1000;
        ref.resume(currentTime);
      } else {
        ref.pause(playerStateRef.current.progress);
      }
    }
  }, []);

  const virtualizerRowRender = useCallback(({index, absoluteIndex, top, rowRefHandler, isActiveScroll}: VirtualizerRowRenderProps) => rowRenderer({
    row: rows[index],
    segment: segments[index],
    ref: rowRefHandler,
    top,
    absoluteIndex,
    isActiveScroll,
    isActive: activeSegmentsRef.current.includes(index),
    animationRef: setRef(index),
    onClick: () => {
      if (playerRef.current && segments[index]?.start) {
        playerRef.current.currentTime = segments[index].start;
      }
    },
  }), [playerRef, rowRenderer, rows, segments, setRef]);

  const { renderedRows, isActiveScroll } = useLyricsVirtualizer({
    containerRef,
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
    >
      {renderedRows}
    </ContainerAs>
  );
}
