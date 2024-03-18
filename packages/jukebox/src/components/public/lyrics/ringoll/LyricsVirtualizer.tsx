import React, { MutableRefObject, useCallback, useRef } from "react";

export interface RowRendererProps<T> {
  row: T;
  ref?: React.Ref<HTMLElement>;
}

export interface LyricsVirtualizerProps<T> {
  children: (props: RowRendererProps<T>) => React.ReactNode;
  rows: T[];
}

export function LyricsVirtualizer<T>({
  children: rowRenderer,
  rows,
}: LyricsVirtualizerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeightCache = useRef<number[]>([]);
  const elArrayRef = useRef<HTMLElement[]>([]);
  const sizeUpdateCount = useRef(0);

  const rowRefHandler = useCallback((index: number) => (el: HTMLElement) => {
    if (el) {
      elArrayRef.current[index] = el;
      const rect = el.getBoundingClientRect();
      if (rowHeightCache.current[index] !== rect.height) {
        sizeUpdateCount.current++;
      }
      rowHeightCache.current[index] = rect.height;
    }
  }, []);

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      ref={containerRef}
			>
			<div style={{ position: "absolute", bottom: 0, right: 0, visibility: "hidden", pointerEvents: "none" }}><div>a</div></div>
      {rows.map((r, idx) => rowRenderer({ row: r, ref: rowRefHandler(idx) }))}
    </div>
  );
}
