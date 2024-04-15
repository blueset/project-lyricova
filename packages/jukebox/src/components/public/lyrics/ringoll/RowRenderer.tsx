import { forwardRef } from "react";
import { LyricsKitLyricsLine } from "../../../../graphql/LyricsKitObjects";
import { RowRendererProps } from "./LyricsVirtualizer";

export const RowRenderer = forwardRef<HTMLDivElement>(
  ({ row, isActive, top }: RowRendererProps<LyricsKitLyricsLine>, ref) => {
    return (
      <div
        ref={ref}
        style={{
          opacity: isActive ? 1 : 0.5,
          translate: `0 ${top}px`,
          position: "absolute",
          // top,
          fontSize: "2em",
          willChange: "translate",
          transition: "opacity 0.2s, translate 0.2s",
          minHeight: "0.5em",
        }}
      >
        {row.content}
      </div>
    );
  }
);

RowRenderer.displayName = "RowRenderer";
