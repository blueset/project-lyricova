import type {
  LayoutLine,
  ParagraphLayout,
  ParagraphRequest,
  RangeAdvance,
  RangeAdvanceDistribution,
  ShapeRequest,
} from "@lyricova/glyph-renderer";
import { validateFuriganaAnnotations } from "./furiganaValidation";
import { resolveShapeRun, type ResolvedShapeRun } from "./glyphMetrics";
import { jlreqCharClassAt } from "./jlreqCharClass";
import {
  computeAdjustedLineMetrics,
  computeBaseGroupBounds,
  findLinesForRange,
} from "./linePlacement";
import { isMonoEligible, placeGroupRuby, placeMonoRuby } from "./rubyPlacement";
import {
  collectRubyClearanceLoss,
  resolveRubyVerticalMetrics,
  type RubyVerticalMetrics,
} from "./rubyVerticalMetrics";
import {
  capBudgetToGlyph,
  isFixedWidthRun,
  resolveOverhangBudget,
  resolveOverhangTable,
  type RubyOverhangBudget,
} from "./rubyOverhang";
import {
  measureRubyInkHorizontalExtent,
  measureRubyInkMetrics,
  type GlyphOutlineCache,
} from "./rubyInkMetrics";
import {
  assertFiniteNonNegative,
  assertFinitePositiveSize,
} from "./layoutOptionsValidation";
import {
  DEFAULT_RUBY_FONT_SIZE_RATIO,
  RubyLayoutError,
  RubyLayoutOptionsError,
  type FuriganaAnnotationInput,
  type LinePlacement,
  type NormalizedFuriganaAnnotation,
  type RubyLayoutIssue,
  type RubyLayoutRequest,
  type RubyLayoutResult,
  type RubyLayoutShaper,
  type RubyPlacement,
  type RubyRowMetrics,
  type RubyRun,
} from "./types";

/**
 * Known gaps in this implementation. All are deliberate; each is explained in
 * full at the function that owns it.
 *
 * - **JLReq's base push for unresolvable collisions is not attempted.** When two
 *   ruby runs still overlap after the following run's overhang is spent, JLReq
 *   pushes that annotation's base range right. See {@link resolveCollisions}
 *   for why that needs a second layout pass and cannot be made to converge
 *   cheaply; the residual overlap is reported as a `rubyCollision` issue.
 * - **Overhang budgets are resolved in two stages.** The pre-layout stage sees
 *   only source adjacency, so it cannot know about wrapped line edges or the
 *   neighbour's real advance; the post-layout stage refines both. See
 *   {@link clampBudgetToNeighbours} for the directions in which the two can
 *   disagree, and why each is harmless.
 * - **Out of scope entirely**: vertical writing mode, RTL/bidi ruby, base-text
 *   justification (追込み / 追出し), one-third ruby (三分ルビ), and small-kana
 *   normalisation (cl-11) - ruby content is rendered exactly as provided, with
 *   no ぁ→あ folding. Only `ruby-position: over` on horizontal, left-to-right
 *   text is implemented.
 */

/**
 * Separation, in ruby em, forced between two ruby runs of the same line whose
 * ink would otherwise touch or overlap (JLReq adjacent-ruby resolution).
 */
export const RUBY_COLLISION_SEPARATION_EM = 1.0;

/**
 * Tolerance, in ruby em, for the geometry comparisons in this module. Base
 * expansion is computed in `f32` inside the layout engine, so an expanded base
 * box lands within a fraction of a unit of the ruby width it was sized from
 * rather than exactly on it. Without this slack that residue reads as a real
 * overhang - or a real collision - and produces spurious issues.
 */
const GEOMETRY_EPSILON_EM = 1e-4;

/** Shape options shared by every ruby run of one request. */
type RubyShapeOptions = Omit<ShapeRequest, "text">;

/** Overhang table resolved once per request. */
type OverhangTable = ReturnType<typeof resolveOverhangTable>;

/** A ruby placement whose runs/ink are known, but whose shared row baseline (`y`) isn't resolved yet. */
type PendingRubyPlacement = Omit<RubyPlacement, "y">;

/** Everything derivable from an annotation *before* the base paragraph is laid out. */
interface PreparedAnnotation {
  annotation: NormalizedFuriganaAnnotation;
  /** Whole ruby content shaped once, contextually - never re-shaped afterwards. */
  run: ResolvedShapeRun;
  /**
   * Overhang budget per side, from the adjacent source character's class,
   * except that a boundary shared with another ruby annotation grants none.
   */
  budget: RubyOverhangBudget;
  /** Whether the ruby run itself may have inter-cluster spacing distributed into it. */
  rubySpaceable: boolean;
  /** Minimum advance the base range must occupy once overhang is exhausted. */
  minAdvance: number;
  distribution: RangeAdvanceDistribution;
}

