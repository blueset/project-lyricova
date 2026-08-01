import type {
  FontId,
  GlyphOutline,
  GlyphOutlineRequest,
  LayoutLine,
  LineWrapStrategy,
  ParagraphLayout,
  ParagraphRequest,
  PositionedGlyph,
  ShapeRequest,
  ShapeResult,
  SourceRange,
  TextDirection,
} from "@lyricova/glyph-renderer";

/**
 * Minimal surface of `GlyphShaper` this layer depends on. Consumers pass a
 * real `GlyphShaper` instance in production; tests pass structural fakes so
 * placement logic can be exercised without loading the wasm module.
 *
 * `glyphOutline` is used to derive each ruby annotation's *actual* ink
 * ascent/descent from the real glyphs/font it was shaped with (see
 * `rubyInkMetrics.ts`), instead of approximating from the base paragraph's
 * font metrics - which would miss ruby-font descenders (e.g. a Latin "g")
 * and wouldn't reflect a distinct ruby fallback font's real metrics.
 */
export interface RubyLayoutShaper {
  shape(request: ShapeRequest): ShapeResult;
  layoutParagraph(request: ParagraphRequest): ParagraphLayout;
  glyphOutline(request: GlyphOutlineRequest): GlyphOutline | null;
}

/**
 * A furigana annotation as persisted/consumed by the rest of the app:
 * `content` is the ruby text, and `leftIndex`/`rightIndex` are documented
 * (see `packages/api/src/graphql/LyricsKitObjects.ts`) as "per Extended
 * Grapheme Cluster" but are, in practice, **UTF-16 code unit offsets** into
 * the base text (see `RubyLineRenderer.tsx`'s `line.content.slice(...)`
 * usage). This layer treats them as UTF-16 offsets and validates that
 * assumption explicitly rather than trusting the API docs - see
 * `furiganaValidation.ts`.
 */
export interface FuriganaAnnotationInput {
  content: string;
  /** Inclusive start UTF-16 offset into the base text. */
  leftIndex: number;
  /** Exclusive end UTF-16 offset into the base text. */
  rightIndex: number;
}

/** Ways a raw {@link FuriganaAnnotationInput} can fail validation. */
export type RubyLayoutIssue =
  | {
      kind: "outOfRange";
      annotation: FuriganaAnnotationInput;
      index: number;
      reason: string;
    }
  | {
      kind: "invalidRange";
      annotation: FuriganaAnnotationInput;
      reason: string;
    }
  | {
      kind: "emptyContent";
      annotation: FuriganaAnnotationInput;
      reason: string;
    }
  | {
      kind: "midSurrogate";
      annotation: FuriganaAnnotationInput;
      /** Which endpoint failed: "left" or "right". */
      side: "left" | "right";
    }
  | {
      kind: "nonGraphemeBoundary";
      annotation: FuriganaAnnotationInput;
      side: "left" | "right";
    }
  | {
      kind: "overlapping";
      annotation: FuriganaAnnotationInput;
      other: FuriganaAnnotationInput;
    }
  | {
      kind: "splitAcrossLines";
      annotation: FuriganaAnnotationInput;
      lineIndices: number[];
    };

/** A furigana annotation whose indices have been validated and converted. */
export interface NormalizedFuriganaAnnotation {
  content: string;
  /** Validated `[leftIndex, rightIndex)` UTF-16 range into the base text. */
  utf16Range: readonly [number, number];
  /** Same range expressed in extended-grapheme-cluster indices of the base text. */
  graphemeRange: readonly [number, number];
  /** Index of this annotation within the original `furigana` input array. */
  sourceIndex: number;
}

/** Horizontal ruby placement strategy (CSS `ruby-position: over` scope only). */
export type RubyPosition = "over";

export interface RubyLayoutOptions {
  /** Ordered font fallback chain used to shape both the base text and ruby text. */
  fontIds: FontId[];
  /** Base text font size, in the units advances/positions are returned in (e.g. CSS px). */
  fontSize: number;
  /** Ruby text font size. Defaults to `fontSize * 0.5`. */
  rubyFontSize?: number;
  /** Font fallback chain for ruby text. Defaults to `fontIds`. */
  rubyFontIds?: FontId[];
  /** Only horizontal `"over"` placement is implemented; defaults to `"over"`. */
  rubyPosition?: RubyPosition;
  /** Extra gap between the ruby row and the base text's ascent line. Defaults to `0`. */
  rubyGap?: number;
  baseDirection?: TextDirection;
  script?: string | null;
  language?: string | null;
  features?: string[];
  variations?: string[];
  maxWidth?: number | null;
  wrapStrategy?: LineWrapStrategy;
  /** Soft UTF-16 phrase spans whose interior breaks should be avoided. */
  phraseRanges?: [number, number][];
  lineHeight?: number | null;
  /**
   * How to handle annotations that fail validation (out-of-range, mid-surrogate,
   * overlapping, etc). `"skip"` (default) drops the offending annotation and
   * records a {@link RubyLayoutIssue}; `"throw"` throws a `RubyLayoutError`.
   */
  onInvalidAnnotation?: "skip" | "throw";
}

