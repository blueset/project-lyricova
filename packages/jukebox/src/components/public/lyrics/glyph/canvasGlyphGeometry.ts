import type { LayoutLine, ShapedCluster } from "@lyricova/glyph-renderer";

/**
 * Pure, canvas-independent geometry used by the Canvas2D glyph renderer
 * ({@link file://./canvasGlyphRenderer.ts}). Everything here is a plain
 * numeric function so it can be unit-tested without a real `CanvasRenderingContext2D`
 * or `Path2D` (jsdom implements neither).
 *
 * ## Coordinate spaces
 *
 * - **Font space**: what `@lyricova/glyph-renderer` emits - origin at the
 *   glyph pen position on the baseline, `y` growing **up** (font convention).
 *   Glyph outlines ({@link GlyphOutline.commands}) live here.
 * - **Cluster-local screen space**: origin at the cluster's pen origin (its
 *   left edge on the baseline), `y` growing **down** (canvas convention). This
 *   is the space a per-cluster transform (translate/rotate/scale) and the
 *   karaoke fill clip operate in.
 * - **Canvas space**: whatever the caller's `ctx` current transform maps to
 *   (device pixels, after any DPR / paragraph-origin / scroll transform the
 *   caller applied). The renderer only ever multiplies *into* the current
 *   transform, never replaces it.
 *
 * The single axis flip between font space (y-up) and canvas space (y-down) is
 * isolated in {@link glyphFlipMatrix}.
 */

/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/**
 * A 2D affine transform as the 6 numbers Canvas2D's `transform(a,b,c,d,e,f)`
 * takes, encoding the matrix
 *
 * ```
 * | a  c  e |
 * | b  d  f |
 * | 0  0  1 |
 * ```
 *
 * i.e. `x' = a*x + c*y + e`, `y' = b*x + d*y + f`.
 */
export type Affine = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

/** The identity transform. */
export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** A pure translation. */
export function translation(x: number, y: number): Affine {
  return [1, 0, 0, 1, x, y];
}

/** A pure scale (about the origin). */
export function scaling(x: number, y: number): Affine {
  return [x, 0, 0, y, 0, 0];
}

/** A pure rotation by `radians` (about the origin, clockwise in y-down space). */
export function rotation(radians: number): Affine {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [cos, sin, -sin, cos, 0, 0];
}

/**
 * Composes two transforms: the result applies `b` first, then `a` (i.e. the
 * matrix product `a · b`). This matches how repeated `ctx.transform()` calls
 * accumulate.
 */