interface RubyLayoutPassContext {
  shaper: RubyLayoutShaper;
  request: RubyLayoutRequest;
  valid: readonly NormalizedFuriganaAnnotation[];
  validationIssues: readonly RubyLayoutIssue[];
  prepared: readonly PreparedAnnotation[];
  rubyFontSize: number;
  rubyRowFontSize: number;
  rubyFontIds: ShapeRequest["fontIds"];
  rubyGap: number;
  rubyAxes: string[] | undefined;
  outlineCache: GlyphOutlineCache;
  forceFullAdvance: ReadonlySet<number>;
}

interface RubyLayoutPassOutput {
  result: RubyLayoutResult;
  /** Issues present at the point `onInvalidAnnotation: "throw"` historically checked. */
  annotationIssues: RubyLayoutIssue[];
}

/**
 * Lays out a paragraph of base text with horizontal furigana ruby
 * (`ruby-position: over`) using `@lyricova/glyph-renderer`, following the
 * JLReq-derived ruby specification.
 *
 * Pipeline:
 * 1. Resolve and validate the layout options, including the clamped ruby font
 *    size (see {@link resolveRubyFontSize}).
 * 2. Validate/convert furigana `leftIndex`/`rightIndex` (see
 *    `furiganaValidation.ts` for why this is necessary despite the API docs).
 * 3. **Pre-shape** every annotation's ruby text and resolve its per-side
 *    overhang budget from the adjacent source characters' JLReq classes.
 *    A boundary shared with another ruby annotation grants no overhang, since
 *    that neighbouring base's ruby already occupies the same row. That yields
 *    each base range's minimum required advance
 *    (`rubyWidth - 2 * min(leftBudget, rightBudget)`), fed to paragraph layout
 *    as a `rangeAdvance` so base expansion is **pre-measured** while the ruby
 *    remains centred: line breaking, cluster positions and line widths are
 *    correct on the first pass, with no iteration in the common case.
 * 4. Lay out the base paragraph, with each base range also passed as a
 *    `noBreakRange` so a base+ruby pair is an unbreakable atom.
 * 5. If JLReq's ruby-aligned line-edge placement makes the composed line
 *    wider than `maxWidth`, retry once with that edge atom reserving the ruby's
 *    full advance. This lets line breaking move following/preceding text away
 *    instead of discovering the ruby width only during painting.
 * 6. Verify every base range landed on exactly one line (a mandatory break
 *    inside a base range could still split one - reported as a
 *    `splitAcrossLines` issue, annotation skipped).
 * 7. Place each ruby run over its (possibly expanded) base box: centred for
 *    mono ruby, nakatsuki 2:1:1 distribution for group ruby, always set solid
 *    for proportional non-CJK runs (see `rubyPlacement.ts`).
 * 8. Resolve overhang against the real adjacent clusters, then run the
 *    per-line collision pass and the line head/end clamp.
 * 9. Reserve one deterministic ruby row above **every** line, so line advance
 *    never jitters between annotated and un-annotated lines.
 *
 * Never throws for malformed `furigana` input by default (`onInvalidAnnotation:
 * "skip"`); every rejected annotation is reported in `result.issues` instead.
 * Pass `onInvalidAnnotation: "throw"` to get a `RubyLayoutError` instead.
 *
 * Request-level sizing options always throw a `RubyLayoutOptionsError` when
 * malformed, regardless of `onInvalidAnnotation`.
 */
