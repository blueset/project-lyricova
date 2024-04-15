import { useEffect, useState } from "react";

export function useScrollOffset({
  containerSize,
  rowAccumulateHeight,
  startRow,
  endRow,
  align,
  alignAnchor,
}: {
  containerSize: { width: number; height: number };
  rowAccumulateHeight: number[];
  startRow: number;
  endRow: number;
  align: "start" | "center" | "end";
  alignAnchor: number;
}) {
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const startOffset = rowAccumulateHeight[startRow];
    const endOffset = rowAccumulateHeight[endRow];
    const containerHeight = containerSize.height;
    const anchorOffset = containerHeight * alignAnchor;

    let newScrollOffset = 0;
    if (align === "start") {
      newScrollOffset = startOffset - anchorOffset;
    } else if (align === "center") {
      newScrollOffset = (startOffset + endOffset) / 2  - anchorOffset;
    } else if (align === "end") {
      newScrollOffset = endOffset - anchorOffset;
    }

    setScrollOffset(newScrollOffset);
  }, [rowAccumulateHeight, align, alignAnchor, containerSize.height, endRow, startRow]);

  return scrollOffset;
}