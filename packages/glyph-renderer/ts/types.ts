/**
 * Structural TypeScript contracts mirroring the Rust `ShapeRequest` /
 * `ShapeResult` / `PositionedGlyph` types in `src/shaping.rs`. These are the
 * plain-JSON shapes that cross the wasm boundary via `serde-wasm-bindgen`
 * (field names are `camelCase` because the Rust structs are annotated with
 * `#[serde(rename_all = "camelCase")]`).
 */

/** Paragraph/run direction. See `src/shaping.rs` module docs for bidi scope limitations. */
export type TextDirection = "ltr" | "rtl" | "ttb" | "btt" | "auto";

/** Opaque handle returned by {@link GlyphShaper.registerFont}. */
export type FontId = number;

/**
 * A request to shape a single contextual text run (one direction/script/
 * language applied uniformly across `text` - see `src/shaping.rs` for why
 * full Unicode Bidi paragraph segmentation is out of scope for this POC).
 */
export interface ShapeRequest {
  text: string;
  /**
   * Ordered, explicit font fallback chain: the first font with a glyph for
   * a given character wins; if none do, the *last* font in the chain is
   * used and the byte range is reported in {@link ShapeResult.missingFontRanges}.
   */
  fontIds: FontId[];
  /** Defaults to `"auto"` (resolved heuristically from the dominant script). */
  direction?: TextDirection;
  /** ISO 15924 4-letter script tag, e.g. `"Latn"`, `"Arab"`, `"Deva"`. Defaults to auto-detected. */
  script?: string | null;
  /** BCP-47 language tag, e.g. `"en-US"`, `"ja"`. Defaults to auto-detected. */
  language?: string | null;
  /**
   * HarfBuzz-style feature strings, e.g. `"liga=1"`, `"smcp"`, `"-kern"`,
   * `"salt[3:5]=2"` (byte-offset range within `text`).
   */
  features?: string[];
  /** Variable-font axis settings, e.g. `"wght=650"`, `"opsz=18"`. */
  variations?: string[];
  /** Font size in the units you want `xAdvance`/`yAdvance`/`xOffset`/`yOffset` returned in (e.g. CSS px). */
  fontSize: number;
}

