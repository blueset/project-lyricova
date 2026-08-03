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
  karaokeSoftFillFront,
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
  /**
   * Blur radius (layout units) of the canvas drop-shadow. Repurposed by the
   * emphasis {@link ClusterRenderStyle.glow} pass to bloom the glyphs into a
   * soft halo without a second offscreen canvas.
   */
  shadowBlur: number;
  /** Colour of the canvas drop-shadow, i.e. the glow halo's colour. */
  shadowColor: string;
  /**
   * Global compositing mode (a `GlobalCompositeOperation` on the real context).
   * The glow pass flips this to `"lighter"` (additive, matching AMLL's
   * `plus-lighter`) and restores it immediately; every text pass runs under the
   * default `"source-over"`.
   */
  globalCompositeOperation: string;
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
  /**
   * Builds a linear-gradient paint for the soft-edge karaoke sweep. Its
   * coordinates are resolved in the current transform space **at fill time**,
   * which is why {@link drawCluster} constructs it in cluster-local space (see
   * there for the per-glyph offset compensation).
   */
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): CanvasGradient;
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
  /**
   * Width of the soft transition band between sung and unsung text, in layout
   * units. `0`/omitted keeps the hard-edged clip.
   */
  softEdgeWidth?: number;
  /** Soft glow painted behind the glyphs (AMLL emphasis). Omitted = no glow. */
  glow?: {
    /** Blur radius in layout units. */
    blur: number;
    /** Glow colour, typically white. */
    color: string;
    /** Glow alpha in [0, 1]; `0` skips the glow entirely. */
    alpha: number;
  };
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
 * Returns `color` with its alpha forced to `0` (same RGB/hue), for the far stop
 * of the soft-edge karaoke gradient.
 *
 * Two subtleties make this the *correct* "unsung" stop:
 *
 * 1. The active pass is painted **over** the inactive pass, so "unsung" must be
 *    fully transparent - letting the inactive ink show through - rather than the
 *    inactive colour itself (which would double-paint and mis-blend at partial
 *    alpha).
 * 2. Canvas gradients interpolate in **premultiplied** alpha, so fading to the
 *    `transparent` keyword (transparent *black*) drags the band toward black
 *    mid-sweep. Fading to the active colour at zero alpha keeps the hue constant
 *    while only the alpha ramps, which is the clean fade we want.
 *
 * Handles the hex and `rgb()/rgba()/hsl()/hsla()` forms the renderer is driven
 * with; any other syntax falls back to the `transparent` keyword.
 */
function withZeroAlpha(color: string): string {
  const value = color.trim();
  const fn = /^(rgb|hsl)a?\(([^)]*)\)$/i.exec(value);
  if (fn) {
    const parts = fn[2].split(",").map((part) => part.trim());
    if (parts.length >= 3) {
      return `${fn[1].toLowerCase()}a(${parts[0]}, ${parts[1]}, ${parts[2]}, 0)`;
    }
  }
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3) return `#${digits}0`;
    if (digits.length === 4) return `#${digits.slice(0, 3)}0`;
    if (digits.length === 6) return `#${digits}00`;
    if (digits.length === 8) return `#${digits.slice(0, 6)}00`;
  }
  return "transparent";
}

/**
 * Paints the cluster's glyphs with the soft-edge karaoke sweep: a fixed-width
 * gradient that goes solid `solidColor` at `solidEdge`, ramps to a transparent
 * `solidColor` at `transparentEdge`, and stays solid before / transparent after
 * (Canvas clamps stops past the axis ends). No clip is used, so glyph ink is
 * never cut - at `fraction === 1` the whole cluster simply reads solid.
 *
 * The band is defined in **cluster-local** space (via
 * {@link clusterFillExtent}/{@link karaokeSoftFillFront}) so it translates and
 * scales rigidly with the cluster's emphasis transform instead of sliding. But
 * each glyph is filled through its own pen-offset flip
 * ({@link glyphFlipMatrix}), and a gradient's coordinates are read in that
 * fill-time space - so the axis endpoints are pre-shifted by the glyph's `x`
 * offset here, cancelling the per-glyph translation and keeping one continuous
 * band across every glyph of the cluster.
 */
