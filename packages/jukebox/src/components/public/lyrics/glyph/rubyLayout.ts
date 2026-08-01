import type { ParagraphRequest, ShapeRequest } from "@lyricova/glyph-renderer";
import { validateFuriganaAnnotations } from "./furiganaValidation";
import { countGraphemes, splitGraphemes } from "./graphemeUtils";
import { resolveShapeRun } from "./glyphMetrics";
import {
  computeAdjustedLineMetrics,
  computeBaseGroupBounds,
  findLinesForRange,
} from "./linePlacement";
import { isMonoEligible, placeGroupRuby, placeMonoRuby } from "./rubyPlacement";
import type { MonoRubyGraphemeInput } from "./rubyPlacement";
import {
  combineRubyInkMetrics,
  measureRubyInkHorizontalExtent,
  measureRubyInkMetrics,
  type GlyphOutlineCache,
  type RubyInkMetrics,
} from "./rubyInkMetrics";
import {
  assertFiniteNonNegative,
  assertFinitePositiveSize,
} from "./layoutOptionsValidation";
import {
  RubyLayoutError,
  type LinePlacement,
  type NormalizedFuriganaAnnotation,
  type RubyLayoutIssue,
  type RubyLayoutRequest,
  type RubyLayoutResult,
  type RubyLayoutShaper,
  type RubyPlacement,
} from "./types";

const DEFAULT_RUBY_FONT_SIZE_RATIO = 0.5;

/** A ruby placement whose glyphs/runs/ink metrics are known, but whose shared per-line baseline (`y`) isn't resolved yet. */
type PendingRubyPlacement = Omit<RubyPlacement, "y">;

