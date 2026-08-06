import type { LayoutLine, ShapedCluster } from "@lyricova/glyph-renderer";

/**
 * Finds the line(s) whose source range overlaps `[utf16Start, utf16End)`.
 * Ruby bases are passed as `noBreakRanges`, so under normal operation this
 * should always resolve to exactly one line; returning every overlapping
 * line index lets the caller report a `"splitAcrossLines"` issue instead of
 * silently picking one.
 */
export function findLinesForRange(
  lines: readonly LayoutLine[],
  utf16Start: number,
  utf16End: number,
): number[] {
  const matches: number[] = [];
  lines.forEach((line, index) => {
    const { utf16Start: lineStart, utf16End: lineEnd } = line.source;
    // Overlap test; a zero-width range at a line boundary is attributed to
    // the line that starts at it.
    const overlaps =
      utf16Start < lineEnd &&
      utf16End > lineStart &&
      !(utf16Start === utf16End && utf16Start === lineEnd);
    if (overlaps) matches.push(index);
  });
  return matches;
}

/**
 * Returns every cluster of `line` whose source range falls within
 * `[utf16Start, utf16End)`, in visual (left-to-right) order as stored on the
 * line.
 */
export function clustersInRange(
  line: LayoutLine,
  utf16Start: number,
  utf16End: number,
): ShapedCluster[] {
  return line.clusters.filter(
    (cluster) =>
      cluster.source.utf16Start >= utf16Start &&
      cluster.source.utf16End <= utf16End,
  );
}

export interface BaseGroupBounds {
  /** Leftmost x of the base clusters within the line, including base expansion. */
  xStart: number;
  /** Rightmost x of the base clusters within the line, including base expansion. */
  xEnd: number;
  clusters: ShapedCluster[];
}

/**
 * Computes the horizontal span (line-relative) occupied by the base clusters
 * of a ruby annotation, **including** the JLReq base-expansion spacing the
 * layout engine injected around them (`ShapedCluster.leadingSpace` /
 * `trailingSpace`). Ruby is centred over this expanded box, so ignoring the
 * edge gaps would bias every expanded annotation's ruby off-centre.
 *
 * Returns `null` if no cluster of the line falls within the given range (e.g.
 * the range is pure whitespace collapsed away, or an upstream inconsistency).
 */
export function computeBaseGroupBounds(
  line: LayoutLine,
  utf16Start: number,
  utf16End: number,
): BaseGroupBounds | null {
  const clusters = clustersInRange(line, utf16Start, utf16End);
  if (clusters.length === 0) return null;
  const xStart = Math.min(...clusters.map((c) => c.x - c.leadingSpace));
  const xEnd = Math.max(
    ...clusters.map((c) => c.x + c.advance + c.trailingSpace),
  );
  return { xStart, xEnd, clusters };
}

export interface AdjustedLineMetrics {
  lineIndex: number;
  top: number;
  baseline: number;
  height: number;
}

/**
 * Recomputes `top`/`baseline`/`height` for every line, reserving a **uniform**
 * `rubyRowHeight` above each one's original base-text box.
 *
 * The reservation is document-level and constant by design: deriving it from
 * per-line measured ruby ink would make line advance depend on which lines
 * happen to carry furigana, so lines would visibly jitter as the lyrics
 * advance. Pass `0` when the document has no ruby at all.
 */
export function computeAdjustedLineMetrics(
  lines: readonly LayoutLine[],
  rubyRowHeight: number,
): AdjustedLineMetrics[] {
  const extent = Math.max(0, rubyRowHeight);
  return lines.map((line, index) => {
    const originalAscentOffset = line.baseline - line.top;
    const top = line.top + extent * index;
    return {
      lineIndex: index,
      top,
      baseline: top + extent + originalAscentOffset,
      height: line.height + extent,
    };
  });
}