export function layoutRubyParagraph(
  shaper: RubyLayoutShaper,
  request: RubyLayoutRequest,
): RubyLayoutResult {
  const {
    text,
    furigana,
    fontIds,
    fontSize,
    rubyFontIds = fontIds,
    rubyGap = 0,
    rubyRowFontSize: requestedRubyRowFontSize,
    rubyOverhang,
    baseDirection,
    script,
    language,
    features,
    variations,
    rubyVariations,
    maxWidth,
    onInvalidAnnotation = "skip",
  } = request;

  // Ruby renders far smaller than its base, so it carries its own optical size.
  // Falling back to the base list keeps callers that do not size-track working.
  const rubyAxes = rubyVariations ?? variations;

  assertFinitePositiveSize(fontSize, "fontSize");
  const rubyFontSize = resolveRubyFontSize(request);
  const rubyRowFontSize = requestedRubyRowFontSize ?? rubyFontSize;
  assertFinitePositiveSize(rubyRowFontSize, "rubyRowFontSize");
  if (rubyRowFontSize < rubyFontSize) {
    throw new RubyLayoutOptionsError(
      `rubyRowFontSize must be greater than or equal to rubyFontSize (got ${rubyRowFontSize} < ${rubyFontSize}).`,
    );
  }
  assertFiniteNonNegative(rubyGap, "rubyGap");

  const { valid, issues } = validateFuriganaAnnotations(text, furigana);
  const overhangTable = resolveOverhangTable(rubyOverhang);
  const annotatedStarts = new Set(
    valid.map((annotation) => annotation.utf16Range[0]),
  );
  const annotatedEnds = new Set(
    valid.map((annotation) => annotation.utf16Range[1]),
  );

  const rubyShapeOptions: RubyShapeOptions = {
    fontIds: rubyFontIds,
    fontSize: rubyFontSize,
    direction: baseDirection,
    script,
    language,
    features,
    variations: rubyAxes,
  };

  const prepared = valid.map((annotation) =>
    prepareAnnotation(
      shaper,
      text,
      annotation,
      rubyShapeOptions,
      rubyFontSize,
      overhangTable,
      {
        left: annotatedEnds.has(annotation.utf16Range[0]),
        right: annotatedStarts.has(annotation.utf16Range[1]),
      },
    ),
  );

  const outlineCache: GlyphOutlineCache = new Map();
  const passContext = {
    shaper,
    request,
    valid,
    validationIssues: issues,
    prepared,
    rubyFontSize,
    rubyRowFontSize,
    rubyFontIds,
    rubyGap,
    rubyAxes,
    outlineCache,
  };
  let selected = layoutRubyPass({
    ...passContext,
    forceFullAdvance: new Set(),
  });

  if (maxWidth !== null && maxWidth !== undefined && maxWidth > 0) {
    const forceFullAdvance = overflowingEdgeAnnotations(
      selected.result,
      maxWidth,
      rubyFontSize * GEOMETRY_EPSILON_EM,
    );
    if (forceFullAdvance.size > 0) {
      selected = layoutRubyPass({ ...passContext, forceFullAdvance });
    }
  }

  if (onInvalidAnnotation === "throw" && selected.annotationIssues.length > 0) {
    throw new RubyLayoutError(selected.annotationIssues);
  }

  return selected.result;
}

function layoutRubyPass(context: RubyLayoutPassContext): RubyLayoutPassOutput {
  const {
    shaper,
    request,
    valid,
    validationIssues,
    prepared,
    rubyFontSize,
    rubyRowFontSize,
    rubyFontIds,
    rubyGap,
    rubyAxes,
    outlineCache,
    forceFullAdvance,
  } = context;
  const {
    text,
    furigana,
    fontIds,
    fontSize,
    reserveRubyRow,
    baseDirection,
    script,
    language,
    features,
    variations,
    maxWidth,
    wrapStrategy,
    phraseRanges,
    lineHeight,
  } = request;
  const issues = [...validationIssues];

  const paragraphRequest: ParagraphRequest = {
    text,
    fontIds,
    fontSize,
    baseDirection,
    script,
    language,
    features,
    variations,
    maxWidth,
    wrapStrategy,
    phraseRanges,
    lineHeight,
    noBreakRanges: valid.map((annotation): [number, number] => [
      annotation.utf16Range[0],
      annotation.utf16Range[1],
    ]),
    rangeAdvances: prepared
      .map((item): RangeAdvance => ({
        start: item.annotation.utf16Range[0],
        end: item.annotation.utf16Range[1],
        minAdvance: forceFullAdvance.has(item.annotation.sourceIndex)
          ? Math.max(item.minAdvance, item.run.width)
          : item.minAdvance,
        distribution: item.distribution,
      }))
      .filter((item) => item.minAdvance > 0),
  };
  const paragraphLayout = shaper.layoutParagraph(paragraphRequest);
  const pendingByLine = new Map<number, PendingRubyPlacement[]>();

  for (const item of prepared) {
    const pending = placeAnnotation(
      shaper,
      paragraphLayout,
      item,
      { rubyFontSize, rubyFontIds, variations: rubyAxes, outlineCache },
      issues,
      furigana,
      text,
    );
    if (!pending) continue;
    const list = pendingByLine.get(pending.lineIndex) ?? [];
    list.push(pending);
    pendingByLine.set(pending.lineIndex, list);
  }
  const annotationIssues = [...issues];

  const epsilon = rubyFontSize * GEOMETRY_EPSILON_EM;
  for (const pendingList of pendingByLine.values()) {
    resolveCollisions(pendingList, rubyFontSize, epsilon, issues, furigana);
  }

  const placements = [...pendingByLine.values()].flat();
  // Always resolve what *this* paragraph's own fonts need, even when the caller
  // supplies a shared anchor. A caller accumulating a document-wide maximum has
  // to see the natural value: if we only echoed the anchor back, the first
  // annotated line would pin it forever and a later line needing a taller box
  // would silently be laid out against the smaller one.
  const annotatedBases = annotatedBaseFonts(
    paragraphLayout,
    placements,
    fontSize,
  );
  const naturalRubyMetrics = resolveRubyVerticalMetrics(
    shaper,
    annotatedBases.fonts,
    rubyFonts(placements),
    { baseInkAscentEm: annotatedBases.inkAscentEm },
  );
  const verticalMetrics = request.rubyMetrics ?? naturalRubyMetrics;
  const rubyRow = resolveRubyRowMetrics(
    paragraphLayout,
    fontSize,
    rubyRowFontSize,
    rubyGap,
    reserveRubyRow ?? pendingByLine.size > 0,
    verticalMetrics,
  );
  reportRubyClearanceLoss(
    paragraphLayout,
    placements,
    verticalMetrics,
    fontSize,
    rubyRowFontSize,
    rubyGap,
    issues,
  );
  const adjustedMetrics = computeAdjustedLineMetrics(
    paragraphLayout.lines,
    rubyRow.height,
  );

  const lines: LinePlacement[] = paragraphLayout.lines.map((line, index) => {
    const pendingList = pendingByLine.get(index) ?? [];
    const box = clampLineBox(
      line,
      pendingList,
      maxWidth ?? null,
      epsilon,
      issues,
      furigana,
    );
    return {
      lineIndex: index,
      line,
      top: adjustedMetrics[index]!.top,
      baseline: adjustedMetrics[index]!.baseline,
      height: adjustedMetrics[index]!.height,
      contentOffsetX: box.contentOffsetX,
      occupiedWidth: box.occupiedWidth,
      rubies: pendingList.map((pending) => ({
        ...pending,
        y: rubyRow.baseline,
      })),
    };
  });

  const lastMetrics = adjustedMetrics[adjustedMetrics.length - 1];
  const result: RubyLayoutResult = {
    lines,
    height: lastMetrics ? lastMetrics.top + lastMetrics.height : 0,
    width: lines.reduce((max, line) => Math.max(max, line.occupiedWidth), 0),
    baseDirection: paragraphLayout.baseDirection,
    rubyRow,
    rubyMetrics: verticalMetrics,
    naturalRubyMetrics,
    rubies: lines.flatMap((line) => line.rubies),
    issues,
    missingFontRanges: paragraphLayout.missingFontRanges ?? [],
  };
  return { result, annotationIssues };
}