export function multiply(a: Affine, b: Affine): Affine {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

/** Applies `m` to a point. */
export function apply(m: Affine, p: Point): Point {
  return {
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
  };
}

/**
 * A per-cluster affine transform, expressed in cluster-local screen space and
 * applied *about* an anchor point (rotation/scale pivot). Any field may be
 * omitted; the identity is used for the missing parts. Because playback timing
 * is supplied by the caller (from the media clock), this is a plain data
 * description with no time/animation state of its own.
 */
export interface ClusterTransform {
  /** Translation applied to the whole cluster (cluster-local screen units). */
  translate?: Point;
  /** Rotation in radians (clockwise), about {@link anchor}. */
  rotate?: number;
  /** Uniform (number) or non-uniform ({@link Point}) scale, about {@link anchor}. */
  scale?: number | Point;
  /**
   * Rotation/scale pivot in cluster-local screen coordinates (relative to the
   * cluster pen origin). Defaults to the cluster's ink-box centre - see
   * {@link defaultClusterAnchor}.
   */
  anchor?: Point;
}

function normalizeScale(scale: number | Point | undefined): Point {
  if (scale === undefined) return { x: 1, y: 1 };
  if (typeof scale === "number") return { x: scale, y: scale };
  return scale;
}

/**
 * The default rotation/scale pivot for a cluster: the centre of its ink
 * bounding box, in cluster-local **screen** coordinates (so the font-space
 * y-up bounds are negated). Falls back to the horizontal centre on the
 * baseline when the cluster has no ink (e.g. whitespace).
 */
export function defaultClusterAnchor(cluster: Pick<ShapedCluster, "bounds" | "advance">): Point {
  const { bounds, advance } = cluster;
  const hasInk = bounds.xMax >= bounds.xMin && bounds.yMax >= bounds.yMin;
  if (!hasInk) return { x: advance / 2, y: 0 };
  return {
    x: (bounds.xMin + bounds.xMax) / 2,
    // Font bounds are y-up; screen space is y-down, hence the negation.
    y: -(bounds.yMin + bounds.yMax) / 2,
  };
}

/**
 * Builds the matrix mapping **cluster-local screen space** to canvas space:
 * moves to the cluster's pen `origin`, then applies the user
 * translate/rotate/scale about `anchor`. Multiply this into the canvas
 * transform once per cluster.
 */
export function composeClusterMatrix(
  origin: Point,
  transform: ClusterTransform | undefined,
  anchor: Point,
): Affine {
  const translate = transform?.translate ?? { x: 0, y: 0 };
  const scale = normalizeScale(transform?.scale);
  const rotate = transform?.rotate ?? 0;

  let m = translation(origin.x, origin.y);
  m = multiply(m, translation(translate.x, translate.y));
  m = multiply(m, translation(anchor.x, anchor.y));
  if (rotate !== 0) m = multiply(m, rotation(rotate));
  if (scale.x !== 1 || scale.y !== 1) m = multiply(m, scaling(scale.x, scale.y));
  m = multiply(m, translation(-anchor.x, -anchor.y));
  return m;
}

/**
 * The matrix that places a single glyph's y-up font-space outline at its pen
 * `offset` within the cluster and flips the y axis to screen (y-down) space:
 * `translate(offset) · scale(1, -1)`. This is the *only* place the font/canvas
 * axis flip happens.
 */
export function glyphFlipMatrix(offset: Point): Affine {
  return [1, 0, 0, -1, offset.x, offset.y];
}

/**
 * The pen offset of each glyph within a cluster, in cluster-local screen
 * coordinates, preserving the glyphs' relative shaped positions: the pen
 * advances by each glyph's `xAdvance`, and each glyph is shifted by its
 * `xOffset`/`yOffset` (the y offset negated for the font->screen flip).
 *
 * The returned array is parallel to `cluster.glyphs`.
 */
export function clusterGlyphOffsets(
  cluster: Pick<ShapedCluster, "glyphs">,
): Point[] {
  let pen = 0;
  return cluster.glyphs.map((glyph) => {
    const offset: Point = {
      x: pen + glyph.xOffset,
      // Font y-up -> screen y-down. `|| 0` normalizes the `-0` produced when
      // yOffset is 0 so consumers/snapshots never see a negative zero.
      y: -glyph.yOffset || 0,
    };
    pen += glyph.xAdvance;
    return offset;
  });
}

/** Clamps a value into the inclusive `[0, 1]` range (NaN maps to 0). */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** The direction a karaoke fill grows in. */
export type FillDirection = "ltr" | "rtl";

/** A rectangle in cluster-local screen coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The full rectangular region (cluster-local screen coordinates) a cluster's
 * glyph ink can occupy - i.e. the area the karaoke clip must be able to cover
 * at `fraction === 1`. `left`/`right` bound the horizontal extent; `top`/
 * `bottom` the vertical extent (y-down).
 */
export interface FillExtent {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Computes the {@link FillExtent} a cluster's karaoke fill must be able to
 * cover: the **horizontal** extent is the union of the logical advance box
 * `[0, advance]` and the ink `[bounds.xMin, bounds.xMax]` (so negative left
 * side bearings and ink overshooting the advance are included); the
 * **vertical** extent is the union of the line box (baseline-relative screen
 * coordinates) and the cluster ink bounds converted from font y-up to screen
 * y-down (`[-bounds.yMax, -bounds.yMin]`, so ascenders/descenders that exceed a
 * short line box are still covered).
 *
 * Degenerate (non-finite) ink bounds - e.g. an ink-less cluster - collapse the
 * union to the advance box / line box via `min`/`max`, so the extent stays
 * finite and sensible.
 */
export function clusterFillExtent(
  cluster: Pick<ShapedCluster, "advance" | "bounds">,
  line: Pick<LayoutLine, "top" | "baseline" | "height">,
): FillExtent {
  const { advance, bounds } = cluster;

  const left = Math.min(0, bounds.xMin);
  const right = Math.max(advance, bounds.xMax);

  // Line box in baseline-relative screen (y-down) coordinates.
  const boxTop = line.top - line.baseline;
  const boxBottom = line.top + line.height - line.baseline;
  // Ink bounds are font y-up; screen space is y-down, so the top-most ink
  // (largest yMax) maps to the smallest screen y and vice versa.
  const inkTop = -bounds.yMax;
  const inkBottom = -bounds.yMin;

  return {
    left,
    right,
    top: Math.min(boxTop, inkTop),
    bottom: Math.max(boxBottom, inkBottom),
  };
}

/**
 * The clip rectangle (cluster-local screen space) for the *active* (sung)
 * portion of a karaoke fill: a `fraction` (0..1, clamped) of the `extent`'s
 * horizontal span, growing left-to-right for `"ltr"` and right-to-left for
 * `"rtl"`. The clip always spans the extent's **full vertical** band (the fill
 * only advances horizontally), so glyph ink above/below a short line box is
 * never clipped away.
 *
 * At `fraction === 0` the rectangle has zero width (nothing active); at
 * `fraction === 1` it covers the whole extent - including negative side
 * bearings, ink beyond the advance, and ascenders/descenders (see
 * {@link clusterFillExtent}).
 */
export function karaokeFillClip(
  extent: FillExtent,
  fraction: number,
  direction: FillDirection,
): Rect {
  const clamped = clamp01(fraction);
  const totalWidth = extent.right - extent.left;
  const fillWidth = totalWidth * clamped;
  const x = direction === "rtl" ? extent.right - fillWidth : extent.left;
  return {
    x,
    y: extent.top,
    width: fillWidth,
    height: extent.bottom - extent.top,
  };
}
