import type {
  FontId,
  FontMetrics,
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
import type { JlreqCharClass } from "./jlreqCharClass";
import type { RubyVerticalMetrics } from "./rubyVerticalMetrics";

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
  /**
   * Vertical metrics of one registered font. Used to anchor the ruby row to
   * the `OS/2` **sTypo** box of the fonts that actually shaped the text,
   * instead of the chain's first font's `hhea` line box - see
   * `rubyVerticalMetrics.ts` for why that distinction matters.
   */
  fontMetrics(fontId: FontId): FontMetrics;
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
    }
  | {
      /**
       * The ruby run needed more overhang on one side than the adjacent
       * character's JLReq class permits (see `rubyOverhang.ts`). It was
       * clamped to the budget and re-centered as closely as possible.
       */
      kind: "overhangClamped";
      annotation: FuriganaAnnotationInput;
      side: "left" | "right";
      /** Overhang the ruby wanted on that side, in layout units. */
      requested: number;
      /** Overhang actually granted, in layout units. */
      allowed: number;
    }
  | {
      /**
       * Two ruby runs on one line still **overlap** after the following run's
       * left overhang was spent (JLReq adjacent-ruby resolution (b)). The run
       * is never pushed past its own base to force them apart, so the residual
       * overlap is reported instead. `shortfall` is that overlap, in layout
       * units. Runs that merely end up adjacent are not reported: that is the
       * expected outcome of base expansion, not a defect.
       */
      kind: "rubyCollision";
      annotation: FuriganaAnnotationInput;
      other: FuriganaAnnotationInput;
      /** Overlap, in layout units, that overhang reduction could not remove. */
      shortfall: number;
    }
  | {
      /**
       * Ruby ink shaped with this font actually reaches into the base text
       * below it. Reported once per ruby font rather than per annotation,
       * because it follows from the font's design (its ink descends further
       * than the `OS/2` sTypo box the row is anchored to) rather than from one
       * line. The remedy is a larger `rubyGap`.
       *
       * Fonts overshooting their sTypo box is normal and harmless on its own,
       * so this fires only on a genuine collision - see
       * `collectRubyClearanceLoss` in `rubyVerticalMetrics.ts`.
       */
      kind: "rubyClearanceLost";
      fontId: FontId;
      /** How far ruby ink and base ink overlap, in layout units. */
      overlap: number;
    }
  | {
      /**
       * The ruby run's ink would have extended past the line's content box
       * (hanmen) and was clamped inward (JLReq line head/end handling).
       */
      kind: "outsideLineBox";
      annotation: FuriganaAnnotationInput;
      side: "left" | "right";
      /** How far past the content box the ink reached, in layout units. */
      overflow: number;
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

/**
 * Horizontal ruby placement strategy (CSS `ruby-position: over` scope only).
 *
 * `"under"`, vertical writing mode and RTL/bidi ruby are out of scope for this
 * layer, as are base-text justification, one-third ruby (三分ルビ) and
 * small-kana normalisation - see the "known gaps" note at the top of
 * `rubyLayout.ts`.
 */
export type RubyPosition = "over";

/** Default ruby-to-base font size ratio (JLReq's half-size ruby). */
export const DEFAULT_RUBY_FONT_SIZE_RATIO = 0.5;

export interface RubyLayoutOptions {
  /** Ordered font fallback chain used to shape both the base text and ruby text. */
  fontIds: FontId[];
  /** Base text font size, in the units advances/positions are returned in (e.g. CSS px). */
  fontSize: number;
  /**
   * Explicit ruby font size. Overrides the whole
   * {@link RubyLayoutOptions.rubyFontSizeRatio}/{@link RubyLayoutOptions.rubyFontSizeMin}/{@link RubyLayoutOptions.rubyFontSizeMax}
   * computation (kept for backward compatibility); must still be a finite
   * positive size.
   */
  rubyFontSize?: number;
  /**
   * Ruby size as a fraction of {@link RubyLayoutOptions.fontSize}. Defaults to
   * {@link DEFAULT_RUBY_FONT_SIZE_RATIO}. This is the *relative* behaviour:
   * ruby tracks a responsive base size, so it stays readable as the base
   * shrinks.
   */
  rubyFontSizeRatio?: number;
  /**
   * Absolute floor for the computed ruby size, in the same units as
   * {@link RubyLayoutOptions.fontSize}. Defaults to `0` (disabled).
   * Caller-supplied: the right value depends on the consuming design, so no
   * pixel constant is baked into this engine.
   */
  rubyFontSizeMin?: number;
  /**
   * Absolute cap for the computed ruby size, in the same units as
   * {@link RubyLayoutOptions.fontSize}, so ruby stays non-distracting at large
   * base sizes. Defaults to `Infinity` (uncapped, ratio-only behaviour); the
   * cap takes precedence over the ratio. Caller-supplied for the same reason
   * as {@link RubyLayoutOptions.rubyFontSizeMin}.
   */
  rubyFontSizeMax?: number;
  /** Font fallback chain for ruby text. Defaults to `fontIds`. */
  rubyFontIds?: FontId[];
  /** Only horizontal `"over"` placement is implemented; defaults to `"over"`. */
  rubyPosition?: RubyPosition;
  /** Extra gap between the ruby row and the base text's ascent line. Defaults to `0`. */
  rubyGap?: number;
  /**
   * Whether *every* line reserves a ruby row, so line advance is uniform and
   * lines never jitter between annotated and un-annotated ones.
   *
   * This is a **document-level** decision: the caller, which has access to the
   * whole lyrics file, should pass `true` when *any* line in the file carries
   * at least one ruby annotation, even though rendering happens per line.
   * When omitted it falls back to the paragraph-local answer (reserve iff this
   * paragraph placed at least one ruby), which is only correct for a
   * single-paragraph document.
   */
  reserveRubyRow?: boolean;
  /**
   * Maximum ruby overhang per adjacent JLReq character class, in **ruby em**
   * (multiples of the resolved ruby font size). Merged over
   * `DEFAULT_RUBY_OVERHANG`; see `jlreqCharClass.ts` for the classes and
   * `rubyOverhang.ts` for how the per-side budgets are resolved.
   */
  rubyOverhang?: Partial<Record<JlreqCharClass, number>>;
  /**
   * Shared vertical anchors for the ruby row (see {@link RubyVerticalMetrics}).
   *
   * Like {@link RubyLayoutOptions.reserveRubyRow} this is a **document-level**
   * decision: computed once over the whole lyrics file and passed to every
   * paragraph, so line advance and ruby height stay identical across lines
   * whose scripts - and therefore whose fonts - differ. When omitted they are
   * derived from the fonts this paragraph actually used, which is correct in
   * isolation but varies between paragraphs.
   */
  rubyMetrics?: RubyVerticalMetrics;
  baseDirection?: TextDirection;
  script?: string | null;
  language?: string | null;
  features?: string[];
  /** Variable-font axes for the **base** text. */
  variations?: string[];
  /**
   * Variable-font axes for the **ruby** text. Ruby renders far smaller than its
   * base, so a size-tracking axis such as `opsz` must differ between the two.
   * Defaults to {@link variations}.
   */
  rubyVariations?: string[];
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
   * `"mono"`: the annotation covers exactly one base grapheme (which shaped
   * to exactly one cluster), so its ruby is shaped as a single contextual run
   * and centered over that cluster. `"group"`: the annotation covers more
   * than one base grapheme, so the ruby run is centered/distributed over the
   * whole base range (group-/jukugo-ruby).
   *
   * The mode follows the *input data* - upstream already emits one annotation
   * per base grapheme wherever a clean 1:1 mapping exists - rather than being
   * re-derived from grapheme counts.
   */
  mode: "mono" | "group";
  lineIndex: number;
  /**
   * Line-relative x-range spanned by the base clusters this ruby annotates,
   * **including** any JLReq base expansion inserted around them (see
   * `ShapedCluster.leadingSpace`/`trailingSpace`).
   */
  baseX: readonly [number, number];
  /**
   * Line-relative y position of the ruby row's baseline. Shared by every ruby
   * annotation of the whole layout: the row is reserved deterministically
   * from the resolved ruby font size and `rubyGap` (see
   * {@link RubyLayoutResult.rubyRow}), never from per-line measured ink, so
   * line advance is uniform across the document.
   */
  y: number;
  /**
   * This annotation's own measured ink ascent (height above the ruby
   * baseline), derived from the actual outlines of the glyphs it shaped
   * (see `rubyInkMetrics.ts`) - not approximated from base paragraph
   * metrics. `0` if none of its glyphs have a drawable outline.
   *
   * Used for ink bounds / clipping only. It deliberately does **not** drive
   * line advance any more; see {@link RubyLayoutResult.rubyRow}.
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
  /**
   * Horizontal offset (`>= 0`) that must be added to **both** base cluster
   * and ruby x positions when drawing this line.
   *
   * JLReq sets the line head/end "ruby-aligned": overhanging ruby ink sticks
   * out past the base text and the *ruby*, not the base, is flush with the
   * line edge. Rather than clipping that ink, the line's content is shifted
   * inward by exactly the amount the ruby overhangs to the left.
   */
  contentOffsetX: number;
  /**
   * True width occupied by this line once ruby overhang is included, i.e.
   * `max(line.width, rightmost ruby ink) - min(0, leftmost ruby ink)`. This
   * is the box the line should be aligned/centered within, not `line.width`.
   */
  occupiedWidth: number;
  rubies: RubyPlacement[];
}

/**
 * Deterministic vertical geometry of the single ruby row reserved above every
 * line. Derived from the resolved ruby font size, the base font's em-relative
 * ascent/descent, and `rubyGap` - never from per-line measured ink - so every
 * line advances identically whether or not it carries ruby.
 */
export interface RubyRowMetrics {
  /** Total height reserved above each line's original box (`0` when no row is reserved). */
  height: number;
  /** Offset of the ruby baseline from the top of the reserved row. */
  baseline: number;
  /** Resolved ruby font size used for the row and every ruby run. */
  fontSize: number;
}

export interface RubyLayoutResult {
  lines: LinePlacement[];
  /** Total paragraph height, including reserved ruby rows. */
  height: number;
  /**
   * Widest {@link LinePlacement.occupiedWidth}, i.e. the true occupied box
   * including ruby overhang - not just the base text's advance width.
   */
  width: number;
  baseDirection: TextDirection;
  /** Deterministic geometry of the reserved ruby row (see {@link RubyRowMetrics}). */
  rubyRow: RubyRowMetrics;
  /**
   * The vertical anchors the row was built from - either the caller's
   * {@link RubyLayoutOptions.rubyMetrics} or the ones derived from the fonts
   * this paragraph used. `null` when no font was involved (no ruby, no
   * caller-supplied value).
   *
   * Exposed so a caller laying out many paragraphs can widen a shared value
   * across the document and re-run with it, keeping every line's row identical.
   */
  rubyMetrics: RubyVerticalMetrics | null;
  /**
   * What **this paragraph's own** fonts need, independent of any supplied
   * {@link RubyLayoutOptions.rubyMetrics}. Identical to {@link rubyMetrics}
   * when the caller supplied none.
   *
   * This is the value to accumulate a document-wide maximum from:
   * {@link rubyMetrics} echoes back whatever was passed in, so widening from it
   * would pin the anchor to the first annotated paragraph forever.
   */
  naturalRubyMetrics: RubyVerticalMetrics | null;
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
