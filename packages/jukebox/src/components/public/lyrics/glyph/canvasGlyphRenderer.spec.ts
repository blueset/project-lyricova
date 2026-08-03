import { describe, expect, it } from "vitest";
import type {
  GlyphOutline,
  LayoutLine,
  ParagraphLayout,
  PositionedGlyph,
  ShapedCluster,
} from "@lyricova/glyph-renderer";
import {
  apply,
  IDENTITY,
  multiply,
  type Affine,
  type Point,
} from "./canvasGlyphGeometry";
import { GlyphPathCache, type CanvasPathReceiver } from "./glyphOutlineCache";
import {
  drawParagraph,
  type ClusterRenderStyle,
  type GlyphCanvasContext,
  type ResolveCluster,
} from "./canvasGlyphRenderer";

// --- Fakes -----------------------------------------------------------------

let pathCounter = 0;
class FakePath implements CanvasPathReceiver {
  readonly id = pathCounter++;
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  bezierCurveTo(): void {}
  closePath(): void {}
}

/** A `CanvasGradient` that just records its colour stops for assertions. */
class FakeGradient implements CanvasGradient {
  readonly stops: { offset: number; color: string }[] = [];
  addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color });
  }
}

interface FillRecord {
  pathId: number;
  matrix: Affine;
  fillStyle: string | CanvasGradient | CanvasPattern;
  alpha: number;
  origin: Point;
  composite: string;
  shadowBlur: number;
  shadowColor: string;
}

interface RectRecord {
  args: readonly [number, number, number, number];
  matrix: Affine;
}

interface GradientRecord {
  coords: readonly [number, number, number, number];
  matrix: Affine;
  gradient: FakeGradient;
}

/**
 * A `GlyphCanvasContext` that accumulates the transform stack (like a real
 * canvas) so fills can be checked in absolute device space, and records fills,
 * rects and clips for assertions.
 */
class RecordingContext implements GlyphCanvasContext {
  globalAlpha = 1;
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  shadowBlur = 0;
  shadowColor = "rgba(0, 0, 0, 0)";
  globalCompositeOperation = "source-over";
  private current: Affine = IDENTITY;
  private readonly stack: {
    matrix: Affine;
    alpha: number;
    fillStyle: string | CanvasGradient | CanvasPattern;
    shadowBlur: number;
    shadowColor: string;
    composite: string;
  }[] = [];
  readonly fills: FillRecord[] = [];
  readonly rects: RectRecord[] = [];
  readonly gradients: GradientRecord[] = [];
  clipCount = 0;

  save(): void {
    this.stack.push({
      matrix: this.current,
      alpha: this.globalAlpha,
      fillStyle: this.fillStyle,
      shadowBlur: this.shadowBlur,
      shadowColor: this.shadowColor,
      composite: this.globalCompositeOperation,
    });
  }
  restore(): void {
    const state = this.stack.pop();
    if (state) {
      this.current = state.matrix;
      this.globalAlpha = state.alpha;
      this.fillStyle = state.fillStyle;
      this.shadowBlur = state.shadowBlur;
      this.shadowColor = state.shadowColor;
      this.globalCompositeOperation = state.composite;
    }
  }
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    this.current = multiply(this.current, [a, b, c, d, e, f]);
  }
  beginPath(): void {}
  rect(x: number, y: number, w: number, h: number): void {
    this.rects.push({ args: [x, y, w, h], matrix: this.current });
  }
  clip(): void {
    this.clipCount += 1;
  }
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): CanvasGradient {
    const gradient = new FakeGradient();
    this.gradients.push({
      coords: [x0, y0, x1, y1],
      matrix: this.current,
      gradient,
    });
    return gradient;
  }
  fill(path: Path2D): void {
    this.fills.push({
      pathId: (path as unknown as FakePath).id,
      matrix: this.current,
      fillStyle: this.fillStyle,
      alpha: this.globalAlpha,
      origin: apply(this.current, { x: 0, y: 0 }),
      composite: this.globalCompositeOperation,
      shadowBlur: this.shadowBlur,
      shadowColor: this.shadowColor,
    });
  }
}

