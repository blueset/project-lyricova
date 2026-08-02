import type {
  LayoutLine,
  ParagraphLayout,
  ShapedCluster,
} from "@lyricova/glyph-renderer";
import type {
  Affine,
  ClusterTransform,
  FillDirection,
  Point,
} from "./canvasGlyphGeometry";
import {
  clamp01,
  clusterFillExtent,
  clusterGlyphOffsets,
  composeClusterMatrix,
  defaultClusterAnchor,
  glyphFlipMatrix,
  karaokeFillClip,
} from "./canvasGlyphGeometry";
import type { GlyphPathCache } from "./glyphOutlineCache";

/**
 * A browser Canvas2D renderer for `@lyricova/glyph-renderer` paragraph
 * layouts. It consumes a {@link ParagraphLayout} plus cached glyph outlines
 * (`Path2D`s from {@link GlyphPathCache}) and paints each **safe shaped
 * cluster** as an independently transformable unit with per-cluster
 * translate/rotate/scale/opacity, inactive/active colours, and a 0..1 karaoke
 * fill fraction.
 *
 * ## Deterministic and stateless per paint
 *
 * {@link drawParagraph} performs a complete redraw from its inputs and holds
 * no timing/animation state of its own - there is **no** internal
 * `requestAnimationFrame`. Per-cluster state (fill fraction, transform,
 * colours, opacity) is supplied by the caller's {@link ResolveCluster}
 * callback, which is where the existing media clock will be wired in later.
 * Calling `drawParagraph` twice with the same inputs produces identical
 * canvas operations, and the only retained state - the glyph {@link GlyphPathCache} -
 * is a deterministic performance cache.
 *
 * The renderer never clears the canvas or replaces the current transform: the
 * caller is expected to clear and to have applied any device-pixel-ratio /
 * paragraph-origin / scroll transform beforehand. All per-cluster transforms
 * are multiplied *into* the current transform.
 */

/**
 * The minimal subset of `CanvasRenderingContext2D` the renderer uses. The real
 * context satisfies it; tests pass a recording fake. `fillStyle`'s type
 * matches the DOM so a real context is assignable.
 */
export interface GlyphCanvasContext {
  globalAlpha: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  save(): void;
  restore(): void;
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void;
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
  fill(path: Path2D): void;
}

/** The per-cluster paint description returned by {@link ResolveCluster}. */
export interface ClusterRenderStyle {
  /** Colour of the not-yet-sung glyph fill (any CSS colour / canvas style). */
  inactiveColor: string | CanvasGradient | CanvasPattern;
  /** Colour of the sung portion, revealed by the karaoke fill. */
  activeColor: string | CanvasGradient | CanvasPattern;
  /**
   * Karaoke fill fraction in `[0, 1]` (clamped): `0` paints the cluster fully
   * inactive, `1` fully active. Defaults to `0`.
   */
  fillFraction?: number;
  /**
   * Direction the fill grows in. Defaults to the cluster's own bidi direction
   * (`"rtl"` clusters fill right-to-left, everything else left-to-right).
   */
  fillDirection?: FillDirection;
  /** Cluster opacity in `[0, 1]`, multiplied into the context alpha. Default `1`. */
  opacity?: number;
  /** Independent per-cluster translate/rotate/scale (about an anchor). */
  transform?: ClusterTransform;
}

/** Context passed to {@link ResolveCluster} for one cluster. */
export interface ClusterRenderContext {
  cluster: ShapedCluster;
  line: LayoutLine;
  lineIndex: number;
  clusterIndex: number;
}

/**
 * Resolves the paint state for a single cluster. Return `null` to skip the
 * cluster entirely (e.g. before it should appear). This is the seam where the
 * caller injects media-clock-driven timing later.
 */
export type ResolveCluster = (
  context: ClusterRenderContext,
) => ClusterRenderStyle | null;

/** Options for {@link drawParagraph}. */
export interface DrawParagraphOptions {
  /** Cache supplying/reusing built glyph `Path2D`s. */
  cache: GlyphPathCache;
  /** Font size the paragraph was laid out at (for glyph outline lookups). */
  fontSize: number;
  /** Variable-font settings used for layout (must match for correct outlines). */
  variations?: readonly string[];
  /** Per-cluster paint-state resolver (see {@link ResolveCluster}). */
  resolveCluster: ResolveCluster;
}

function applyTransform(ctx: GlyphCanvasContext, m: Affine): void {
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
}

