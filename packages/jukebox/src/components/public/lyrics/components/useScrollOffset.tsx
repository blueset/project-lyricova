import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EMPTY_LYRICS_VIEWPORT_PADDING,
  type LyricsViewportPadding,
} from "./lyricsLayoutProjection";

const AUTO_FOLLOW_RESUME_DELAY = 5000;
const SCROLL_IDLE_DELAY = 150;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function identityCoordinate(coordinate: number) {
  return coordinate;
}

function paddingValue(value: number | undefined) {
  return Number.isFinite(value) && value! > 0 ? value! : 0;
}

function scrollBounds({
  rowAccumulateHeight,
  containerHeight,
  align,
  anchorOffset,
  viewportPadding,
}: {
  rowAccumulateHeight: number[];
  containerHeight: number;
  align: "start" | "center" | "end";
  anchorOffset: number;
  viewportPadding: LyricsViewportPadding;
}) {
  const paddingTop = paddingValue(viewportPadding.top);
  const paddingBottom = paddingValue(viewportPadding.bottom);
  const scrollOffsetMin = -Math.max(anchorOffset, paddingTop);
  const lastRowStart = rowAccumulateHeight.at(-2) ?? 0;
  const contentHeight = rowAccumulateHeight.at(-1) ?? 0;
  const lastAlignedOffset =
    align === "start"
      ? lastRowStart
      : align === "center"
        ? (lastRowStart + contentHeight) / 2
        : contentHeight;
  const scrollOffsetMax = Math.max(
    scrollOffsetMin,
    lastAlignedOffset - anchorOffset,
    contentHeight - (containerHeight - paddingBottom),
  );
  return { scrollOffsetMin, scrollOffsetMax, contentHeight };
}

function alignedOffset({
  startOffset,
  endOffset,
  align,
  anchorOffset,
}: {
  startOffset: number;
  endOffset: number;
  align: "start" | "center" | "end";
  anchorOffset: number;
}) {
  if (align === "start") return startOffset - anchorOffset;
  if (align === "center") {
    return (startOffset + endOffset) / 2 - anchorOffset;
  }
  return endOffset - anchorOffset;
}

export function calculateFollowScrollOffset({
  rowAccumulateHeight,
  containerHeight,
  startRow,
  endRow,
  align,
  alignAnchor,
  viewportPadding = EMPTY_LYRICS_VIEWPORT_PADDING,
  ensureRangeVisible,
  overflowRow,
}: {
  rowAccumulateHeight: number[];
  containerHeight: number;
  startRow: number;
  endRow: number;
  align: "start" | "center" | "end";
  alignAnchor: number;
  viewportPadding?: LyricsViewportPadding;
  ensureRangeVisible: boolean;
  overflowRow: number;
}) {
  const rowCount = Math.max(0, rowAccumulateHeight.length - 1);
  const safeStartRow = clamp(Math.trunc(startRow), 0, rowCount);
  const safeEndRow = clamp(Math.trunc(endRow), safeStartRow, rowCount);
  const anchorOffset = containerHeight * alignAnchor;
  const paddingTop = paddingValue(viewportPadding.top);
  const paddingBottom = paddingValue(viewportPadding.bottom);
  const visibleRangeBottom = containerHeight - paddingBottom;
  const visibleRangeHeight = Math.max(0, visibleRangeBottom - paddingTop);
  const { scrollOffsetMin, scrollOffsetMax } = scrollBounds({
    rowAccumulateHeight,
    containerHeight,
    align,
    anchorOffset,
    viewportPadding,
  });
  const startOffset = rowAccumulateHeight[safeStartRow] ?? 0;
  const endOffset = rowAccumulateHeight[safeEndRow] ?? startOffset;

  let nextScrollOffset = alignedOffset({
    startOffset,
    endOffset,
    align,
    anchorOffset,
  });

  if (ensureRangeVisible && containerHeight > 0 && safeEndRow > safeStartRow) {
    if (endOffset - startOffset <= visibleRangeHeight) {
      nextScrollOffset = clamp(
        nextScrollOffset,
        endOffset - visibleRangeBottom,
        startOffset - paddingTop,
      );
    } else if (overflowRow >= 0 && overflowRow < rowCount) {
      const overflowStart = rowAccumulateHeight[overflowRow] ?? startOffset;
      const overflowEnd = rowAccumulateHeight[overflowRow + 1] ?? overflowStart;
      nextScrollOffset = alignedOffset({
        startOffset: overflowStart,
        endOffset: overflowEnd,
        align,
        anchorOffset,
      });
      if (overflowEnd - overflowStart <= visibleRangeHeight) {
        nextScrollOffset = clamp(
          nextScrollOffset,
          overflowEnd - visibleRangeBottom,
          overflowStart - paddingTop,
        );
      }
    }
  }

  return clamp(Math.round(nextScrollOffset), scrollOffsetMin, scrollOffsetMax);
}

