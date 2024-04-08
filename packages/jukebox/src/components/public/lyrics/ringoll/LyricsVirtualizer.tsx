import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { useActiveLyrcsRange } from "./useActiveLyricsRange";
import { useAppContext } from "../../AppContext";

export interface RowRendererProps<T> {
  row: T;
  isActive?: boolean;
  ref?: React.Ref<HTMLDivElement>;
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
  const rowHeightCache = useRef<number[]>([]);
  const elArrayRef = useRef<HTMLElement[]>([]);
  const sizeUpdateCount = useRef(0);
  const [siteUpdaateCountState, setSiteUpdateCountState] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const rowRefHandler = useCallback(
    (index: number) => (el: HTMLElement) => {
      if (el) {
        elArrayRef.current[index] = el;
        const rect = el.getBoundingClientRect();
        if (rowHeightCache.current[index] !== rect.height) {
          sizeUpdateCount.current++;
        }
        rowHeightCache.current[index] = rect.height;
      }
    },
    []
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setContainerSize({ width: rect.width, height: rect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (sizeUpdateCount.current !== siteUpdaateCountState) {
    setSiteUpdateCountState(sizeUpdateCount.current);
  }

  const { playerRef } = useAppContext();
  const activeRange = useActiveLyrcsRange(rows, playerRef);
  const end = activeRange.currentFrame?.data?.lastActiveSegment + 1 ?? 0;
  const start = activeRange.currentFrame?.data?.activeSegments[0] ?? end;

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      ref={containerRef}
    >
      {activeRange.currentFrame?.data?.activeSegments.join(", ")} {"->"} ({end})
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
      {rows.slice(start, end).map((r, idx) =>
        rowRenderer({
          row: r,
          ref: rowRefHandler(idx + start),
          isActive: activeRange.currentFrame?.data?.activeSegments.includes(
            idx + start
          ),
        })
      )}
    </div>
  );
}
