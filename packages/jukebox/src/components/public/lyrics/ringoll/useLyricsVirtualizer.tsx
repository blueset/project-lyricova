import { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useContainerSize } from "./useContainerSize";
import { useRowMeasurement } from "./useRowMeasurement";
import { useScrollOffset } from "./useScrollOffset";
import { useRenderRange } from "./useRenderRange";

export interface VirtualizerRowRenderProps {
  index: number;
  absoluteIndex: number;
  top: number;
  rowRefHandler: (el: HTMLElement) => void;
}

export function useLyricsVirtualizer({
  containerRef,
  startRow,
  endRow,
  align,
  alignAnchor,
  rowRenderer,
  estimatedRowHeight,
  rowCount
}: {
  containerRef: RefObject<HTMLDivElement>;
  startRow: number;
  endRow: number;
  align: "start" | "center" | "end";
  alignAnchor: number;
  estimatedRowHeight: number;
  rowCount: number;
  rowRenderer: (props: VirtualizerRowRenderProps) => React.ReactNode;
}) {
  // const renderedRowsRef = useRef<React.ReactNode[]>([]);
  startRow = Math.max(0, startRow);
  endRow = Math.min(rowCount + 1, endRow);

  const containerSize = useContainerSize({ containerRef });
  const { rowRefHandler, rowAccumulateHeight } = useRowMeasurement({
    estimatedRowHeight,
    rowCount,
  });
  const scrollOffset = useScrollOffset({
    containerSize,
    rowAccumulateHeight,
    startRow,
    endRow,
    align,
    alignAnchor,
  });
  const { renderStartRow, renderEndRow } = useRenderRange({
    scrollOffset,
    rowAccumulateHeight,
    containerSize,
  });

  return useMemo(() => {
    const renderedRows = [];
    for (let i = renderStartRow; i < renderEndRow; i++) {
      renderedRows.push(
        rowRenderer({
          index: i,
          absoluteIndex: i < startRow ? i - startRow : i >= endRow ? i - endRow + 1 : 0,
          top: rowAccumulateHeight[i] - scrollOffset,
          rowRefHandler: rowRefHandler(i),
        })
      );
    }
    return renderedRows;
  }, [renderStartRow, renderEndRow, rowRenderer, startRow, endRow, rowAccumulateHeight, scrollOffset, rowRefHandler]);

  // return renderedRowsRef.current;
}