function paintGlyphsSoftEdge(
  ctx: GlyphCanvasContext,
  offsets: readonly Point[],
  paths: readonly (Path2D | null)[],
  solidEdge: number,
  transparentEdge: number,
  solidColor: string,
  transparentColor: string,
): void {
  for (let i = 0; i < paths.length; i += 1) {
    const path = paths[i];
    if (!path) continue;
    const offset = offsets[i];
    ctx.save();
    applyTransform(ctx, glyphFlipMatrix(offset));
    // Horizontal axis (shared y): the band only advances along the fill; the
    // `-offset.x` shift undoes this glyph's pen translation so the gradient
    // reads in cluster-local x.
    const gradient = ctx.createLinearGradient(
      solidEdge - offset.x,
      0,
      transparentEdge - offset.x,
      0,
    );
    gradient.addColorStop(0, solidColor);
    gradient.addColorStop(1, transparentColor);
    ctx.fillStyle = gradient;
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

  // Glow pass (AMLL emphasis): a blurred bloom painted *behind* the text so
  // only the halo bleeding past the glyph edges survives the later opaque
  // passes. The canvas shadow API blurs it in-place (no second canvas), and
  // additive `"lighter"` compositing is scoped to this save/restore so it can
  // never leak into the text. Skipped unless it would be visible.
  const glow = style.glow;
  if (glow && glow.alpha > 0 && glow.blur > 0) {
    ctx.save();
    ctx.globalAlpha = baseAlpha * opacity * clamp01(glow.alpha);
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = glow.blur;
    ctx.shadowColor = glow.color;
    ctx.fillStyle = glow.color;
    paintGlyphs(ctx, offsets, paths);
    ctx.restore();
  }

  // Inactive (not-yet-sung) pass: the whole cluster.
  ctx.fillStyle = style.inactiveColor;
  paintGlyphs(ctx, offsets, paths);

  // Active (sung) pass: the same glyphs revealed up to the karaoke front.
  const fraction = clamp01(style.fillFraction ?? 0);
  if (fraction > 0) {
    const direction: FillDirection =
      style.fillDirection ?? (cluster.direction === "rtl" ? "rtl" : "ltr");
    // Union of the logical advance box and the glyph ink (both axes), so at
    // fraction 1 every pixel of ink - negative side bearings, ink past the
    // advance, and ascenders/descenders beyond a short line box - is reachable.
    const extent = clusterFillExtent(cluster, line);

    const softEdgeWidth = style.softEdgeWidth ?? 0;
    const activeColor = style.activeColor;
    if (softEdgeWidth > 0 && typeof activeColor === "string") {
      // Soft edge: fade the sung colour out across a fixed-width band centred on
      // the fill front. No clip - the gradient's transparent tail *is* the
      // reveal boundary, and ink is never cut (matters at fraction 1, where the
      // band sits past the far edge). The band is built in cluster-local space
      // so it rides the emphasis transform (see `paintGlyphsSoftEdge`).
      const front = karaokeSoftFillFront(
        extent,
        fraction,
        direction,
        softEdgeWidth,
      );
      const half = softEdgeWidth / 2;
      const solidEdge = direction === "rtl" ? front + half : front - half;
      const transparentEdge = direction === "rtl" ? front - half : front + half;
      paintGlyphsSoftEdge(
        ctx,
        offsets,
        paths,
        solidEdge,
        transparentEdge,
        activeColor,
        withZeroAlpha(activeColor),
      );
    } else {
      // Hard edge: clip to the karaoke fill rectangle and re-fill solid.
      const clip = karaokeFillClip(extent, fraction, direction);
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.width, clip.height);
      ctx.clip();
      ctx.fillStyle = activeColor;
      paintGlyphs(ctx, offsets, paths);
      ctx.restore();
    }
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