function overflowingEdgeAnnotations(
  result: RubyLayoutResult,
  maxWidth: number,
  epsilon: number,
): Set<number> {
  const sourceIndexes = new Set<number>();
  for (const line of result.lines) {
    if (line.occupiedWidth <= maxWidth + epsilon) continue;
    for (const ruby of line.rubies) {
      const [start, end] = ruby.annotation.utf16Range;
      if (
        start === line.line.source.utf16Start ||
        end === line.line.source.utf16End
      ) {
        sourceIndexes.add(ruby.annotation.sourceIndex);
      }
    }
  }
  return sourceIndexes;
}

/**
 * Resolves the ruby font size as `clamp(fontSize * ratio, min, max)`.
 *
 * The ratio keeps ruby readable as a responsive base size shrinks; the
 * absolute cap keeps it from becoming distracting as the base grows, and
 * takes precedence over the ratio. Both bounds are **caller-supplied layout
 * parameters** - the right value depends on the consuming design (player
 * overlay vs. editor vs. print-like export), so this engine bakes in no pixel
 * constant and defaults to uncapped, ratio-only behaviour.
 *
 * An explicit `rubyFontSize` bypasses the whole computation.
 */
export function resolveRubyFontSize(request: {
  fontSize: number;
  rubyFontSize?: number;
  rubyFontSizeRatio?: number;
  rubyFontSizeMin?: number;
  rubyFontSizeMax?: number;
}): number {
  if (request.rubyFontSize !== undefined) {
    assertFinitePositiveSize(request.rubyFontSize, "rubyFontSize");
    return request.rubyFontSize;
  }

  const ratio = request.rubyFontSizeRatio ?? DEFAULT_RUBY_FONT_SIZE_RATIO;
  assertFinitePositiveSize(ratio, "rubyFontSizeRatio");
  const min = request.rubyFontSizeMin ?? 0;
  assertFiniteNonNegative(min, "rubyFontSizeMin");
  if (request.rubyFontSizeMax !== undefined) {
    assertFinitePositiveSize(request.rubyFontSizeMax, "rubyFontSizeMax");
  }

  const size = Math.min(
    Math.max(request.fontSize * ratio, min),
    request.rubyFontSizeMax ?? Infinity,
  );
  assertFinitePositiveSize(size, "rubyFontSize");
  return size;
}

/**
 * Deterministic geometry of the ruby row reserved above every line.
 *
 * The row is anchored to the **typographic boxes** of the fonts in use (see
 * {@link RubyVerticalMetrics}), never to measured ink, so line advance cannot
 * depend on which lines happen to carry furigana:
 *
 * ```text
 *   line top ─────────────────────────  y = 0
 *              rubyAscent
 *   ruby baseline ───────────────────
 *              rubyDescent
 *              rubyGap                  ← the only tunable clearance
 *   base sTypo top ──────────────────
 *              baseAscent
 *   base baseline ───────────────────   y = height + paragraphAscent
 * ```
 *
 * The reserved `height` is therefore whatever the stack above needs *beyond*
 * the line's own ascent. When the paragraph's ascent already exceeds it the
 * row collapses to `0` and the ruby simply sits inside the existing ascent -
 * still never above the line top, since `height` only clamps once
 * `paragraphAscent >= baseAscent + rubyGap + rubyDescent + rubyAscent`.
 */