export function useScrollOffset({
  containerRef,
  containerSize,
  rowAccumulateHeight,
  autoRowAccumulateHeight = rowAccumulateHeight,
  startRow,
  endRow,
  autoStartRow = startRow,
  autoEndRow = endRow,
  align,
  alignAnchor,
  viewportPadding = EMPTY_LYRICS_VIEWPORT_PADDING,
  ensureAutoRangeVisible = false,
  autoOverflowRow = -1,
  autoToNaturalCoordinate = identityCoordinate,
}: {
  containerRef: RefObject<HTMLDivElement>;
  containerSize: { width: number; height: number };
  /** Natural document geometry used by native/manual scrolling. */
  rowAccumulateHeight: number[];
  /** Optional projected geometry used only while auto-follow is active. */
  autoRowAccumulateHeight?: number[];
  startRow: number;
  endRow: number;
  autoStartRow?: number;
  autoEndRow?: number;
  align: "start" | "center" | "end";
  alignAnchor: number;
  viewportPadding?: LyricsViewportPadding;
  ensureAutoRangeVisible?: boolean;
  autoOverflowRow?: number;
  autoToNaturalCoordinate?: (coordinate: number) => number;
}) {
  const [activeScrollOffset, setActiveScrollOffset] = useState<
    number | undefined
  >(undefined);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const containerHeight = containerSize.height;
  const anchorOffset = containerHeight * alignAnchor;
  const { scrollOffsetMin, scrollOffsetMax } = scrollBounds({
    rowAccumulateHeight,
    containerHeight,
    align,
    anchorOffset,
    viewportPadding,
  });

  const targetScrollOffset = useMemo(() => {
    return calculateFollowScrollOffset({
      rowAccumulateHeight: autoRowAccumulateHeight,
      containerHeight,
      startRow: autoStartRow,
      endRow: autoEndRow,
      align,
      alignAnchor,
      viewportPadding,
      ensureRangeVisible: ensureAutoRangeVisible,
      overflowRow: autoOverflowRow,
    });
  }, [
    align,
    alignAnchor,
    autoEndRow,
    autoOverflowRow,
    autoRowAccumulateHeight,
    autoStartRow,
    containerHeight,
    ensureAutoRangeVisible,
    viewportPadding,
  ]);
  const targetNativeScrollOffset = useMemo(
    () =>
      clamp(
        autoToNaturalCoordinate(targetScrollOffset + anchorOffset) -
          anchorOffset,
        scrollOffsetMin,
        scrollOffsetMax,
      ),
    [
      anchorOffset,
      autoToNaturalCoordinate,
      scrollOffsetMax,
      scrollOffsetMin,
      targetScrollOffset,
    ],
  );

  const boundsRef = useRef({
    min: scrollOffsetMin,
    max: scrollOffsetMax,
  });
  boundsRef.current = { min: scrollOffsetMin, max: scrollOffsetMax };

  const activeScrollOffsetRef = useRef(activeScrollOffset);
  activeScrollOffsetRef.current = activeScrollOffset;
  const programmaticScrollTopRef = useRef<number | undefined>(undefined);
  const autoFollowTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const updateFromNativeScroll = useCallback((nativeScrollTop: number) => {
    const { min, max } = boundsRef.current;
    const nextScrollOffset = clamp(nativeScrollTop + min, min, max);
    activeScrollOffsetRef.current = nextScrollOffset;
    setActiveScrollOffset(nextScrollOffset);
    setIsUserScrolling(true);

    clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = setTimeout(
      () => setIsUserScrolling(false),
      SCROLL_IDLE_DELAY,
    );

    clearTimeout(autoFollowTimerRef.current);
    autoFollowTimerRef.current = setTimeout(() => {
      activeScrollOffsetRef.current = undefined;
      setActiveScrollOffset(undefined);
    }, AUTO_FOLLOW_RESUME_DELAY);
  }, []);

  const setProgrammaticScrollTop = useCallback(
    (container: HTMLDivElement, scrollTop: number) => {
      programmaticScrollTopRef.current = scrollTop;
      if (Math.abs(container.scrollTop - scrollTop) >= 0.5) {
        container.scrollTop = scrollTop;
      }
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function scrollListener() {
      const programmaticScrollTop = programmaticScrollTopRef.current;
      if (
        programmaticScrollTop !== undefined &&
        Math.abs(container.scrollTop - programmaticScrollTop) < 0.5
      ) {
        programmaticScrollTopRef.current = undefined;
        return;
      }
      programmaticScrollTopRef.current = undefined;
      updateFromNativeScroll(container.scrollTop);
    }

    container.addEventListener("scroll", scrollListener, { passive: true });
    return () => {
      container.removeEventListener("scroll", scrollListener);
    };
  }, [containerRef, updateFromNativeScroll]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeOffset = activeScrollOffsetRef.current;
    if (!container || activeOffset === undefined) return;

    const nextActiveOffset = clamp(
      activeOffset,
      scrollOffsetMin,
      scrollOffsetMax,
    );
    if (nextActiveOffset !== activeOffset) {
      activeScrollOffsetRef.current = nextActiveOffset;
      setActiveScrollOffset(nextActiveOffset);
    }
    setProgrammaticScrollTop(container, nextActiveOffset - scrollOffsetMin);
  }, [
    containerRef,
    scrollOffsetMax,
    scrollOffsetMin,
    setProgrammaticScrollTop,
  ]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || activeScrollOffset !== undefined) return;

    setProgrammaticScrollTop(
      container,
      targetNativeScrollOffset - scrollOffsetMin,
    );
  }, [
    activeScrollOffset,
    containerRef,
    scrollOffsetMin,
    setProgrammaticScrollTop,
    targetNativeScrollOffset,
  ]);

  useEffect(
    () => () => {
      clearTimeout(autoFollowTimerRef.current);
      clearTimeout(scrollIdleTimerRef.current);
    },
    [],
  );

  const scrollOffset =
    activeScrollOffset === undefined
      ? targetScrollOffset
      : clamp(activeScrollOffset, scrollOffsetMin, scrollOffsetMax);
  const naturalScrollOffset =
    activeScrollOffset === undefined
      ? targetNativeScrollOffset
      : clamp(activeScrollOffset, scrollOffsetMin, scrollOffsetMax);

  return {
    scrollOffset,
    naturalScrollOffset,
    scrollContentHeight: containerHeight + scrollOffsetMax - scrollOffsetMin,
    isActiveScroll: activeScrollOffset !== undefined,
    isUserScrolling,
    isAutoFollow: activeScrollOffset === undefined,
  };
}
