import _ from "lodash";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  const scrollOffset = useMemo(() => {
    const startOffset = rowAccumulateHeight[startRow];
    const endOffset = rowAccumulateHeight[endRow];
    const containerHeight = containerSize.height;
    const anchorOffset = containerHeight * alignAnchor;

    let newScrollOffset = 0;
    if (align === "start") {
      newScrollOffset = startOffset - anchorOffset;
    } else if (align === "center") {
      newScrollOffset = (startOffset + endOffset) / 2 - anchorOffset;
    } else if (align === "end") {
      newScrollOffset = endOffset - anchorOffset;
    }
    return Math.round(newScrollOffset);
  }, [
    rowAccumulateHeight,
    align,
    alignAnchor,
    containerSize.height,
    endRow,
    startRow,
  ]);
  const scrollOffsetRef = useRef(scrollOffset);
  scrollOffsetRef.current = scrollOffset;

  const debounceReset = useCallback(_.debounce(() => setActiveScrollOffset(undefined), 5000), [setActiveScrollOffset]);

  useEffect(() => {
    const bottom = rowAccumulateHeight.at(-1) ?? 0;
    function whellListener(event: WheelEvent) {
      setActiveScrollOffset((v) => {
        const base = v !== undefined ? v : scrollOffsetRef.current;
        let result = base;
        if (event.deltaMode === event.DOM_DELTA_PIXEL) {
          result += event.deltaY;
        } else {
          result += event.deltaY * 50;
        }
        return Math.max(0, Math.min(bottom, result));
      });
      debounceReset();
    }
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", whellListener, {passive: true});
      return () => {
        container?.removeEventListener("wheel", whellListener);
      };
    }
  }, [containerRef, debounceReset, rowAccumulateHeight, setActiveScrollOffset]);

  return {
    scrollOffset:
      activeScrollOffset === undefined ? scrollOffset : activeScrollOffset,
    isActiveScroll: activeScrollOffset !== undefined,
  };
}