export function resolveRubyRowMetrics(
  paragraph: Pick<ParagraphLayout, "ascent" | "descent">,
  fontSize: number,
  rubyRowFontSize: number,
  rubyGap: number,
  reserve: boolean,
  metrics: RubyVerticalMetrics | null,
): RubyRowMetrics {
  if (!reserve) return { height: 0, baseline: 0, fontSize: rubyRowFontSize };

  // Without usable font metrics, fall back to the paragraph's own (hhea-based)
  // ratios: less faithful, but never worse than having no row at all.
  const resolved = metrics ?? {
    baseAscentEm: paragraph.ascent / fontSize,
    rubyAscentEm: paragraph.ascent / fontSize,
    rubyDescentEm: paragraph.descent / fontSize,
  };

  const baseAscent = resolved.baseAscentEm * fontSize;
  const rubyAscent = resolved.rubyAscentEm * rubyRowFontSize;
  const rubyDescent = resolved.rubyDescentEm * rubyRowFontSize;
  const height = Math.max(
    0,
    baseAscent + rubyGap + rubyDescent + rubyAscent - paragraph.ascent,
  );
  return {
    height,
    baseline: height + paragraph.ascent - baseAscent - rubyGap - rubyDescent,
    fontSize: rubyRowFontSize,
  };
}

/**
 * Fonts that shaped base clusters inside an *annotated* range. Unannotated runs
 * are excluded on purpose: nothing is placed above them, so their box must not
 * inflate the ruby row.
 */
/**
 * The fonts shaping *annotated* base ranges, along with the tallest ink each one
 * actually reaches there (as a fraction of `fontSize`).
 *
 * The ink figure caps how much space that font may reserve above the base: a
 * font whose `sTypo` box is really a line box (Mona Sans fills it with `hhea`)
 * would otherwise lift the shared ruby row for the whole document. Unannotated
 * runs are excluded - no ruby sits above them.
 */
function annotatedBaseFonts(
  paragraph: ParagraphLayout,
  placements: readonly PendingRubyPlacement[],
  fontSize: number,
): { fonts: Set<number>; inkAscentEm: Map<number, number> } {
  const fonts = new Set<number>();
  const inkAscentEm = new Map<number, number>();
  const usableSize = fontSize > 0 ? fontSize : 1;
  for (const placement of placements) {
    const [start, end] = placement.annotation.utf16Range;
    for (const cluster of paragraph.lines[placement.lineIndex]!.clusters) {
      if (
        cluster.source.utf16Start >= start &&
        cluster.source.utf16End <= end
      ) {
        fonts.add(cluster.fontId);
        const em = cluster.bounds.yMax / usableSize;
        inkAscentEm.set(
          cluster.fontId,
          Math.max(inkAscentEm.get(cluster.fontId) ?? 0, em),
        );
      }
    }
  }
  return { fonts, inkAscentEm };
}

/** Fonts that shaped ruby glyphs; the ruby chain may fall back per grapheme. */
function rubyFonts(placements: readonly PendingRubyPlacement[]): Set<number> {
  const fonts = new Set<number>();
  for (const placement of placements) {
    for (const run of placement.runs) {
      for (const glyph of run.glyphs) fonts.add(glyph.fontId);
    }
  }
  return fonts;
}

/**
 * Records ruby that actually reaches into the base text, once per ruby font.
 *
 * See `collectRubyClearanceLoss` for why this compares ink against ink rather
 * than against the declared `sTypo` box: fonts overshoot that box routinely and
 * harmlessly, so only a genuine collision is worth reporting.
 */
function reportRubyClearanceLoss(
  paragraph: ParagraphLayout,
  placements: readonly PendingRubyPlacement[],
  metrics: RubyVerticalMetrics | null,
  fontSize: number,
  rubyRowFontSize: number,
  rubyGap: number,
  issues: RubyLayoutIssue[],
): void {
  if (!metrics || placements.length === 0) return;

  const annotations = placements.map((placement) => {
    const [start, end] = placement.annotation.utf16Range;
    let baseInkTop = 0;
    for (const cluster of paragraph.lines[placement.lineIndex]!.clusters) {
      if (
        cluster.source.utf16Start >= start &&
        cluster.source.utf16End <= end
      ) {
        baseInkTop = Math.max(baseInkTop, cluster.bounds.yMax);
      }
    }
    return {
      rubyFontIds: rubyFonts([placement]),
      baseInkTop,
      rubyInkDescent: placement.inkDescent,
    };
  });

  const losses = collectRubyClearanceLoss(annotations, {
    baseTypoTop: metrics.baseAscentEm * fontSize,
    rubyReservedDescent: metrics.rubyDescentEm * rubyRowFontSize,
    rubyGap,
  });
  for (const loss of losses) {
    issues.push({ kind: "rubyClearanceLost", ...loss });
  }
}

