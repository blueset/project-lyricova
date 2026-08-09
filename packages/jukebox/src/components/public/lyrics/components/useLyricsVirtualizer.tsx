import type { RefObject } from "react";
import { useMemo } from "react";
import { useContainerSize } from "./useContainerSize";
import { useRowMeasurement } from "./useRowMeasurement";
import { useScrollOffset } from "./useScrollOffset";
import { useRenderRange } from "./useRenderRange";
import {
  buildLyricsLayoutProjection,
  EMPTY_LYRICS_VIEWPORT_PADDING,
  resolveLyricsViewportPadding,
  type LyricsViewportPaddingInput,
} from "./lyricsLayoutProjection";

export interface VirtualizerRowRenderProps {
  index: number;
  absoluteIndex: number;
  top: number;
  isCompacted: boolean;
  isActiveScroll: boolean;
  isUserScrolling: boolean;
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
  rowCount,
  activeRows = [],
  compactActiveRange = false,
  activeRangeViewportPadding = EMPTY_LYRICS_VIEWPORT_PADDING,
}: {
  containerRef: RefObject<HTMLDivElement>;
  startRow: number;
  endRow: number;
  align: "start" | "center" | "end";
  alignAnchor: number;
  estimatedRowHeight: number;
  rowCount: number;
  activeRows?: number[];
  compactActiveRange?: boolean;
  activeRangeViewportPadding?: LyricsViewportPaddingInput;
  rowRenderer: (props: VirtualizerRowRenderProps) => React.ReactNode;
}) {
  startRow = Math.min(rowCount, Math.max(0, startRow));
  endRow = Math.min(rowCount, Math.max(startRow, endRow));

  const containerSize = useContainerSize({ containerRef });
  const { rowRefHandler, rowAccumulateHeight } = useRowMeasurement({
    estimatedRowHeight,
    containerSize,
    rowCount,
  });
  const resolvedViewportPadding = useMemo(
    () =>
      resolveLyricsViewportPadding(activeRangeViewportPadding, {
        width: containerSize.width,
        height: containerSize.height,
      }),
    [activeRangeViewportPadding, containerSize.height, containerSize.width],
  );
  const projection = useMemo(
    () =>
      buildLyricsLayoutProjection({
        rowAccumulateHeight,
        rowCount,
        activeRows,
        rangeEnd: endRow,
        viewportHeight: containerSize.height,
        viewportPadding: resolvedViewportPadding,
        align,
        alignAnchor,
        compact: compactActiveRange,
      }),
    [
      activeRows,
      align,
      alignAnchor,
      compactActiveRange,
      containerSize.height,
      endRow,
      resolvedViewportPadding,
      rowAccumulateHeight,
      rowCount,
    ],
  );
  const followsExactActiveRange =
    compactActiveRange &&
    projection.isRangeOverflowing &&
    projection.activeRows.length > 0;
  const autoStartRow = followsExactActiveRange
    ? projection.activeStartSlot
    : startRow;
  const autoEndRow = followsExactActiveRange
    ? projection.activeEndSlot
    : endRow;

  const {
    scrollOffset,
    naturalScrollOffset,
    scrollContentHeight,
    isActiveScroll,
    isUserScrolling,
    isAutoFollow,
  } = useScrollOffset({
    containerRef,
    containerSize,
    rowAccumulateHeight,
    autoRowAccumulateHeight: projection.rowAccumulateHeight,
    startRow,
    endRow,
    autoStartRow,
    autoEndRow,
    align,
    alignAnchor,
    viewportPadding: resolvedViewportPadding,
    ensureAutoRangeVisible: followsExactActiveRange,
    autoOverflowRow: projection.newestActiveSlot,
    autoToNaturalCoordinate: projection.toNaturalCoordinate,
  });

  const naturalRows = useMemo(
    () => Array.from({ length: rowCount }, (_, index) => index),
    [rowCount],
  );
  const layoutRows = isAutoFollow ? projection.rows : naturalRows;
  const layoutAccumulateHeight = isAutoFollow
    ? projection.rowAccumulateHeight
    : rowAccumulateHeight;
  const { renderStartRow, renderEndRow } = useRenderRange({
    scrollOffset,
    rowAccumulateHeight: layoutAccumulateHeight,
    containerSize,
  });
  const {
    renderStartRow: naturalRenderStartRow,
    renderEndRow: naturalRenderEndRow,
  } = useRenderRange({
    scrollOffset: naturalScrollOffset,
    rowAccumulateHeight,
    containerSize,
  });
  const compactedRows = useMemo(
    () => new Set(projection.compactedRows),
    [projection.compactedRows],
  );

  const renderedRows = useMemo(() => {
    const renderedRows = [];
    const absoluteIndexFor = (sourceRow: number) =>
      sourceRow < startRow
        ? sourceRow - startRow
        : sourceRow >= endRow
          ? sourceRow - endRow + 1
          : 0;

    if (isAutoFollow && compactedRows.size > 0) {
      for (
        let sourceRow = naturalRenderStartRow;
        sourceRow < naturalRenderEndRow;
        sourceRow++
      ) {
        if (!compactedRows.has(sourceRow)) continue;
        renderedRows.push(
          rowRenderer({
            index: sourceRow,
            absoluteIndex: absoluteIndexFor(sourceRow),
            top: (projection.rowTopBySource[sourceRow] ?? 0) - scrollOffset,
            isCompacted: true,
            isActiveScroll,
            isUserScrolling,
            rowRefHandler: rowRefHandler(sourceRow),
          }),
        );
      }
    }

    for (let slot = renderStartRow; slot < renderEndRow; slot++) {
      const sourceRow = layoutRows[slot];
      if (sourceRow === undefined) continue;
      renderedRows.push(
        rowRenderer({
          index: sourceRow,
          absoluteIndex: absoluteIndexFor(sourceRow),
          top: (layoutAccumulateHeight[slot] ?? 0) - scrollOffset,
          isCompacted: false,
          isActiveScroll,
          isUserScrolling,
          rowRefHandler: rowRefHandler(sourceRow),
        }),
      );
    }
    return renderedRows;
  }, [
    renderStartRow,
    renderEndRow,
    naturalRenderStartRow,
    naturalRenderEndRow,
    rowRenderer,
    startRow,
    endRow,
    layoutAccumulateHeight,
    layoutRows,
    projection.rowTopBySource,
    scrollOffset,
    compactedRows,
    isAutoFollow,
    isActiveScroll,
    isUserScrolling,
    rowRefHandler,
  ]);

  return {
    renderedRows,
    scrollContentHeight,
    scrollViewportHeight: containerSize.height,
    isActiveScroll,
    isUserScrolling,
  };
}