/**
 * Lays out a paragraph of Japanese base text with horizontal furigana ruby
 * (`ruby-position: over`) using `@lyricova/glyph-renderer`.
 *
 * Pipeline:
 * 1. Validate `fontSize`/`rubyFontSize`/`rubyGap` (finite, positive sizes,
 *    non-negative gap - never let `NaN`/`Infinity` propagate into layout).
 * 2. Validate/convert furigana `leftIndex`/`rightIndex` (see
 *    `furiganaValidation.ts` for why this is necessary despite the API docs).
 * 3. Lay out the base paragraph with each valid annotation's base range
 *    passed as a `noBreakRange`, so it can never be split across lines by
 *    width-driven wrapping.
 * 4. Verify every base range actually landed on exactly one line (mandatory
 *    breaks inside a base range, or upstream inconsistencies, could still
 *    split one - reported as a `splitAcrossLines` issue, annotation skipped).
 * 5. For each remaining annotation, shape the ruby text - either as one
 *    grapheme per base grapheme ("mono", only when counts line up cleanly)
 *    or as a single contextual run centered/distributed over the whole base
 *    range ("group") - and measure its *actual* ink ascent/descent from the
 *    real outlines of the glyphs it shaped (see `rubyInkMetrics.ts`), not an
 *    approximation from the base paragraph's font metrics.
 * 6. For each line, reserve `maxAscent + maxDescent + rubyGap` above it
 *    (the max ink ascent/descent across every ruby annotation on that
 *    line), and set every ruby annotation on that line to share one row:
 *    baseline at `maxAscent` from the line's adjusted top.
 *
 * Never throws for malformed `furigana` input by default (`onInvalidAnnotation:
 * "skip"`); every rejected annotation is reported in `result.issues` instead.
 * Pass `onInvalidAnnotation: "throw"` to get a `RubyLayoutError` instead.
 *
 * `fontSize`/`rubyFontSize`/`rubyGap` are request-level concerns (not
 * per-annotation), so a malformed value always throws a
 * `RubyLayoutOptionsError`, regardless of `onInvalidAnnotation`.
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
    rubyFontSize: rubyFontSizeOption,
    rubyFontIds = fontIds,
    rubyGap = 0,
    baseDirection,
    script,
    language,
    features,
    variations,
    maxWidth,
    wrapStrategy,
    phraseRanges,
    lineHeight,
    onInvalidAnnotation = "skip",
  } = request;

  assertFinitePositiveSize(fontSize, "fontSize");
  const rubyFontSize =
    rubyFontSizeOption ?? fontSize * DEFAULT_RUBY_FONT_SIZE_RATIO;
  assertFinitePositiveSize(rubyFontSize, "rubyFontSize");
  assertFiniteNonNegative(rubyGap, "rubyGap");

  const { valid, issues } = validateFuriganaAnnotations(text, furigana);

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
  };
  const paragraphLayout = shaper.layoutParagraph(paragraphRequest);

  const rubyBaseShapeOptions: Pick<
    ShapeRequest,
    | "fontIds"
    | "fontSize"
    | "direction"
    | "script"
    | "language"
    | "features"
    | "variations"
  > = {
    fontIds: rubyFontIds,
    fontSize: rubyFontSize,
    direction: baseDirection,
    script,
    language,
    features,
    variations,
  };

  const outlineCache: GlyphOutlineCache = new Map();
  const pendingByLine = new Map<number, PendingRubyPlacement[]>();

  for (const annotation of valid) {
    const pending = placeAnnotation(
      shaper,
      paragraphLayout,
      annotation,
      rubyBaseShapeOptions,
      rubyFontSize,
      rubyFontIds,
      variations,
      outlineCache,
      issues,
      request.furigana,
    );
    if (!pending) continue;

    const list = pendingByLine.get(pending.lineIndex) ?? [];
    list.push(pending);
    pendingByLine.set(pending.lineIndex, list);
  }

  if (onInvalidAnnotation === "throw" && issues.length > 0) {
    throw new RubyLayoutError(issues);
  }

  // Each line reserves room for the tallest ink ascent/descent among *all*
  // of its ruby annotations, and every one of them shares that line's single
  // baseline - so ruby text on one line never overlaps and always sits flush.
  const extentByLine = new Map<number, number>();
  const baselineByLine = new Map<number, number>();
  for (const [lineIndex, pendingList] of pendingByLine) {
    const { ascent, descent } = combineRubyInkMetrics(
      pendingList.map((p): RubyInkMetrics => ({
        ascent: p.inkAscent,
        descent: p.inkDescent,
      })),
    );
    extentByLine.set(lineIndex, ascent + descent + rubyGap);
    baselineByLine.set(lineIndex, ascent);
  }

  const adjustedMetrics = computeAdjustedLineMetrics(
    paragraphLayout.lines,
    extentByLine,
  );

  const rubiesByLine = new Map<number, RubyPlacement[]>();
  for (const [lineIndex, pendingList] of pendingByLine) {
    const y = baselineByLine.get(lineIndex)!;
    rubiesByLine.set(
      lineIndex,
      pendingList.map((pending) => ({ ...pending, y })),
    );
  }

  const lines: LinePlacement[] = paragraphLayout.lines.map((line, index) => ({
    lineIndex: index,
    line,
    top: adjustedMetrics[index]!.top,
    baseline: adjustedMetrics[index]!.baseline,
    height: adjustedMetrics[index]!.height,
    rubies: rubiesByLine.get(index) ?? [],
  }));

  const lastMetrics = adjustedMetrics[adjustedMetrics.length - 1];
  const height = lastMetrics ? lastMetrics.top + lastMetrics.height : 0;

  const rubies = lines.flatMap((line) => line.rubies);

  return {
    lines,
    height,
    width: paragraphLayout.width,
    baseDirection: paragraphLayout.baseDirection,
    rubies,
    issues,
    missingFontRanges: paragraphLayout.missingFontRanges ?? [],
  };
}

function placeAnnotation(
  shaper: RubyLayoutShaper,
  paragraphLayout: ReturnType<RubyLayoutShaper["layoutParagraph"]>,
  annotation: NormalizedFuriganaAnnotation,
  rubyBaseShapeOptions: Pick<
    ShapeRequest,
    | "fontIds"
    | "fontSize"
    | "direction"
    | "script"
    | "language"
    | "features"
    | "variations"
  >,
  rubyFontSize: number,
  rubyFontIds: ShapeRequest["fontIds"],
  variations: string[] | undefined,
  outlineCache: GlyphOutlineCache,
  issues: RubyLayoutIssue[],
  rawAnnotations: RubyLayoutRequest["furigana"],
): PendingRubyPlacement | null {
  const [utf16Start, utf16End] = annotation.utf16Range;
  const lineIndices = findLinesForRange(
    paragraphLayout.lines,
    utf16Start,
    utf16End,
  );
  if (lineIndices.length !== 1) {
    issues.push({
      kind: "splitAcrossLines",
      annotation: rawAnnotations[annotation.sourceIndex]!,
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
      annotation: rawAnnotations[annotation.sourceIndex]!,
      lineIndices: [],
    });
    return null;
  }

  const baseGraphemeCount =
    annotation.graphemeRange[1] - annotation.graphemeRange[0];
  const rubyGraphemeCount = countGraphemes(annotation.content);
  const mono = isMonoEligible(
    baseGraphemeCount,
    bounds.clusters.length,
    rubyGraphemeCount,
  );

  const mode: "mono" | "group" = mono ? "mono" : "group";
  let runs;
  let baseX: readonly [number, number];

  if (mono) {
    const graphemeTexts = splitGraphemes(annotation.content);
    let cursor = 0;
    const graphemeInputs: MonoRubyGraphemeInput[] = graphemeTexts.map(
      (grapheme) => {
        const contentRange: [number, number] = [
          cursor,
          cursor + grapheme.length,
        ];
        cursor += grapheme.length;
        const shapeResult = shaper.shape({
          text: grapheme,
          ...rubyBaseShapeOptions,
        });
        return { contentRange, run: resolveShapeRun(shapeResult) };
      },
    );
    const placed = placeMonoRuby(bounds.clusters, graphemeInputs);
    runs = placed.runs;
    baseX = placed.baseX;
  } else {
    const shapeResult = shaper.shape({
      text: annotation.content,
      ...rubyBaseShapeOptions,
    });
    const run = resolveShapeRun(shapeResult);
    baseX = [bounds.xStart, bounds.xEnd];
    runs = placeGroupRuby(baseX, run, annotation.content.length);
  }

  // Measure this annotation's *actual* ink ascent/descent from the real
  // glyphs/font(s) it was just shaped with (mono ruby may span more than one
  // font if the ruby fallback chain resolves different graphemes to
  // different fonts) - never approximated from base paragraph metrics.
  const allGlyphs = runs.flatMap((r) => r.glyphs);
  const { ascent: inkAscent, descent: inkDescent } = measureRubyInkMetrics(
    shaper,
    allGlyphs,
    rubyFontSize,
    variations,
    outlineCache,
  );

  // Same idea, but for the horizontal extent: the runs' advance box
  // (`[run.x, run.x + run.width]`) alone can be narrower than the glyphs'
  // actual ink (negative left side bearing, right overhang), which would
  // otherwise let a fully-revealed ruby annotation's karaoke clip miss - and
  // therefore leave stale inactive-color ink at - its own edges.
  const { left: inkLeft, right: inkRight } = measureRubyInkHorizontalExtent(
    shaper,
    runs,
    rubyFontSize,
    variations,
    outlineCache,
  );

  return {
    annotation,
    mode,
    lineIndex,
    baseX,
    inkAscent,
    inkDescent,
    inkLeft,
    inkRight,
    fontSize: rubyFontSize,
    fontIds: rubyFontIds,
    runs,
  };
}