function prepareAnnotation(
  shaper: RubyLayoutShaper,
  text: string,
  annotation: NormalizedFuriganaAnnotation,
  rubyShapeOptions: RubyShapeOptions,
  rubyFontSize: number,
  overhangTable: OverhangTable,
  adjacentRuby: Readonly<{ left: boolean; right: boolean }>,
): PreparedAnnotation {
  const [utf16Start, utf16End] = annotation.utf16Range;
  const run = resolveShapeRun(
    shaper.shape({ text: annotation.content, ...rubyShapeOptions }),
  );
  const classBudget = resolveOverhangBudget(
    text,
    utf16Start,
    utf16End,
    rubyFontSize,
    overhangTable,
  );
  const budget = {
    left: adjacentRuby.left ? 0 : classBudget.left,
    right: adjacentRuby.right ? 0 : classBudget.right,
  };

  // Proportional (Latin/Cyrillic/Hangul/digit) base runs are never
  // letterspaced: their excess is absorbed by inter-word whitespace when there
  // is any, and by the two edge gaps alone otherwise.
  const baseSpaceable = isFixedWidthRun(text.slice(utf16Start, utf16End));

  return {
    annotation,
    run,
    budget,
    rubySpaceable: isFixedWidthRun(annotation.content),
    // Horizontal ruby stays centred over its base. Base expansion must
    // therefore make the *same* half-overhang fit on both sides; spare budget
    // on one side cannot compensate for a tighter opposite side.
    minAdvance: Math.max(
      0,
      run.width - 2 * Math.min(budget.left, budget.right),
    ),
    distribution: baseSpaceable ? "even" : "whitespace",
  };
}

interface RubyMeasureContext {
  rubyFontSize: number;
  rubyFontIds: ShapeRequest["fontIds"];
  variations: string[] | undefined;
  outlineCache: GlyphOutlineCache;
}

function placeAnnotation(
  shaper: RubyLayoutShaper,
  paragraphLayout: ParagraphLayout,
  item: PreparedAnnotation,
  context: RubyMeasureContext,
  issues: RubyLayoutIssue[],
  rawAnnotations: readonly FuriganaAnnotationInput[],
  text: string,
): PendingRubyPlacement | null {
  const { annotation, run } = item;
  const rawAnnotation = rawAnnotations[annotation.sourceIndex]!;
  const [utf16Start, utf16End] = annotation.utf16Range;
  const lineIndices = findLinesForRange(
    paragraphLayout.lines,
    utf16Start,
    utf16End,
  );
  if (lineIndices.length !== 1) {
    issues.push({
      kind: "splitAcrossLines",
      annotation: rawAnnotation,
      lineIndices,
    });
    return null;
  }

  const lineIndex = lineIndices[0]!;
  const line = paragraphLayout.lines[lineIndex]!;
  const bounds = computeBaseGroupBounds(line, utf16Start, utf16End);
  if (!bounds) {
    issues.push({
      kind: "splitAcrossLines",
      annotation: rawAnnotation,
      lineIndices: [],
    });
    return null;
  }

  const baseGraphemeCount =
    annotation.graphemeRange[1] - annotation.graphemeRange[0];
  const mono = isMonoEligible(baseGraphemeCount, bounds.clusters.length);
  const baseX: readonly [number, number] = [bounds.xStart, bounds.xEnd];

  // A single annotated grapheme takes its reading as one contextual run
  // centred over it, with no inter-cluster redistribution.
  const placed = mono
    ? placeMonoRuby(bounds.clusters, [
        { contentRange: [0, annotation.content.length], run },
      ]).runs
    : placeGroupRuby(baseX, run, annotation.content, {
        rubyFontSize: context.rubyFontSize,
        spaceable: item.rubySpaceable,
      });

  const runs = validateCenteredOverhang(
    placed,
    baseX,
    clampBudgetToNeighbours(text, line, utf16Start, utf16End, item.budget),
    context.rubyFontSize * GEOMETRY_EPSILON_EM,
    issues,
    rawAnnotation,
  );

  // Measure this annotation's *actual* ink from the real glyphs/font(s) it was
  // shaped with - the ruby fallback chain may resolve different graphemes to
  // different fonts - never approximated from base paragraph metrics.
  const { ascent: inkAscent, descent: inkDescent } = measureRubyInkMetrics(
    shaper,
    runs.flatMap((r) => r.glyphs),
    context.rubyFontSize,
    context.variations,
    context.outlineCache,
  );
  const { left: inkLeft, right: inkRight } = measureRubyInkHorizontalExtent(
    shaper,
    runs,
    context.rubyFontSize,
    context.variations,
    context.outlineCache,
  );

  return {
    annotation,
    mode: mono ? "mono" : "group",
    lineIndex,
    baseX,
    inkAscent,
    inkDescent,
    inkLeft,
    inkRight,
    fontSize: context.rubyFontSize,
    fontIds: context.rubyFontIds,
    runs,
  };
}

