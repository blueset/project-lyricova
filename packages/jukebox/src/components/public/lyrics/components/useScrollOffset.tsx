import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AUTO_FOLLOW_RESUME_DELAY = 5000;
const SCROLL_IDLE_DELAY = 150;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function useScrollOffset({
  containerRef,
  containerSize,
  rowAccumulateHeight,
  startRow,
  endRow,
  align,
  alignAnchor,
}: {
  containerRef: RefObject<HTMLDivElement>;
  containerSize: { width: number; height: number };
  rowAccumulateHeight: number[];
  startRow: number;
  endRow: number;
  align: "start" | "center" | "end";
  alignAnchor: number;
}) {
  const [activeScrollOffset, setActiveScrollOffset] = useState<
    number | undefined
  >(undefined);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const containerHeight = containerSize.height;
  const anchorOffset = containerHeight * alignAnchor;
  const scrollOffsetMin = -anchorOffset;
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
  );

  const targetScrollOffset = useMemo(() => {
    const startOffset = rowAccumulateHeight[startRow];
    const endOffset = rowAccumulateHeight[endRow];

    let nextScrollOffset = 0;
    if (align === "start") {
      nextScrollOffset = startOffset - anchorOffset;
    } else if (align === "center") {
      nextScrollOffset = (startOffset + endOffset) / 2 - anchorOffset;
    } else if (align === "end") {
      nextScrollOffset = endOffset - anchorOffset;
    }
    return clamp(
      Math.round(nextScrollOffset),
      scrollOffsetMin,
      scrollOffsetMax,
    );
  }, [
    align,
    anchorOffset,
    endRow,
    rowAccumulateHeight,
    scrollOffsetMax,
    scrollOffsetMin,
    startRow,
  ]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function scrollListener() {
      const programmaticScrollTop = programmaticScrollTopRef.current;
      if (
        activeScrollOffsetRef.current === undefined &&
        programmaticScrollTop !== undefined &&
        Math.abs(container.scrollTop - programmaticScrollTop) < 0.5
      ) {
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
    if (!container || activeScrollOffset !== undefined) return;

    const nextScrollTop = targetScrollOffset - scrollOffsetMin;
    programmaticScrollTopRef.current = nextScrollTop;
    if (Math.abs(container.scrollTop - nextScrollTop) >= 0.5) {
      container.scrollTop = nextScrollTop;
    }
    programmaticScrollTopRef.current = container.scrollTop;
  }, [
    activeScrollOffset,
    containerRef,
    scrollOffsetMax,
    scrollOffsetMin,
    targetScrollOffset,
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

  return {
    scrollOffset,
    scrollContentHeight: containerHeight + scrollOffsetMax - scrollOffsetMin,
    isActiveScroll: activeScrollOffset !== undefined,
    isUserScrolling,
  };
}
