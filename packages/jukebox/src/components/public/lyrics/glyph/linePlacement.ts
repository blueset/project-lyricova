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
  /** Leftmost x of the base clusters within the line. */
  xStart: number;
  /** Rightmost x (start + advance) of the base clusters within the line. */
  xEnd: number;
  clusters: ShapedCluster[];
}

/**
 * Computes the horizontal span (line-relative) occupied by the base clusters
 * of a ruby annotation. Returns `null` if no cluster of the line falls within
 * the given range (e.g. the range is pure whitespace collapsed away, or an
 * upstream inconsistency).
 */
export function computeBaseGroupBounds(
  line: LayoutLine,
  utf16Start: number,
  utf16End: number,
): BaseGroupBounds | null {
  const clusters = clustersInRange(line, utf16Start, utf16End);
  if (clusters.length === 0) return null;
  const xStart = Math.min(...clusters.map((c) => c.x));
  const xEnd = Math.max(...clusters.map((c) => c.x + c.advance));
  return { xStart, xEnd, clusters };
}

export interface LineRubyExtent {
  lineIndex: number;
  /** Height reserved above the base line's original box for the ruby row (ascent + gap). */
  extent: number;
}

export interface AdjustedLineMetrics {
  lineIndex: number;
  top: number;
  baseline: number;
  height: number;
}

/**
 * Recomputes `top`/`baseline`/`height` for every line so that any line with a
 * ruby row (`ruby-position: over`) reserves extra height *above* its
 * original base-text box, and every following line is pushed down by the
 * same amount - so ruby glyphs never overlap the line above them.
 *
 * `extentByLine` need not cover every line; lines without an entry (or with
 * `extent <= 0`) are left with their original height, only shifted down by
 * the cumulative growth of preceding lines.
 */
export function computeAdjustedLineMetrics(
  lines: readonly LayoutLine[],
  extentByLine: ReadonlyMap<number, number>,
): AdjustedLineMetrics[] {
  // `cumulativeGrowth` is the total extra height contributed by *prior*
  // lines' ruby rows only; each line's own `extent` grows its own box
  // (pushing its base-text content down within that box) without affecting
  // its own `top`, which is only shifted by growth accumulated so far.
  let cumulativeGrowth = 0;
  return lines.map((line, index) => {
    const extent = Math.max(0, extentByLine.get(index) ?? 0);
    const originalAscentOffset = line.baseline - line.top;
    const top = line.top + cumulativeGrowth;
    const baseline = top + extent + originalAscentOffset;
    const height = line.height + extent;
    cumulativeGrowth += extent;
    return { lineIndex: index, top, baseline, height };
  });
}