export interface RubyLayoutRequest extends RubyLayoutOptions {
  text: string;
  furigana: FuriganaAnnotationInput[];
}

/** A single positioned glyph of a shaped ruby run, ready for canvas drawing. */
export interface PositionedRubyGlyph extends PositionedGlyph {
  /** Pen-resolved x position (relative to the start of its shaped run). */
  x: number;
}

/** One contiguous shaped chunk of ruby text (either one grapheme, in "mono" mode, or the whole annotation, in "group" mode). */
export interface RubyRun {
  /** Source range of this chunk within the annotation's `content` (UTF-16). */
  contentRange: readonly [number, number];
  glyphs: PositionedRubyGlyph[];
  /** Total advance width of this run. */
  width: number;
  /** x position (line-relative) where this run should be drawn. */
  x: number;
}

export interface RubyPlacement {
  annotation: NormalizedFuriganaAnnotation;
  /**
   * `"mono"`: base and ruby grapheme counts matched cleanly and each ruby
   * grapheme is individually centered over its corresponding base grapheme.
   * `"group"`: the ruby run is shaped as a whole and centered/distributed
   * over the entire base range.
   */
  mode: "mono" | "group";
  lineIndex: number;
  /** Line-relative x-range spanned by the base clusters this ruby annotates. */
  baseX: readonly [number, number];
  /**
   * Line-relative y position of the ruby row's baseline - shared by every
   * ruby annotation on the same line (the max ink ascent across that
   * line's annotations; see {@link LinePlacement.height}).
   */
  y: number;
  /**
   * This annotation's own measured ink ascent (height above the ruby
   * baseline), derived from the actual outlines of the glyphs it shaped
   * (see `rubyInkMetrics.ts`) - not approximated from base paragraph
   * metrics. `0` if none of its glyphs have a drawable outline.
   */
  inkAscent: number;
  /**
   * This annotation's own measured ink descent (depth below the ruby
   * baseline, e.g. non-zero for a Latin "g" in the ruby fallback font),
   * derived the same way as {@link inkAscent}.
   */
  inkDescent: number;
  /**
   * Line-relative left-most ink coordinate across every shaped run/glyph
   * (see `measureRubyInkHorizontalExtent` in `rubyInkMetrics.ts`), unioned
   * with the runs' own advance boxes. Accounts for negative left side
   * bearing that would otherwise be clipped away when this annotation is
   * fully revealed.
   */
  inkLeft: number;
  /**
   * Line-relative right-most ink coordinate across every shaped run/glyph,
   * unioned with the runs' own advance boxes. Accounts for ink overhanging
   * past a run's logical advance width (e.g. an italic or swash glyph).
   */
  inkRight: number;
  fontSize: number;
  fontIds: FontId[];
  runs: RubyRun[];
}

export interface LinePlacement {
  lineIndex: number;
  /** Original line layout from `ParagraphLayout`, untouched. */
  line: LayoutLine;
  /** Adjusted top offset (from paragraph top) reserving room for ruby rows. */
  top: number;
  /** Adjusted baseline offset (from paragraph top). */
  baseline: number;
  /** Adjusted line box height, including any ruby row. */
  height: number;
  rubies: RubyPlacement[];
}

export interface RubyLayoutResult {
  lines: LinePlacement[];
  /** Total paragraph height, including reserved ruby rows. */
  height: number;
  width: number;
  baseDirection: TextDirection;
  rubies: RubyPlacement[];
  issues: RubyLayoutIssue[];
  /**
   * Logical source ranges of the *base* paragraph that no font in the selected
   * chain could cover (rendered with tofu), forwarded verbatim from
   * {@link ParagraphLayout.missingFontRanges}. The coverage-aware integration
   * layer uses a non-empty value as the trigger to consider escalating to a
   * broader fallback font (see `GlyphFontManager.hasUnregisteredCoverageFor`).
   */
  missingFontRanges: SourceRange[];
}

/** Thrown when `onInvalidAnnotation: "throw"` and at least one annotation is invalid. */
export class RubyLayoutError extends Error {
  constructor(public readonly issues: RubyLayoutIssue[]) {
    super(
      `Invalid furigana annotation(s): ${issues
        .map((issue) => issue.kind)
        .join(", ")}`,
    );
    this.name = "RubyLayoutError";
  }
}

/**
 * Thrown when a request-level layout option (`fontSize`, `rubyFontSize`, or
 * `rubyGap`) is non-finite or out of its valid range. Unlike
 * {@link RubyLayoutError} (a per-annotation, skippable concern), a malformed
 * layout option makes the whole request meaningless, so this is always
 * thrown - it is never subject to `onInvalidAnnotation`.
 */
export class RubyLayoutOptionsError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "RubyLayoutOptionsError";
  }
}
