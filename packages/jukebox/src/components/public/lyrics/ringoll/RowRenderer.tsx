import { forwardRef } from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";

export const RowRenderer = forwardRef<HTMLDivElement>(
  ({ row }: RowRendererProps<LyricsKitLyricsLine>, ref) => {
    return <div ref={ref}>{row.content}</div>;
  }
);

RowRenderer.displayName = "RowRenderer";