// --- Fixtures --------------------------------------------------------------

function glyph(
  glyphId: number,
  xAdvance: number,
  overrides: Partial<PositionedGlyph> = {},
): PositionedGlyph {
  return {
    glyphId,
    fontId: 1,
    cluster: 0,
    clusterEnd: 0,
    clusterUtf16: 0,
    clusterEndUtf16: 0,
    xAdvance,
    yAdvance: 0,
    xOffset: 0,
    yOffset: 0,
    ...overrides,
  };
}

function cluster(
  x: number,
  advance: number,
  glyphs: PositionedGlyph[],
  overrides: Partial<ShapedCluster> = {},
): ShapedCluster {
  return {
    source: { utf8Start: 0, utf8End: 0, utf16Start: 0, utf16End: 0 },
    fontId: 1,
    direction: "ltr",
    script: "Latn",
    level: 0,
    glyphs,
    x,
    advance,
    leadingSpace: 0,
    trailingSpace: 0,
    bounds: { xMin: 0, xMax: advance, yMin: 0, yMax: 30 },
    isWhitespace: false,
    ...overrides,
  };
}

function line(clusters: ShapedCluster[]): LayoutLine {
  return {
    clusters,
    source: { utf8Start: 0, utf8End: 0, utf16Start: 0, utf16End: 0 },
    width: clusters.reduce((sum, c) => sum + c.advance, 0),
    trailingWhitespace: 0,
    top: 0,
    baseline: 40,
    height: 50,
    hardBreak: true,
    direction: "ltr",
  };
}

function paragraph(lines: LayoutLine[]): ParagraphLayout {
  return {
    lines,
    baseDirection: "ltr",
    width: 100,
    height: 50,
    lineHeight: 50,
    ascent: 40,
    descent: 10,
    missingFontRanges: [],
  };
}

/** Cache whose lookup returns a stub outline for every glyph except id 0 (a
 * "space" with no outline). */
function makeCache() {
  const lookup = (_fontId: number, glyphId: number): GlyphOutline | null => {
    if (glyphId === 0) return null;
    return {
      commands: [{ type: "moveTo", x: 0, y: 0 }],
      bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 20 },
      unitsPerEm: 1000,
      fontSize: 32,
      scale: 0.032,
    };
  };
  return new GlyphPathCache({
    lookup,
    createPath2D: () =>
      new FakePath() as unknown as Path2D & CanvasPathReceiver,
  });
}

const solidStyle = (
  overrides: Partial<ClusterRenderStyle> = {},
): ClusterRenderStyle => ({
  inactiveColor: "#111111",
  activeColor: "#eeeeee",
  ...overrides,
});

// --- Tests -----------------------------------------------------------------

