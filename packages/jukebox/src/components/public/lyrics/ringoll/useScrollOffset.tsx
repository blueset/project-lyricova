import _ from "lodash";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

  const containerHeight = containerSize.height;
  const anchorOffset = containerHeight * alignAnchor;
  const scorllOffsetMin = -anchorOffset;
  const scrollOffsetMax = (rowAccumulateHeight.at(-2) ?? 0) + scorllOffsetMin;

  const scrollOffset = useMemo(() => {
    const startOffset = rowAccumulateHeight[startRow];
    const endOffset = rowAccumulateHeight[endRow];

    let newScrollOffset = 0;
    if (align === "start") {
      newScrollOffset = startOffset - anchorOffset;
    } else if (align === "center") {
      newScrollOffset = (startOffset + endOffset) / 2 - anchorOffset;
    } else if (align === "end") {
      newScrollOffset = endOffset - anchorOffset;
    }
    return Math.round(newScrollOffset);
  }, [rowAccumulateHeight, startRow, endRow, align, anchorOffset]);
  const scrollOffsetRef = useRef(scrollOffset);
  scrollOffsetRef.current = scrollOffset;

  const debounceReset = useCallback(
    _.debounce(() => setActiveScrollOffset(undefined), 5000),
    [setActiveScrollOffset]
  );

  useEffect(() => {
    const bottom = rowAccumulateHeight.at(-1) ?? 0;
    let direction: "up" | "down" | "none" = "none";
    let startTouchPosY = 0;
    let lastMoveY = 0;
    function wheelListener(event: WheelEvent) {
      setActiveScrollOffset((v) => {
        const base = v !== undefined ? v : scrollOffsetRef.current;
        let result = base;
        if (event.deltaMode === event.DOM_DELTA_PIXEL) {
          result += event.deltaY;
        } else {
          result += event.deltaY * 50;
        }
        // TODO: fix scroll bound
        return Math.max(scorllOffsetMin, Math.min(scrollOffsetMax, result));
      });
      debounceReset();
    }
    function touchStartListener(event: TouchEvent) {
      // event.preventDefault();
      // startScrollY = this.scrollOffset;
      startTouchPosY = event.touches[0].screenY;
      lastMoveY = startTouchPosY;
    }

    function touchMoveListener(event: TouchEvent) {
      event.preventDefault();
      const touchScreenY = event.touches[0].screenY;
      const delta = touchScreenY - startTouchPosY;
      const lastDelta = touchScreenY - lastMoveY;
      const targetDirection =
        lastDelta > 0 ? "down" : lastDelta < 0 ? "up" : "none";
      if (direction !== targetDirection) {
        direction = targetDirection;
        startTouchPosY = touchScreenY;
      } else {
        // TODO: fix scroll bound
        setActiveScrollOffset((v) =>
          Math.max(0, Math.min(bottom, (v ?? scrollOffsetRef.current) - delta))
        );
      }
      debounceReset();
      lastMoveY = touchScreenY;
    }

    function touchEndListener(event: TouchEvent) {
      // event.preventDefault();
      debounceReset();
    }

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", wheelListener, { passive: true });
      container.addEventListener("touchstart", touchStartListener, {
        passive: false,
      });
      container.addEventListener("touchmove", touchMoveListener, {
        passive: false,
      });
      container.addEventListener("touchend", touchEndListener, {
        passive: false,
      });
      return () => {
        container?.removeEventListener("wheel", wheelListener);
        container?.removeEventListener("touchstart", touchStartListener);
        container?.removeEventListener("touchmove", touchMoveListener);
        container?.removeEventListener("touchend", touchEndListener);
      };
    }
  }, [containerRef, debounceReset, rowAccumulateHeight, scorllOffsetMin, scrollOffsetMax, setActiveScrollOffset]);

  return {
    scrollOffset:
      activeScrollOffset === undefined ? scrollOffset : activeScrollOffset,
    isActiveScroll: activeScrollOffset !== undefined,
  };
}
