import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContainerSize } from "./useContainerSize";
import { useRowMeasurement } from "./useRowMeasurement";
import { useScrollOffset } from "./useScrollOffset";
import { useRenderRange } from "./useRenderRange";

export interface VirtualizerRowRenderProps {
  index: number;
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
  const renderedRowsRef = useRef<React.ReactNode[]>([]);

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

  useEffect(() => {
    renderedRowsRef.current = [];
    for (let i = renderStartRow; i < renderEndRow; i++) {
      renderedRowsRef.current.push(
        rowRenderer({
          index: i,
          top: rowAccumulateHeight[i] - scrollOffset,
          rowRefHandler: rowRefHandler(i),
        })
      );
    }
  }, [renderStartRow, renderEndRow, rowAccumulateHeight, scrollOffset, rowRenderer, rowRefHandler]);

  return renderedRowsRef.current;
}
