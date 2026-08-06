import type { SegmentAlignment } from "./lyricSegments";

/**
 * Pure placement math for the Glyph Canvas renderer: horizontal alignment of a
 * laid-out line within an available width, and vertical stacking of several
 * (possibly overlapping) active segments within the canvas. Kept separate from
 * the React component so it can be unit tested without a canvas.
 */

/**
 * The x offset (in CSS px) at which a line of `lineWidth` should start so it is
 * aligned within `availableWidth`. `"start"` hugs the left, `"end"` the right,
 * `"center"` splits the slack. A line wider than the available width overflows
 * symmetrically for `"center"` and past the right edge for `"start"` (never
 * shifted left of `0` for `"start"`).
 */
export function alignmentOffset(
  alignment: SegmentAlignment,
  availableWidth: number,
  lineWidth: number,
): number {
  const slack = availableWidth - lineWidth;
  switch (alignment) {
    case "end":
      return slack;
    case "center":
      return slack / 2;
    case "start":
    default:
      return 0;
  }
}

export interface StackItem {
  /** Total height (CSS px) this item occupies, including any ruby/translation. */
  height: number;
}

export interface StackedPosition {
  /** Top offset (CSS px) of this item within the canvas. */
  top: number;
}

/**
 * Vertically stacks `items` (in order) centered within `containerHeight`, with
 * a constant `gap` between consecutive items. When the stack is taller than
 * the container it simply overflows symmetrically (top can be negative), which
 * the caller clips to the canvas. Returns one {@link StackedPosition} per item,
 * parallel to `items`.
 */
export function stackSegmentPositions(
  items: readonly StackItem[],
  containerHeight: number,
  gap: number,
): StackedPosition[] {
  if (items.length === 0) return [];
  const totalHeight =
    items.reduce((sum, item) => sum + item.height, 0) +
    gap * (items.length - 1);
  let cursor = (containerHeight - totalHeight) / 2;
  return items.map((item) => {
    const top = cursor;
    cursor += item.height + gap;
    return { top };
  });
}
