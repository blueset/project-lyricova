import React, {
  useRef,
} from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { useActiveLyrcsRange } from "./useActiveLyricsRange";
import { useAppContext } from "../../AppContext";
import { useLyricsVirtualizer } from "./useLyricsVirtualizer";

export interface RowRendererProps<T> {
  row: T;
  isActive?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  top: number;
}

export interface LyricsVirtualizerProps<T> {
  children: (props: RowRendererProps<T>) => React.ReactNode;
  rows: T[];
  estimatedRowHeight?: number;
  align?: "start" | "center" | "end";
  /** Align anchor, between 0 and 1 inclusive. */
  alignAnchor?: number;
}

export function LyricsVirtualizer({
  children: rowRenderer,
  rows,
  estimatedRowHeight = 20,
  align = "center",
  alignAnchor = 0.5,
}: LyricsVirtualizerProps<LyricsKitLyricsLine>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { playerRef } = useAppContext();
  const activeRange = useActiveLyrcsRange(rows, playerRef);
  const endRow = activeRange.currentFrame?.data?.rangeEnd ?? 1;
  const startRow = activeRange.currentFrame?.data?.rangeStart ?? 0;
  // console.log("LyricsVirtualizer", startRow, endRow, activeRange.currentFrame?.data?.activeSegments.join(", "));
  const renderedRows = useLyricsVirtualizer({
    containerRef,
    startRow,
    endRow,
    align,
    alignAnchor,
    rowRenderer: ({index, top, rowRefHandler}) => rowRenderer({
      row: rows[index],
      ref: rowRefHandler,
      top: top,
      isActive: activeRange.currentFrame?.data?.activeSegments.includes(index),
    }),
    estimatedRowHeight,
    rowCount: rows.length,
  });

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", overflow: "clip" }}
      ref={containerRef}
    >
      {activeRange.currentFrame?.data?.activeSegments.join(", ")} {"->"} ({endRow})
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <div>a</div>
      </div>
      {renderedRows}
    </div>
  );
}
