import React, { useRef } from "react";

export interface RowRendererProps<T> {
  row: T;
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
  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      ref={containerRef}
			>
			<div style={{ position: "absolute", bottom: 0, right: 0, visibility: "hidden", pointerEvents: "none" }}><div>a</div></div>
      {rows.map((r) => rowRenderer({ row: r }))}
    </div>
  );
}