/** One positioned glyph, ready to be drawn by a renderer. */
export interface PositionedGlyph {
  glyphId: number;
  /** Which font in `ShapeRequest.fontIds` produced this glyph. */
  fontId: FontId;
  /** Start byte offset of this glyph's cluster in the original `text` (UTF-8 byte index). */
  cluster: number;
  /** End byte offset (exclusive) of this glyph's cluster in the original `text` (UTF-8). */
  clusterEnd: number;
  /** Start offset of this glyph's cluster in UTF-16 code units (for DOM/JS index correlation). */
  clusterUtf16: number;
  /** End offset (exclusive) of this glyph's cluster in UTF-16 code units. */
  clusterEndUtf16: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

/** The result of shaping a {@link ShapeRequest}. */
export interface ShapeResult {
  /** Positioned glyphs in visual (left-to-right buffer) order. */
  glyphs: PositionedGlyph[];
  /** The direction actually used for shaping (resolved from `"auto"` if needed). */
  direction: TextDirection;
  /** The ISO 15924 script tag actually used for shaping. */
  script: string;
  /** The BCP-47 language tag actually used for shaping, if any was resolved. */
  language?: string | null;
  /**
   * Byte ranges `[start, end)` of `text` for which no font in the fallback
   * chain had glyph coverage (shaped with the last font in the chain,
   * typically producing `.notdef`/tofu glyphs).
   */
  missingFontRanges: [number, number][];
}

/**
 * Errors thrown by {@link GlyphShaper.shape} and
 * {@link GlyphShaper.registerFont} are plain JS `Error` objects (see
 * `src/bindings.rs::to_js_error`); `error.message` contains a human-readable
 * description, e.g. `"unknown font id: 42"` or `"text must not be empty"`.
 * This type documents the underlying Rust error taxonomy (`ShapeError` in
 * `src/shaping.rs`) for reference - it is not currently preserved as
 * structured data across the wasm boundary.
 */
export type ShapeErrorKind =
  | "invalidFont"
  | "unknownFont"
  | "emptyFontChain"
  | "emptyText"
  | "invalidInput";

// ---------------------------------------------------------------------------
// Paragraph layout (bidi + UAX #14 line breaking + width wrapping + clusters).
// Mirrors the Rust types in `src/layout.rs`.
// ---------------------------------------------------------------------------

/**
 * A source-text span in **both** UTF-8 byte offsets and UTF-16 code-unit
 * offsets, so DOM/JavaScript callers (whose string indices are UTF-16) and
 * byte-oriented consumers can both correlate a layout item back to the exact
 * source characters.
 */
export interface SourceRange {
  utf8Start: number;
  utf8End: number;
  utf16Start: number;
  utf16End: number;
}

/**
 * Axis-aligned ink bounding box of a cluster's glyphs, in the same units as
 * the glyph advances, relative to the cluster's pen origin. `y` follows the
 * font convention (positive up from the baseline). For animation / paint
 * mapping / hit-testing without rasterizing outlines.
 */
export interface ClusterBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * A "safe" shaped cluster: one or more positioned glyphs mapping to a
 * contiguous source range that must be treated atomically (a ligature spanning
 * multiple characters, or a base character plus combining marks).
 */
export interface ShapedCluster {
  /** Logical source range (UTF-8 and UTF-16). */
  source: SourceRange;
  /** Font (from the request fallback chain) that shaped this cluster. */
  fontId: FontId;
  /** Resolved run direction this cluster was shaped with. */
  direction: TextDirection;
  /**
   * Resolved ISO 15924 script tag this cluster was shaped with (from the
   * paragraph's per-script itemization, or the explicit request script).
   */
  script: string;
  /** Resolved Unicode bidi embedding level. */
  level: number;
  /** Positioned glyphs of this cluster, in visual (buffer) order. */
  glyphs: PositionedGlyph[];
  /** Visual x-position of the cluster's left edge within its line. */
  x: number;
  /** Total horizontal advance of the cluster. */
  advance: number;
  /** Ink bounding box of the cluster's glyphs, relative to the cluster origin. */
  bounds: ClusterBounds;
  /** Whether every source character of this cluster is whitespace. */
  isWhitespace: boolean;
}

/** One laid-out line of a paragraph. */
export interface LayoutLine {
  /** Clusters of this line in **visual** order (left-to-right). */
  clusters: ShapedCluster[];
  /** Logical source span of the whole line (UTF-8 and UTF-16). */
  source: SourceRange;
  /** Advance width of the line, excluding trailing whitespace. */
  width: number;
  /** Advance width of the line's trailing whitespace (excluded from `width`). */
  trailingWhitespace: number;
  /** Y-offset of the top of the line box from the top of the paragraph. */
  top: number;
  /** Y-offset of the baseline from the top of the paragraph. */
  baseline: number;
  /** Height of the line box. */
  height: number;
  /** Whether this line ended at a mandatory break (newline) or paragraph end. */
  hardBreak: boolean;
  /** Base paragraph direction (for alignment of this line). */
  direction: TextDirection;
}

/** Width-constrained paragraph wrapping strategy. */
export type LineWrapStrategy = "greedy" | "balanced";

/** A request to lay out a whole paragraph with {@link GlyphShaper.layoutParagraph}. */
export interface ParagraphRequest {
  text: string;
  /** Ordered, explicit font fallback chain (see {@link ShapeRequest.fontIds}). */
  fontIds: FontId[];
  /**
   * Base paragraph direction. `"auto"` resolves via the Unicode bidi
   * first-strong rule. Only horizontal directions are accepted; `"ttb"`/`"btt"`
   * are rejected. Defaults to `"auto"`.
   */
  baseDirection?: TextDirection;
  /** Explicit ISO 15924 script tag, or omitted/`null` to guess per run. */
  script?: string | null;
  /** Explicit BCP-47 language tag, or omitted/`null` to guess per run. */
  language?: string | null;
  /** HarfBuzz-style feature strings, e.g. `"liga=1"`, `"-kern"`. */
  features?: string[];
  /** Variable-font axis settings, e.g. `"wght=650"`. */
  variations?: string[];
  /** Font size in the units you want advances/positions returned in (e.g. CSS px). */
  fontSize: number;
  /**
   * Available width for wrapping. Omitted, `null`, or a non-positive value
   * disables width wrapping - the paragraph is then only broken at mandatory
   * (newline) breaks.
   */
  maxWidth?: number | null;
  /**
   * Width-constrained wrapping strategy. `"greedy"` preserves the original
   * first-fit behavior. `"balanced"` preserves greedy's line count and
   * redistributes legal breakpoints to minimize line-width variance.
   * Defaults to `"greedy"`.
   */
  wrapStrategy?: LineWrapStrategy;
  /**
   * Explicit line box height. Omitted/`null` derives it from the primary
   * font's vertical metrics (`ascender - descender + lineGap`).
   */
  lineHeight?: number | null;
  /**
   * Logical **UTF-16** `[start, end)` ranges inside which line breaking is
   * forbidden (e.g. a ruby-annotated base run the ruby layer must keep on one
   * line). Only width-driven (UAX #14 "allowed") and emergency breaks are
   * suppressed; legal breaks exactly *before* `start` and *after* `end` are
   * preserved, and mandatory breaks (hard newlines) are always honored.
   * Endpoints are validated strictly (`start < end`, within the text, on
   * code-point boundaries) - an invalid range throws. Overlaps are unioned.
   */
  noBreakRanges?: [number, number][];
  /**
   * Logical UTF-16 phrase ranges whose interior UAX #14 breaks are
   * discouraged. These are soft constraints: an overlong phrase may still
   * break internally rather than overflow.
   */
  phraseRanges?: [number, number][];
}

/** The result of laying out a paragraph with {@link GlyphShaper.layoutParagraph}. */
export interface ParagraphLayout {
  /** Laid-out lines, top to bottom. */
  lines: LayoutLine[];
  /** Resolved base paragraph direction (from `baseDirection`, or first strong char when `"auto"`). */
  baseDirection: TextDirection;
  /** Width of the widest line (excluding trailing whitespace). */
  width: number;
  /** Total height of all lines. */
  height: number;
  /** Line box height used for every line. */
  lineHeight: number;
  /** Ascent of the primary font (baseline to top), in layout units. */
  ascent: number;
  /** Descent of the primary font (baseline to bottom, positive), in layout units. */
  descent: number;
  /** Logical source ranges that no font in the chain could cover (rendered with tofu). */
  missingFontRanges: SourceRange[];
}

/** A single UAX #14 line-break opportunity, in both coordinate systems. */
export interface LineBreak {
  /** Byte offset (UTF-8) at which a break may/must occur (start of next line). */
  utf8Index: number;
  /** The same position in UTF-16 code units. */
  utf16Index: number;
  /** `true` for a mandatory break (e.g. after a newline or at end of text). */
  mandatory: boolean;
}

// ---------------------------------------------------------------------------
// Glyph outline extraction (scalable vector paths). Mirrors the Rust types in
// `src/outline.rs`.
// ---------------------------------------------------------------------------

/**
 * A single vector path drawing command, in `fontSize` units with `y` pointing
 * **up** (font convention - the canvas renderer flips the axis). The `type`
 * discriminant and field names/order mirror the Canvas2D `Path2D`/`CanvasPath`
 * methods so a renderer can dispatch on `type` and forward the numbers
 * unchanged:
 *
 * - `moveTo` -> `path.moveTo(x, y)`
 * - `lineTo` -> `path.lineTo(x, y)`
 * - `quadTo` -> `path.quadraticCurveTo(x1, y1, x, y)`
 * - `cubicTo` -> `path.bezierCurveTo(x1, y1, x2, y2, x, y)`
 * - `close` -> `path.closePath()`
 */
export type PathCommand =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "quadTo"; x1: number; y1: number; x: number; y: number }
  | {
      type: "cubicTo";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { type: "close" };

/**
 * Axis-aligned tight ink bounding box of a glyph outline, in `fontSize` units
 * with `y` pointing up (font convention). Matches {@link ClusterBounds}.
 */
export interface GlyphBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** A request to extract one glyph's outline with {@link GlyphShaper.glyphOutline}. */
export interface GlyphOutlineRequest {
  /** The font to read the glyph from (a {@link FontId} from `registerFont`). */
  fontId: FontId;
  /** The glyph id to outline (e.g. `PositionedGlyph.glyphId` from shaping). */
  glyphId: number;
  /** Font size the outline is scaled to (same units the shaper used). */
  fontSize: number;
  /**
   * Optional variable-font axis settings, e.g. `"wght=650"`. **Must match the
   * values used when shaping** so the outline lines up with shaped
   * advances/offsets. Ignored axes are silently dropped.
   */
  variations?: string[];
}

/**
 * A registered font glyph's scalable outline, ready to be turned into a
 * `Path2D`. Coordinates are in `fontSize` units with `y` up (see
 * {@link PathCommand}). {@link GlyphShaper.glyphOutline} returns `null` when
 * the glyph has no monochrome outline (whitespace, or a color/bitmap/SVG-only
 * glyph this extractor ignores).
 */
export interface GlyphOutline {
  /** Drawing commands in order, already scaled to `fontSize` (y-up). */
  commands: PathCommand[];
  /** Tight ink bounding box of the outline, in the same units as `commands`. */
  bounds: GlyphBounds;
  /** The font's units-per-em (design grid), for reference / re-scaling. */
  unitsPerEm: number;
  /** The font size the `commands`/`bounds` were scaled to. */
  fontSize: number;
  /** The scale factor applied to raw font units: `fontSize / unitsPerEm`. */
  scale: number;
}
