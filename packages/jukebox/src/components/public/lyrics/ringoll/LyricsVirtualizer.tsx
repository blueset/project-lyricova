import React, {
  useCallback,
  useRef,
} from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { useActiveLyrcsRange } from "./useActiveLyricsRange";
import { useAppContext } from "../../AppContext";
import { VirtualizerRowRenderProps, useLyricsVirtualizer } from "./useLyricsVirtualizer";
import { usePlayerStateRAF } from "../../../../frontendUtils/hooks";

export interface RowRendererProps<T> {
  row: T;
  isActive?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  top: number;
  absoluteIndex: number;
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
  const activeRange = useActiveLyrcsRange(rows, playerRef);
  const endRow = activeRange.currentFrame?.data?.rangeEnd ?? 1;
  const startRow = activeRange.currentFrame?.data?.rangeStart ?? 0;
  const activeSegmentsRef = useRef<number[]>([]);
  activeSegmentsRef.current = activeRange.currentFrame?.data?.activeSegments ?? [];

  const virtualizerRowRender = useCallback(({index, absoluteIndex, top, rowRefHandler}: VirtualizerRowRenderProps) => rowRenderer({
    row: rows[index],
    ref: rowRefHandler,
    top,
    absoluteIndex,
  }), [rowRenderer, rows]);

  const renderedRows = useLyricsVirtualizer({
    containerRef,
    startRow,
    endRow,
    align,
    alignAnchor,
    rowRenderer: virtualizerRowRender,
    estimatedRowHeight,
    rowCount: rows.length,
  });

  const frameCallback = useCallback((time: number) => {
    if (containerRef.current) {
      containerRef.current.style.setProperty("--lyrics-time", `${Math.round(time * 1000)}`);
    }
  }, []);

  usePlayerStateRAF(playerRef, frameCallback);

  return (
    <ContainerAs
      ref={containerRef}
    >
      {renderedRows}
    </ContainerAs>
  );
}
