export interface LyricsViewportPadding {
  top?: number;
  bottom?: number;
}

export interface LyricsViewportSize {
  width: number;
  height: number;
}

export type LyricsViewportPaddingInput =
  | LyricsViewportPadding
  | ((viewport: LyricsViewportSize) => LyricsViewportPadding);

export const EMPTY_LYRICS_VIEWPORT_PADDING: LyricsViewportPadding = {};

export function resolveLyricsViewportPadding(
  input: LyricsViewportPaddingInput | undefined,
  viewport: LyricsViewportSize,
): LyricsViewportPadding {
  return typeof input === "function"
    ? input(viewport)
    : (input ?? EMPTY_LYRICS_VIEWPORT_PADDING);
}

export interface LyricsLayoutProjection {
  rows: number[];
  compactedRows: number[];
  rowAccumulateHeight: number[];
  rowTopBySource: number[];
  activeRows: number[];
  activeStartSlot: number;
  activeEndSlot: number;
  newestActiveSlot: number;
  isRangeOverflowing: boolean;
  isCompacted: boolean;
  toNaturalCoordinate: (coordinate: number) => number;
}

const VIEWPORT_FIT_TOLERANCE_PX = 1;

function projectedSlotAtCoordinate(
  rowAccumulateHeight: number[],
  coordinate: number,
): number {
  const rowCount = Math.max(0, rowAccumulateHeight.length - 1);
  let left = 0;
  let right = rowCount - 1;
  let result = 0;

  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    if (rowAccumulateHeight[middle]! <= coordinate) {
      result = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return result;
}

/**
 * Build the visual row order used while lyrics auto-follow playback.
 *
 * Natural accumulated heights remain the source of truth. Compact mode only
 * removes inactive source rows after the first active row and before the
 * cumulative playback frontier. That frontier keeps already-passed overlap
 * rows compacted during short gaps between adjacent lines. Compaction is only
 * applied when the natural frontier is taller than the current viewport.
 */
export function buildLyricsLayoutProjection({
  rowAccumulateHeight,
  rowCount,
  activeRows,
  rangeEnd,
  viewportHeight,
  viewportPadding = {},
  align = "start",
  alignAnchor = 0,
  compact,
}: {
  rowAccumulateHeight: number[];
  rowCount: number;
  activeRows: number[];
  rangeEnd: number;
  viewportHeight: number;
  viewportPadding?: LyricsViewportPadding;
  align?: "start" | "center" | "end";
  alignAnchor?: number;
  compact: boolean;
}): LyricsLayoutProjection {
  const activationOrder: number[] = [];
  const seenActiveRows = new Set<number>();
  activeRows.forEach((row) => {
    if (
      Number.isInteger(row) &&
      row >= 0 &&
      row < rowCount &&
      !seenActiveRows.has(row)
    ) {
      seenActiveRows.add(row);
      activationOrder.push(row);
    }
  });

  const activeRowsInDocumentOrder = activationOrder.toSorted((a, b) => a - b);
  const activeStart = activeRowsInDocumentOrder.at(0);
  const activeEnd = activeRowsInDocumentOrder.at(-1);
  const compactionEnd =
    activeEnd === undefined
      ? 0
      : Math.min(rowCount, Math.max(activeEnd + 1, Math.trunc(rangeEnd) || 0));
  const hasInactiveGap =
    activeStart !== undefined &&
    compactionEnd > activeStart + 1 &&
    Array.from(
      { length: compactionEnd - activeStart - 1 },
      (_, index) => activeStart + index + 1,
    ).some((sourceRow) => !seenActiveRows.has(sourceRow));
  const naturalRangeHeight =
    activeStart === undefined
      ? 0
      : (rowAccumulateHeight[compactionEnd] ?? 0) -
        (rowAccumulateHeight[activeStart] ?? 0);
  const paddingTop =
    Number.isFinite(viewportPadding.top) && viewportPadding.top! > 0
      ? viewportPadding.top!
      : 0;
  const paddingBottom =
    Number.isFinite(viewportPadding.bottom) && viewportPadding.bottom! > 0
      ? viewportPadding.bottom!
      : 0;
  const anchorOffset =
    viewportHeight * (Number.isFinite(alignAnchor) ? alignAnchor : 0);
  const preferredRangeTop =
    align === "start"
      ? anchorOffset
      : align === "center"
        ? anchorOffset - naturalRangeHeight / 2
        : anchorOffset - naturalRangeHeight;
  const preferredRangeBottom = preferredRangeTop + naturalRangeHeight;
  const isRangeOverflowing =
    viewportHeight > 0 &&
    (preferredRangeTop < paddingTop - VIEWPORT_FIT_TOLERANCE_PX ||
      preferredRangeBottom >
        viewportHeight - paddingBottom + VIEWPORT_FIT_TOLERANCE_PX);
  const shouldCompactRange = compact && hasInactiveGap && isRangeOverflowing;

  const rows: number[] = [];
  const compactedRows: number[] = [];
  for (let sourceRow = 0; sourceRow < rowCount; sourceRow++) {
    const shouldCompact =
      shouldCompactRange &&
      activeStart !== undefined &&
      sourceRow > activeStart &&
      sourceRow < compactionEnd &&
      !seenActiveRows.has(sourceRow);
    if (shouldCompact) {
      compactedRows.push(sourceRow);
    } else {
      rows.push(sourceRow);
    }
  }

  const sourceToSlot = new Array<number>(rowCount).fill(-1);
  const rowTopBySource = new Array<number>(rowCount).fill(0);
  const projectedAccumulateHeight = [0];
  const compactedRowSet = new Set(compactedRows);
  let projectedTop = 0;
  let projectedSlot = 0;
  for (let sourceRow = 0; sourceRow < rowCount; sourceRow++) {
    rowTopBySource[sourceRow] = projectedTop;
    if (compactedRowSet.has(sourceRow)) continue;

    sourceToSlot[sourceRow] = projectedSlot;
    const naturalStart = rowAccumulateHeight[sourceRow] ?? 0;
    const naturalEnd = rowAccumulateHeight[sourceRow + 1] ?? naturalStart;
    const height = Math.max(0, naturalEnd - naturalStart);
    projectedTop += height;
    projectedSlot++;
    projectedAccumulateHeight.push(projectedTop);
  }

  const activeSlots = activeRowsInDocumentOrder
    .map((sourceRow) => sourceToSlot[sourceRow] ?? -1)
    .filter((slot) => slot >= 0);
  const newestActiveSourceRow = activationOrder.at(-1);
  const newestActiveSlot =
    newestActiveSourceRow === undefined
      ? -1
      : (sourceToSlot[newestActiveSourceRow] ?? -1);

  const projectedHeight = projectedAccumulateHeight.at(-1) ?? 0;
  const naturalHeight = rowAccumulateHeight[rowCount] ?? 0;
  const toNaturalCoordinate = (coordinate: number): number => {
    if (!rows.length || coordinate <= 0) return coordinate;
    if (coordinate >= projectedHeight) {
      return naturalHeight + coordinate - projectedHeight;
    }

    const slot = projectedSlotAtCoordinate(
      projectedAccumulateHeight,
      coordinate,
    );
    const sourceRow = rows[slot] ?? 0;
    const offsetWithinRow = coordinate - (projectedAccumulateHeight[slot] ?? 0);
    return (rowAccumulateHeight[sourceRow] ?? 0) + offsetWithinRow;
  };

  return {
    rows,
    compactedRows,
    rowAccumulateHeight: projectedAccumulateHeight,
    rowTopBySource,
    activeRows: activeRowsInDocumentOrder,
    activeStartSlot: activeSlots.at(0) ?? -1,
    activeEndSlot: activeSlots.length > 0 ? (activeSlots.at(-1) ?? -1) + 1 : -1,
    newestActiveSlot,
    isRangeOverflowing,
    isCompacted: compactedRows.length > 0,
    toNaturalCoordinate,
  };
}