/**
 * Caps each side's class budget at the adjacent cluster's own advance when
 * that class is glyph-limited (brackets, full stops, commas): JLReq allows
 * ruby over the punctuation itself but never past it.
 *
 * Also resolves the *line* edge, which the source-offset pass cannot see: when
 * the adjacent character exists in the text but wrapped onto another line,
 * there is nothing on this line to overhang onto, so the ruby is treated as
 * line-head/line-end aligned (unbounded here, then clamped to the line's
 * content box).
 *
 * That makes this budget differ from the pre-layout one used to size
 * `minAdvance`, in two directions, both benign:
 * - **Smaller here** (a narrow glyph-limited neighbour): the base was expanded
 *   using the wider class budget, so slightly less overhang is available than
 *   assumed. The excess is clamped and reported as `overhangClamped`.
 * - **Larger here** (`Infinity`, because the neighbour wrapped away): the base
 *   was expanded as if that side granted nothing, so the ruby simply has more
 *   room than it needs and no expansion is wasted beyond that line's own width.
 *
 * Closing the gap would mean resolving budgets after line breaking and then
 * re-breaking with the corrected `minAdvance` - the same non-convergent loop
 * described on {@link resolveCollisions}.
 */
function clampBudgetToNeighbours(
  text: string,
  line: LayoutLine,
  utf16Start: number,
  utf16End: number,
  budget: RubyOverhangBudget,
): RubyOverhangBudget {
  const clusterAt = (utf16Index: number) =>
    line.clusters.find(
      (c) =>
        c.source.utf16Start <= utf16Index && utf16Index < c.source.utf16End,
    );
  const side = (utf16Index: number, sideBudget: number): number => {
    const cluster = clusterAt(utf16Index);
    if (!cluster) return Infinity;
    return capBudgetToGlyph(
      sideBudget,
      jlreqCharClassAt(text, utf16Index),
      cluster.advance,
    );
  };
  return {
    left: side(utf16Start - 1, budget.left),
    right: side(utf16End, budget.right),
  };
}

/**
 * Verifies that an already-centred ruby run stays inside each side's overhang
 * budget.
 *
 * JLReq's horizontal nakatsuki rule keeps the ruby and base centres aligned;
 * line-head/line-end alignment moves that whole complex, not the ruby relative
 * to its base (Figure 141). `minAdvance` pre-expands the base so the centred
 * half-overhang fits the tighter side. This check only reports the rare case
 * where the real post-layout budget is smaller than the pre-layout estimate
 * (for example, a narrow glyph-limited punctuation neighbour), or where a
 * shaper did not honour the requested range advance.
 */
function validateCenteredOverhang(
  runs: readonly RubyRun[],
  baseX: readonly [number, number],
  budget: RubyOverhangBudget,
  epsilon: number,
  issues: RubyLayoutIssue[],
  rawAnnotation: FuriganaAnnotationInput,
): RubyRun[] {
  if (runs.length === 0) return [...runs];
  const runsLeft = Math.min(...runs.map((r) => r.x));
  const runsRight = Math.max(...runs.map((r) => r.x + r.width));
  const overhang = {
    left: Math.max(0, baseX[0] - runsLeft),
    right: Math.max(0, runsRight - baseX[1]),
  };
  for (const side of ["left", "right"] as const) {
    if (overhang[side] <= budget[side] + epsilon) continue;
    issues.push({
      kind: "overhangClamped",
      annotation: rawAnnotation,
      side,
      requested: overhang[side],
      allowed: budget[side],
    });
  }
  return [...runs];
}

/**
 * Resolves collisions between the ruby runs of one line, left to right in a
 * single deterministic pass.
 *
 * The **preceding** run is always kept as-is; only the following run moves,
 * reducing its own left overhang to insert up to
 * {@link RUBY_COLLISION_SEPARATION_EM} ruby em of separation.
 *
 * The shift is hard-capped at the overhang that run actually has, so a ruby is
 * never pushed off the characters it annotates. That cap matters: once base
 * expansion has run, two adjacent annotated bases each carry a ruby that
 * exactly fills its own (expanded) box, so their runs *touch* at the shared
 * boundary with no overhang left to trade. Forcing separation there would slide
 * every ruby of a fully romanized line further and further right of its own
 * base, which is far worse than adjacency - so touching runs are left alone.
 *
 * JLReq would instead push the following base range right by the shortfall.
 * That is expressible - adding `2 x shortfall` to the range's `minAdvance`
 * displaces the box centre by `shortfall` - but only on a **second layout
 * pass**, because expansion is an input to line breaking rather than an output.
 * Re-running it feeds back: the widened range can move the annotation onto a
 * different line, dissolving the collision that motivated the push while
 * leaving the base permanently wider and creating fresh adjacencies. Making
 * that converge needs bounded iteration and a tie-break for annotations that
 * oscillate across a break, so a `rubyCollision` issue is recorded instead, and
 * only for the case that actually harms legibility: runs that still **overlap**
 * once the follower's overhang is spent.
 */
