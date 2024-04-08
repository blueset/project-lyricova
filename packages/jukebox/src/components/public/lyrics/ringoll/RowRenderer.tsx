import { forwardRef } from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";

export const RowRenderer = forwardRef<HTMLDivElement>(
  ({ row, isActive }: RowRendererProps<LyricsKitLyricsLine>, ref) => {
    return <div ref={ref} style={{opacity: isActive? 1 : 0.5}}>{row.content}</div>;
  }
);

RowRenderer.displayName = "RowRenderer";