describe("drawParagraph", () => {
  it("places each glyph at its shaped pen position with the y axis flipped", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([cluster(0, 20, [glyph(10, 12), glyph(11, 8, { xOffset: 0 })])]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle(),
    });

    expect(ctx.fills).toHaveLength(2);
    // Origin (0,40) for the first glyph, (12,40) for the second: pen advances
    // by the first glyph's xAdvance, baseline is line.baseline.
    expect(ctx.fills[0].origin).toEqual({ x: 0, y: 40 });
    expect(ctx.fills[1].origin).toEqual({ x: 12, y: 40 });
    // Every glyph is drawn through a y-flip (matrix d component is negative).
    for (const fill of ctx.fills) {
      expect(fill.matrix[3]).toBeLessThan(0);
    }
  });

  it("preserves relative glyph offsets inside a cluster", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([
        cluster(5, 30, [
          glyph(10, 10, { xOffset: 2, yOffset: 3 }),
          glyph(11, 0, { xOffset: -1, yOffset: -4 }),
        ]),
      ]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle(),
    });

    // Cluster origin x=5, baseline 40. Glyph 0: pen 0 + xOffset 2 => x 7,
    // yOffset 3 up => y 40-3=37. Glyph 1: pen 10 + xOffset -1 => x 14,
    // yOffset -4 => y 44.
    expect(ctx.fills[0].origin).toEqual({ x: 7, y: 37 });
    expect(ctx.fills[1].origin).toEqual({ x: 14, y: 44 });
  });

  it("paints an inactive pass then a clipped active pass for a karaoke fill", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([line([cluster(0, 20, [glyph(10, 20)])])]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0.5 }),
    });

    // Two fills of the single glyph: inactive colour first, active colour second.
    expect(ctx.fills).toHaveLength(2);
    expect(ctx.fills[0].fillStyle).toBe("#111111");
    expect(ctx.fills[1].fillStyle).toBe("#eeeeee");
    expect(ctx.fills[0].pathId).toBe(ctx.fills[1].pathId); // same reused Path2D

    // The active pass is clipped to the left half (fraction 0.5 of width 20).
    expect(ctx.clipCount).toBe(1);
    expect(ctx.rects).toHaveLength(1);
    const [rx, , rw] = ctx.rects[0].args;
    expect(rx).toBe(0);
    expect(rw).toBe(10);
  });

  it("respects RTL fill direction from the cluster", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([cluster(0, 20, [glyph(10, 20)], { direction: "rtl" })]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0.5 }),
    });

    // RTL fills from the right: x = width - fillWidth = 20 - 10 = 10.
    const [rx, , rw] = ctx.rects[0].args;
    expect(rx).toBe(10);
    expect(rw).toBe(10);
  });

  it("at fraction 1 the clip covers all ink (negative bearing, overshoot, tall ink)", () => {
    const ctx = new RecordingContext();
    // Ink extends left of the origin (xMin -4), past the advance (xMax 26),
    // above the ascent (yMax 60, line box only reaches -40) and below the
    // baseline (yMin -6). The clip must cover every pixel of it.
    const layout = paragraph([
      line([
        cluster(5, 20, [glyph(10, 20)], {
          bounds: { xMin: -4, xMax: 26, yMin: -6, yMax: 60 },
        }),
      ]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 1 }),
    });

    // Clip rect is in cluster-local coords. Horizontal union: [-4, 26] -> x=-4,
    // width=30. Vertical union of line box [-40,10] and ink [-60, 6] -> top=-60,
    // height=70.
    expect(ctx.rects).toHaveLength(1);
    expect(ctx.rects[0].args).toEqual([-4, -60, 30, 70]);
  });

  it("skips the active pass entirely at fill fraction 0", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([line([cluster(0, 20, [glyph(10, 20)])])]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0 }),
    });

    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0].fillStyle).toBe("#111111");
    expect(ctx.clipCount).toBe(0);
  });

  it("multiplies cluster opacity into the context alpha", () => {
    const ctx = new RecordingContext();
    ctx.globalAlpha = 0.8;
    const layout = paragraph([line([cluster(0, 20, [glyph(10, 20)])])]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ opacity: 0.5 }),
    });

    expect(ctx.fills[0].alpha).toBeCloseTo(0.4, 6); // 0.8 base * 0.5 opacity
    // Base alpha is restored after the paragraph.
    expect(ctx.globalAlpha).toBeCloseTo(0.8, 6);
  });

  it("clamps cluster opacity (NaN->0, negative->0, >1 and Infinity->1)", () => {
    const drawWith = (opacity: number) => {
      const ctx = new RecordingContext();
      const layout = paragraph([line([cluster(0, 20, [glyph(10, 20)])])]);
      drawParagraph(ctx, layout, {
        cache: makeCache(),
        fontSize: 32,
        resolveCluster: () => solidStyle({ opacity }),
      });
      return ctx;
    };

    // NaN and negative clamp to 0 -> cluster is skipped, nothing painted.
    expect(drawWith(Number.NaN).fills).toHaveLength(0);
    expect(drawWith(-0.5).fills).toHaveLength(0);

    // >1 and Infinity clamp to 1 -> painted at full (base) alpha.
    expect(drawWith(2).fills[0].alpha).toBeCloseTo(1, 6);
    expect(drawWith(Number.POSITIVE_INFINITY).fills[0].alpha).toBeCloseTo(1, 6);
  });

  it("applies an independent per-cluster transform", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([
        cluster(0, 20, [glyph(10, 20)], {
          bounds: { xMin: 0, xMax: 20, yMin: 0, yMax: 0 },
        }),
      ]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({ transform: { translate: { x: 100, y: 5 } } }),
    });

    // Glyph origin shifts by the cluster translate (anchor irrelevant for a
    // pure translation): (0,40) + (100,5) = (100,45).
    expect(ctx.fills[0].origin).toEqual({ x: 100, y: 45 });
  });

  it("skips clusters the resolver rejects and glyphs with no outline", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([
        cluster(0, 20, [glyph(10, 20)]),
        cluster(20, 10, [glyph(0, 10)], { isWhitespace: true }), // space => null outline
        cluster(30, 20, [glyph(12, 20)]),
      ]),
    ]);

    const resolveCluster: ResolveCluster = ({ clusterIndex }) =>
      clusterIndex === 2 ? null : solidStyle();

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster,
    });

    // Only cluster 0 paints: cluster 1 is an outline-less space, cluster 2 is
    // rejected by the resolver.
    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0].origin).toEqual({ x: 0, y: 40 });
  });

  it("draws .notdef / tofu glyphs (never hides missing-coverage glyphs)", () => {
    // The renderer is coverage-agnostic: any glyph the layout emits with a
    // drawable outline is painted. `missingFontRanges`/tofu is not consulted to
    // suppress anything, so a .notdef box glyph is rendered like any other.
    const ctx = new RecordingContext();
    const layout = paragraph([line([cluster(0, 20, [glyph(999, 20)])])]);

    drawParagraph(ctx, layout, {
      cache: makeCache(), // returns a real outline for every non-space glyph id
      fontSize: 32,
      resolveCluster: () => solidStyle(),
    });

    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0].origin).toEqual({ x: 0, y: 40 });
  });

  it("skips a glyphless cluster such as a hard newline without emitting fills", () => {
    // A newline / control cluster carries no glyphs; the renderer paints
    // nothing for it (it does not special-case or fabricate glyphs).
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([
        cluster(0, 20, [glyph(10, 20)]),
        cluster(20, 0, [], { isWhitespace: true }), // glyphless newline cluster
      ]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle(),
    });

    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0].origin).toEqual({ x: 0, y: 40 });
  });

  it("accepts a real CanvasRenderingContext2D and Path2D structurally (compile-time)", () => {
    // These narrowing functions are type-checked by `tsc` (npm run typecheck)
    // and guard against drift between our structural interfaces and the real
    // Canvas2D API. They are never invoked with real DOM objects (jsdom
    // implements neither), so the assertions here are just that they compiled.
    const asGlyphContext = (
      ctx: CanvasRenderingContext2D,
    ): GlyphCanvasContext => ctx;
    const asPathReceiver = (path: Path2D): CanvasPathReceiver => path;
    expect(typeof asGlyphContext).toBe("function");
    expect(typeof asPathReceiver).toBe("function");
  });

  it("is deterministic and stateless across repeated calls", () => {
    const layout = paragraph([
      line([
        cluster(0, 20, [glyph(10, 12), glyph(11, 8)]),
        cluster(20, 15, [glyph(12, 15)], { direction: "rtl" }),
      ]),
    ]);
    const cache = makeCache();
    const resolveCluster: ResolveCluster = () =>
      solidStyle({ fillFraction: 0.5 });

    const run = () => {
      const ctx = new RecordingContext();
      drawParagraph(ctx, layout, { cache, fontSize: 32, resolveCluster });
      return ctx.fills.map((fill) => ({
        pathId: fill.pathId,
        matrix: fill.matrix,
        fillStyle: fill.fillStyle,
        alpha: fill.alpha,
      }));
    };

    expect(run()).toEqual(run());
    // The shared cache built exactly one path per distinct glyph (3 glyphs).
    expect(cache.size).toBe(3);
  });
});

