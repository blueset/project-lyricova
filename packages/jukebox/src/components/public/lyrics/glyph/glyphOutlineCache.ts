import type {
  FontId,
  GlyphOutline,
  PathCommand,
} from "@lyricova/glyph-renderer";

/**
 * Builds and reuses `Path2D` objects from glyph outlines returned by
 * `@lyricova/glyph-renderer`'s `glyphOutline` API, so the Canvas2D renderer
 * ({@link file://./canvasGlyphRenderer.ts}) never re-tessellates the same glyph
 * twice.
 *
 * The path geometry is deliberately left in the outline's **font space**
 * (origin at the glyph pen, `y` up, scaled to the requested font size). The
 * renderer applies the per-glyph position and the y-axis flip via the canvas
 * transform (see `glyphFlipMatrix`), which is what lets a single cached
 * `Path2D` be reused for the same glyph at every position and every frame.
 */

/**
 * The minimal subset of the DOM `Path2D`/`CanvasPath` interface this module
 * needs to *build* a path. `Path2D` satisfies it; tests pass a recording fake.
 */
export interface CanvasPathReceiver {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  closePath(): void;
}

/**
 * Replays a glyph outline's {@link PathCommand}s onto a path receiver. The
 * command names/argument order mirror the Canvas2D path methods, so this is a
 * direct dispatch. Pure and side-effect-free apart from mutating `path`.
 */
export function buildGlyphPath(
  commands: readonly PathCommand[],
  path: CanvasPathReceiver,
): void {
  for (const command of commands) {
    switch (command.type) {
      case "moveTo":
        path.moveTo(command.x, command.y);
        break;
      case "lineTo":
        path.lineTo(command.x, command.y);
        break;
      case "quadTo":
        path.quadraticCurveTo(command.x1, command.y1, command.x, command.y);
        break;
      case "cubicTo":
        path.bezierCurveTo(
          command.x1,
          command.y1,
          command.x2,
          command.y2,
          command.x,
          command.y,
        );
        break;
      case "close":
        path.closePath();
        break;
    }
  }
}

/**
 * Looks up the (monochrome) outline of a shaped glyph. Backed in production by
 * `GlyphShaper.glyphOutline`; returns `null` for a glyph with no drawable
 * outline (e.g. whitespace). Kept as an injectable function so the cache can
 * be tested without the wasm module.
 */
export type GlyphOutlineLookup = (
  fontId: FontId,
  glyphId: number,
  fontSize: number,
  variations: readonly string[],
) => GlyphOutline | null;

/** Factory for a fresh, empty `Path2D`. Defaults to the global `Path2D`. */
export type Path2DFactory = () => Path2D & CanvasPathReceiver;

function cacheKey(
  fontId: FontId,
  glyphId: number,
  fontSize: number,
  variations: readonly string[],
): string {
  // Variations are joined verbatim; callers pass the same normalized list they
  // shaped with, so ordering is stable per paragraph.
  return `${fontId}|${glyphId}|${fontSize}|${variations.join(",")}`;
}

/**
 * An LRU-free memoizing cache of built `Path2D`s (and cached `null`s for
 * outline-less glyphs), keyed by `(fontId, glyphId, fontSize, variations)`.
 *
 * The cache is a pure performance aid: `getPath` is deterministic given the
 * same inputs and lookup, and holds no animation/timing state, so the renderer
 * stays stateless per paint.
 */
export class GlyphPathCache {
  private readonly paths = new Map<string, Path2D | null>();
  private readonly lookup: GlyphOutlineLookup;
  private readonly createPath2D: Path2DFactory;
  private hits = 0;
  private misses = 0;

  constructor(options: {
    lookup: GlyphOutlineLookup;
    /** Override the `Path2D` constructor (tests inject a recording fake). */
    createPath2D?: Path2DFactory;
  }) {
    this.lookup = options.lookup;
    this.createPath2D =
      options.createPath2D ?? (() => new Path2D() as Path2D & CanvasPathReceiver);
  }

  /**
   * Returns the built `Path2D` for a shaped glyph, or `null` if the glyph has
   * no drawable outline. Builds and caches on first request; subsequent
   * requests for the same key reuse the stored path (or stored `null`).
   */
  getPath(
    fontId: FontId,
    glyphId: number,
    fontSize: number,
    variations: readonly string[] = [],
  ): Path2D | null {
    const key = cacheKey(fontId, glyphId, fontSize, variations);
    if (this.paths.has(key)) {
      this.hits += 1;
      return this.paths.get(key) ?? null;
    }

    this.misses += 1;
    const outline = this.lookup(fontId, glyphId, fontSize, variations);
    const path = outline ? this.build(outline) : null;
    this.paths.set(key, path);
    return path;
  }

  private build(outline: GlyphOutline): Path2D {
    const path = this.createPath2D();
    buildGlyphPath(outline.commands, path);
    return path;
  }

  /** Number of distinct cached keys (built paths plus cached `null`s). */
  get size(): number {
    return this.paths.size;
  }

  /** Cache hit/miss counters, for diagnostics/tests. */
  get stats(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }

  /** Drops all cached paths (e.g. after a font set / size change). */
  clear(): void {
    this.paths.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