/**
 * Paints one cluster's glyphs (in the current cluster-local screen transform)
 * with the current `fillStyle`, flipping each glyph's y-up outline to screen
 * space and placing it at its shaped pen offset. `paths` is parallel to
 * `cluster.glyphs`; a `null` entry (outline-less glyph, e.g. a space) is
 * skipped.
 */
function paintGlyphs(
  ctx: GlyphCanvasContext,
  offsets: readonly Point[],
  paths: readonly (Path2D | null)[],
): void {
  for (let i = 0; i < paths.length; i += 1) {
    const path = paths[i];
    if (!path) continue;
    ctx.save();
    applyTransform(ctx, glyphFlipMatrix(offsets[i]));
    ctx.fill(path);
    ctx.restore();
  }
}

/**
 * Draws a single shaped cluster. Exposed (in addition to
 * {@link drawParagraph}) so a caller can drive a bespoke iteration order.
 * `baseAlpha` is the context alpha to compose the cluster opacity into
 * (normally the paragraph's starting `globalAlpha`).
 */
export function drawCluster(
  ctx: GlyphCanvasContext,
  cluster: ShapedCluster,
  line: LayoutLine,
  style: ClusterRenderStyle,
  options: Pick<DrawParagraphOptions, "cache" | "fontSize" | "variations">,
  baseAlpha: number,
): void {
  if (cluster.glyphs.length === 0) return;
  const opacity = clamp01(style.opacity ?? 1);
  if (opacity <= 0) return;

  const { cache, fontSize } = options;
  const variations = options.variations ?? [];

  const paths = cluster.glyphs.map((glyph) =>
    cache.getPath(glyph.fontId, glyph.glyphId, fontSize, variations),
  );
  // Nothing drawable (e.g. an all-whitespace cluster): skip cleanly.
  if (paths.every((path) => path === null)) return;

  const offsets = clusterGlyphOffsets(cluster);
  const origin: Point = { x: cluster.x, y: line.baseline };
  const anchor = style.transform?.anchor ?? defaultClusterAnchor(cluster);
  const clusterMatrix = composeClusterMatrix(origin, style.transform, anchor);

  ctx.save();
  ctx.globalAlpha = baseAlpha * opacity;
  applyTransform(ctx, clusterMatrix);

  // Inactive (not-yet-sung) pass: the whole cluster.
  ctx.fillStyle = style.inactiveColor;
  paintGlyphs(ctx, offsets, paths);

  // Active (sung) pass: the same glyphs, clipped to the karaoke fill region.
  const fraction = clamp01(style.fillFraction ?? 0);
  if (fraction > 0) {
    const direction: FillDirection =
      style.fillDirection ?? (cluster.direction === "rtl" ? "rtl" : "ltr");
    // Clip over the union of the logical advance box and the glyph ink (both
    // axes), so at fraction 1 every pixel of ink - negative side bearings, ink
    // past the advance, and ascenders/descenders beyond a short line box - is
    // covered while partial fractions still fill from the reading edge.
    const extent = clusterFillExtent(cluster, line);
    const clip = karaokeFillClip(extent, fraction, direction);

    ctx.save();
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
    ctx.fillStyle = style.activeColor;
    paintGlyphs(ctx, offsets, paths);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Renders a whole {@link ParagraphLayout} to `ctx`. Iterates lines top-to-
 * bottom and clusters in visual order, asking `resolveCluster` for each
 * cluster's paint state and drawing the ones it returns. Deterministic and
 * stateless per call (see the module docs).
 */
export function drawParagraph(
  ctx: GlyphCanvasContext,
  layout: ParagraphLayout,
  options: DrawParagraphOptions,
): void {
  const baseAlpha = ctx.globalAlpha;
  for (let lineIndex = 0; lineIndex < layout.lines.length; lineIndex += 1) {
    const line = layout.lines[lineIndex];
    for (
      let clusterIndex = 0;
      clusterIndex < line.clusters.length;
      clusterIndex += 1
    ) {
      const cluster = line.clusters[clusterIndex];
      const style = options.resolveCluster({
        cluster,
        line,
        lineIndex,
        clusterIndex,
      });
      if (!style) continue;
      drawCluster(ctx, cluster, line, style, options, baseAlpha);
    }
    // Restore the paragraph's base alpha in case a cluster left it changed
    // (defensive - drawCluster always save/restores).
    ctx.globalAlpha = baseAlpha;
  }
}