describe("drawCluster soft-edge karaoke sweep", () => {
  // Fixture cluster spans advance [0, 20] with ink matching it, so the fill
  // extent is exactly [0, 20]; line box gives the vertical band.
  const singleGlyphLine = () =>
    paragraph([line([cluster(0, 20, [glyph(10, 20)])])]);

  it("fades via a gradient (no clip) with the band centred on the ltr front", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0.5, softEdgeWidth: 8 }),
    });

    // Soft mode never clips - the gradient's transparent tail is the boundary.
    expect(ctx.clipCount).toBe(0);
    expect(ctx.rects).toHaveLength(0);

    // Inactive fill, then the gradient (active) fill of the same glyph.
    expect(ctx.fills).toHaveLength(2);
    expect(ctx.fills[0].fillStyle).toBe("#111111");
    expect(ctx.fills[1].fillStyle).toBe(ctx.gradients[0].gradient);

    // front = 0 + 20*0.5 = 10; band = front +/- softEdgeWidth/2 -> [6, 14].
    expect(ctx.gradients).toHaveLength(1);
    expect(ctx.gradients[0].coords).toEqual([6, 0, 14, 0]);
    const [x0, , x1] = ctx.gradients[0].coords;
    expect((x0 + x1) / 2).toBe(10); // centred on the front
    // Solid sung colour -> transparent (same RGB, alpha 0) so the inactive
    // pass shows through without darkening.
    expect(ctx.gradients[0].gradient.stops).toEqual([
      { offset: 0, color: "#eeeeee" },
      { offset: 1, color: "#eeeeee00" },
    ]);
  });

  it("mirrors the gradient axis for an rtl fill", () => {
    const ctx = new RecordingContext();
    const layout = paragraph([
      line([cluster(0, 20, [glyph(10, 20)], { direction: "rtl" })]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0.5, softEdgeWidth: 8 }),
    });

    // rtl front = 20 - 20*0.5 = 10; solid edge on the right, transparent left.
    expect(ctx.clipCount).toBe(0);
    expect(ctx.gradients[0].coords).toEqual([14, 0, 6, 0]);
    const [x0, , x1] = ctx.gradients[0].coords;
    expect((x0 + x1) / 2).toBe(10);
    expect(ctx.gradients[0].gradient.stops).toEqual([
      { offset: 0, color: "#eeeeee" },
      { offset: 1, color: "#eeeeee00" },
    ]);
  });

  it("skips the active pass entirely at fraction 0 (no gradient, no clip)", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0, softEdgeWidth: 8 }),
    });

    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills[0].fillStyle).toBe("#111111");
    expect(ctx.gradients).toHaveLength(0);
    expect(ctx.clipCount).toBe(0);
  });

  it("still paints the gradient (never a clip) at fraction 1 so ink is not cut", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 1, softEdgeWidth: 8 }),
    });

    // The band is centred on the front, so the front travels half a band past
    // each edge: at fraction 1 the *solid* stop lands exactly on the far edge
    // (20), leaving every pixel of ink fully sung. Were the front to stop at
    // the edge itself, the trailing half-band would straddle the glyph and
    // every sung cluster would keep a permanently dimmed edge.
    expect(ctx.clipCount).toBe(0);
    expect(ctx.rects).toHaveLength(0);
    expect(ctx.fills).toHaveLength(2);
    expect(ctx.fills[1].fillStyle).toBe(ctx.gradients[0].gradient);
    expect(ctx.gradients[0].coords).toEqual([20, 0, 28, 0]);
    expect(ctx.gradients[0].gradient.stops[0]).toEqual({
      offset: 0,
      color: "#eeeeee",
    });
  });

  it("leaves no ink partially lit just after the sweep starts", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({ fillFraction: Number.EPSILON, softEdgeWidth: 8 }),
    });

    // Mirror of the fraction-1 case: the *transparent* stop starts on the
    // reading-start edge (0), so nothing ahead of the front is pre-lit.
    const [x0, , x1] = ctx.gradients[0].coords;
    expect(x1).toBeCloseTo(0, 6);
    expect(x0).toBeCloseTo(-8, 6);
  });

  it("keeps the band inside the travel for RTL at both endpoints", () => {
    const front = (fraction: number) => {
      const ctx = new RecordingContext();
      drawParagraph(ctx, singleGlyphLine(), {
        cache: makeCache(),
        fontSize: 32,
        resolveCluster: () =>
          solidStyle({
            fillFraction: fraction,
            softEdgeWidth: 8,
            fillDirection: "rtl",
          }),
      });
      return ctx.gradients[0].coords;
    };

    // RTL sweeps right-to-left: solid trails the front on the right.
    expect(front(1)[0]).toBeCloseTo(0, 6);
    expect(front(Number.EPSILON)[2]).toBeCloseTo(20, 6);
  });

  it("fades to the active colour at zero alpha, not `transparent` or the inactive colour", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({
          inactiveColor: "rgba(255, 255, 255, 0.32)",
          activeColor: "rgba(255, 255, 255, 0.98)",
          fillFraction: 0.5,
          softEdgeWidth: 8,
        }),
    });

    const stops = ctx.gradients[0].gradient.stops;
    expect(stops[0].color).toBe("rgba(255, 255, 255, 0.98)");
    // Same RGB as the sung colour, alpha forced to 0 (avoids premultiplied
    // darkening); not the `transparent` keyword and not the inactive colour.
    expect(stops[1].color).toBe("rgba(255, 255, 255, 0)");
    expect(stops[1].color).not.toBe("transparent");
    expect(stops[1].color).not.toBe("rgba(255, 255, 255, 0.32)");
  });

  it("compensates each glyph's pen offset so the band is continuous across a cluster", () => {
    const ctx = new RecordingContext();
    // Two glyphs: pen offsets 0 and 12. The cluster-local band is [6, 14] for
    // both; each glyph's gradient is pre-shifted by -offset.x.
    const layout = paragraph([
      line([cluster(0, 20, [glyph(10, 12), glyph(11, 8)])]),
    ]);

    drawParagraph(ctx, layout, {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0.5, softEdgeWidth: 8 }),
    });

    // 2 inactive + 2 gradient fills; one gradient per glyph.
    expect(ctx.fills).toHaveLength(4);
    expect(ctx.gradients).toHaveLength(2);
    expect(ctx.gradients[0].coords).toEqual([6, 0, 14, 0]); // offset 0
    expect(ctx.gradients[1].coords).toEqual([-6, 0, 2, 0]); // offset 12
    for (const g of ctx.gradients) {
      expect(g.gradient.stops).toEqual([
        { offset: 0, color: "#eeeeee" },
        { offset: 1, color: "#eeeeee00" },
      ]);
    }
  });

  it("falls back to the hard clip when the active colour is not a string", () => {
    const ctx = new RecordingContext();
    const patternLike = new FakeGradient(); // a non-string CanvasGradient

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({
          activeColor: patternLike,
          fillFraction: 0.5,
          softEdgeWidth: 8,
        }),
    });

    // No linear gradient built by the renderer; the hard clip path runs.
    expect(ctx.gradients).toHaveLength(0);
    expect(ctx.clipCount).toBe(1);
    expect(ctx.rects).toHaveLength(1);
    const [rx, , rw] = ctx.rects[0].args;
    expect(rx).toBe(0);
    expect(rw).toBe(10);
    expect(ctx.fills[1].fillStyle).toBe(patternLike);
  });

  it("keeps the hard-edge clip when softEdgeWidth is absent", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () => solidStyle({ fillFraction: 0.5 }),
    });

    expect(ctx.gradients).toHaveLength(0);
    expect(ctx.clipCount).toBe(1);
    expect(ctx.rects).toHaveLength(1);
  });
});

