import init, {
  GlyphShaper as RawGlyphShaper,
  lineBreakOpportunities as rawLineBreakOpportunities,
} from "../pkg/glyph_renderer.js";
import type {
  GlyphOutline,
  GlyphOutlineRequest,
  LineBreak,
  ParagraphLayout,
  ParagraphRequest,
  ShapeRequest,
  ShapeResult,
} from "./types.js";

export * from "./types.js";

type WasmInitInput = Parameters<typeof init>[0];

let initPromise: Promise<unknown> | undefined;

/**
 * Loads and instantiates the `glyph-renderer` wasm module. Must resolve
 * before constructing a {@link GlyphShaper}. Safe to call multiple times -
 * subsequent calls reuse the first in-flight/completed initialization.
 *
 * @param input Forwarded to the wasm-bindgen `init()` entry point, e.g. a
 * `URL`/path/`Response`/`BufferSource` for the `.wasm` binary. Omit to let
 * the bundler/browser resolve the default relative `glyph_renderer_bg.wasm` URL.
 */
export function initGlyphRenderer(input?: WasmInitInput): Promise<unknown> {
  if (initPromise) return initPromise;

  const pending = init(input);
  const wrapped = pending.catch((error) => {
    if (initPromise === wrapped) {
      initPromise = undefined;
    }
    throw error;
  });
  initPromise = wrapped;
  return wrapped;
}

/**
 * Typed wrapper around the wasm-bindgen `GlyphShaper` class: registers font
 * byte buffers and shapes contextual text runs against them.
 *
 * Call {@link initGlyphRenderer} once (per page/worker) before constructing
 * this class - the underlying wasm module must be instantiated first.
 *
 * Optional request fields may be omitted, set to `null`, or set to
 * `undefined` interchangeably: a present-but-`undefined` key (e.g. from
 * spreading optional props) is normalized to "absent" at the wasm boundary
 * and falls back to its default, so callers need not strip `undefined` keys.
 */
export class GlyphShaper {
  private readonly inner: RawGlyphShaper;

  constructor() {
    this.inner = new RawGlyphShaper();
  }

  /**
   * Registers a font byte buffer (TTF/OTF, or one face of a TTC/OTC
   * collection selected via `faceIndex`, default `0`). Returns a numeric
   * font id to use in {@link ShapeRequest.fontIds}.
   *
   * @throws {Error} if `bytes` cannot be parsed as a font.
   */
  registerFont(bytes: Uint8Array, faceIndex = 0): number {
    return this.inner.registerFont(bytes, faceIndex);
  }

  /** Unregisters a previously registered font. Returns `false` if unknown. */
  removeFont(fontId: number): boolean {
    return this.inner.removeFont(fontId);
  }

  /** Returns whether `fontId` is currently registered. */
  hasFont(fontId: number): boolean {
    return this.inner.hasFont(fontId);
  }

  /** Returns the number of currently registered fonts. */
  fontCount(): number {
    return this.inner.fontCount();
  }

  /**
   * Shapes a single contextual text run.
   *
   * @throws {Error} on invalid input (unknown font id, empty text/font
   * chain, or an unparsable direction/script/language/feature/variation).
   */
  shape(request: ShapeRequest): ShapeResult {
    return this.inner.shape(request) as ShapeResult;
  }

  /**
   * Lays out a whole paragraph of text: Unicode bidi segmentation (UAX #9),
   * grapheme-cluster-aware font fallback, UAX #14 line breaking with optional
   * width wrapping, and grouping of glyphs into safe shaped clusters (with
   * advance/bounds metadata). Returns visually-ordered lines while every
   * cluster keeps its logical source range in both UTF-8 and UTF-16.
   *
   * @throws {Error} on invalid input (unknown font id, empty text/font chain,
   * a vertical `baseDirection`, or an unparsable script/language/feature/variation).
   */
  layoutParagraph(request: ParagraphRequest): ParagraphLayout {
    return this.inner.layoutParagraph(request) as ParagraphLayout;
  }

  /**
   * Extracts a single registered font glyph's scalable vector outline (path
   * commands + tight ink bounds), scaled to `request.fontSize`, with `y`
   * pointing up (font convention - a canvas renderer flips the axis). Pass the
   * same `variations` you shaped with so the outline lines up with shaped
   * positions. The path commands mirror the Canvas2D `Path2D` API (see
   * {@link PathCommand}) so they can be replayed into a `Path2D` directly.
   *
   * @returns the glyph outline, or `null` when the glyph has no monochrome
   * outline to draw (e.g. whitespace, or a color/bitmap/SVG-only glyph).
   * @throws {Error} on invalid input (unknown font id, out-of-range glyph id,
   * a non-positive/non-finite `fontSize`, or an unparsable variation).
   */
  glyphOutline(request: GlyphOutlineRequest): GlyphOutline | null {
    return (this.inner.glyphOutline(request) as GlyphOutline | null) ?? null;
  }

  /** Frees the underlying wasm-side instance. Call when done with this shaper. */
  free(): void {
    this.inner.free();
  }
}

/**
 * Returns every legal UAX #14 line-break opportunity in `text`, each reported
 * in both UTF-8 byte and UTF-16 code-unit coordinates. Does not require any
 * registered font, but {@link initGlyphRenderer} must have resolved first.
 */
export function lineBreakOpportunities(text: string): LineBreak[] {
  return rawLineBreakOpportunities(text) as LineBreak[];
}