function resolveCollisions(
  pendingList: PendingRubyPlacement[],
  rubyFontSize: number,
  epsilon: number,
  issues: RubyLayoutIssue[],
  rawAnnotations: readonly FuriganaAnnotationInput[],
): void {
  if (pendingList.length < 2) return;
  pendingList.sort((a, b) => a.baseX[0] - b.baseX[0]);
  const separation = RUBY_COLLISION_SEPARATION_EM * rubyFontSize;

  for (let index = 1; index < pendingList.length; index++) {
    const previous = pendingList[index - 1]!;
    const current = pendingList[index]!;
    if (current.inkLeft > previous.inkRight + epsilon) continue;

    const wanted = previous.inkRight + separation - current.inkLeft;
    const available = Math.max(0, current.baseX[0] - current.inkLeft);
    shiftPlacement(current, Math.min(Math.max(wanted, 0), available));

    const overlap = previous.inkRight - current.inkLeft;
    if (overlap > epsilon) {
      issues.push({
        kind: "rubyCollision",
        annotation: rawAnnotations[current.annotation.sourceIndex]!,
        other: rawAnnotations[previous.annotation.sourceIndex]!,
        shortfall: overlap,
      });
    }
  }
}

function shiftPlacement(placement: PendingRubyPlacement, delta: number): void {
  if (delta === 0) return;
  placement.runs = placement.runs.map((run) => ({ ...run, x: run.x + delta }));
  placement.inkLeft += delta;
  placement.inkRight += delta;
}

interface LineBox {
  contentOffsetX: number;
  occupiedWidth: number;
}

interface LineHorizontalBounds {
  left: number;
  right: number;
}

function lineHorizontalBounds(
  line: LayoutLine,
  pendingList: readonly PendingRubyPlacement[],
): LineHorizontalBounds {
  return {
    left: Math.min(0, ...pendingList.map((pending) => pending.inkLeft)),
    right: Math.max(
      line.width,
      ...pendingList.map((pending) => pending.inkRight),
    ),
  };
}

/**
 * Resolves a line's true occupied box under JLReq's *ruby-aligned* line head
 * and line end: overhanging ruby ink sticks out past the base text, and the
 * ruby - not the base - sits flush with the line edge.
 *
 * Ruby must never leave the hanmen, so rather than clipping, the line's whole
 * content is shifted inward by however far its ruby overhangs to the left.
 * Right-overhanging ruby that can fit is pulled inward without letting that
 * shift create a new left overflow. An annotation intrinsically wider than
 * the box is left intact and reported as `rubyTooWide`, so a higher layer can
 * deliberately scale it instead of silently clipping it.
 */
function clampLineBox(
  line: LayoutLine,
  pendingList: PendingRubyPlacement[],
  maxWidth: number | null,
  epsilon: number,
  issues: RubyLayoutIssue[],
  rawAnnotations: readonly FuriganaAnnotationInput[],
): LineBox {
  if (pendingList.length === 0) {
    return { contentOffsetX: 0, occupiedWidth: line.width };
  }

  if (maxWidth !== null && Number.isFinite(maxWidth) && maxWidth > 0) {
    const tooWide = new Set<PendingRubyPlacement>();
    for (const pending of pendingList) {
      const width = pending.inkRight - pending.inkLeft;
      if (width <= maxWidth + epsilon) continue;
      tooWide.add(pending);
      issues.push({
        kind: "rubyTooWide",
        annotation: rawAnnotations[pending.annotation.sourceIndex]!,
        width,
        maxWidth,
      });
    }

    for (const pending of pendingList) {
      if (tooWide.has(pending)) continue;
      const bounds = lineHorizontalBounds(line, pendingList);
      const overflow = pending.inkRight - (bounds.left + maxWidth);
      if (overflow <= epsilon) continue;

      // Shifting farther than this would make the annotation establish a new
      // left edge, replacing right overflow with equal left overflow.
      const available = Math.max(0, pending.inkLeft - bounds.left);
      const shift = Math.min(overflow, available);
      if (shift <= epsilon) continue;
      issues.push({
        kind: "outsideLineBox",
        annotation: rawAnnotations[pending.annotation.sourceIndex]!,
        side: "right",
        overflow,
      });
      shiftPlacement(pending, -shift);
    }
  }

  const bounds = lineHorizontalBounds(line, pendingList);
  return {
    contentOffsetX: -bounds.left,
    occupiedWidth: bounds.right - bounds.left,
  };
}