describe("drawCluster glow", () => {
  const singleGlyphLine = () =>
    paragraph([line([cluster(0, 20, [glyph(10, 20)])])]);

  it("paints an additive, blurred glow before the text and never leaks its state", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({
          fillFraction: 0.5,
          glow: { blur: 6, color: "#ffffff", alpha: 0.5 },
        }),
    });

    // Glow first, then inactive, then the (hard-clipped) active pass.
    expect(ctx.fills).toHaveLength(3);
    const [glowFill, inactiveFill, activeFill] = ctx.fills;

    expect(glowFill.pathId).toBe(inactiveFill.pathId); // same glyph, painted first
    expect(glowFill.fillStyle).toBe("#ffffff");
    expect(glowFill.composite).toBe("lighter"); // additive (AMLL plus-lighter)
    expect(glowFill.shadowBlur).toBe(6);
    expect(glowFill.shadowColor).toBe("#ffffff");
    expect(glowFill.alpha).toBeCloseTo(0.5, 6); // baseAlpha 1 * opacity 1 * glow.alpha

    // Text passes run under default compositing with the shadow reset.
    expect(inactiveFill.composite).toBe("source-over");
    expect(inactiveFill.shadowBlur).toBe(0);
    expect(activeFill.composite).toBe("source-over");
    expect(activeFill.shadowBlur).toBe(0);

    // And the context itself is fully restored afterwards.
    expect(ctx.globalCompositeOperation).toBe("source-over");
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.shadowColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("skips the glow pass entirely when alpha is 0", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({
          fillFraction: 0,
          glow: { blur: 6, color: "#ffffff", alpha: 0 },
        }),
    });

    expect(ctx.fills).toHaveLength(1); // inactive only
    expect(ctx.fills.every((f) => f.composite === "source-over")).toBe(true);
    expect(ctx.fills.every((f) => f.shadowBlur === 0)).toBe(true);
  });

  it("skips the glow pass entirely when blur is 0", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({
          fillFraction: 0,
          glow: { blur: 0, color: "#ffffff", alpha: 0.8 },
        }),
    });

    expect(ctx.fills).toHaveLength(1);
    expect(ctx.fills.every((f) => f.composite === "source-over")).toBe(true);
    expect(ctx.fills.every((f) => f.shadowBlur === 0)).toBe(true);
  });

  it("composes glow with the soft-edge sweep (glow first, gradient active, no clip)", () => {
    const ctx = new RecordingContext();

    drawParagraph(ctx, singleGlyphLine(), {
      cache: makeCache(),
      fontSize: 32,
      resolveCluster: () =>
        solidStyle({
          fillFraction: 0.5,
          softEdgeWidth: 8,
          glow: { blur: 5, color: "#ffffff", alpha: 0.6 },
        }),
    });

    expect(ctx.fills).toHaveLength(3);
    const [glowFill, , activeFill] = ctx.fills;
    expect(glowFill.composite).toBe("lighter");
    expect(glowFill.shadowBlur).toBe(5);

    // Active pass is the soft-edge gradient, under default compositing, no clip.
    expect(ctx.clipCount).toBe(0);
    expect(ctx.gradients).toHaveLength(1);
    expect(activeFill.fillStyle).toBe(ctx.gradients[0].gradient);
    expect(activeFill.composite).toBe("source-over");
    expect(activeFill.shadowBlur).toBe(0);
  });
});
