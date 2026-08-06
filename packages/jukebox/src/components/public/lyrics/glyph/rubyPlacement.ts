import type { ShapedCluster } from "@lyricova/glyph-renderer";
import type { PositionedRubyGlyph, RubyRun } from "./types";
import type { ResolvedShapeRun } from "./glyphMetrics";
import { isRunWhitespace } from "./rubyOverhang";

/**
 * Defensive guard for the mono-ruby path.
 *
 * Ruby type is **provided by the input data**, not inferred: upstream emits
 * one annotation per base grapheme wherever a clean 1:1 mapping exists, and a
 * single multi-grapheme annotation (group-/jukugo-ruby) otherwise. So an
 * annotation spanning more than one base grapheme always uses the group path,
 * even when its ruby grapheme count happens to match - upstream deliberately
 * chose not to split it.
 *
 * This only re-checks that the single annotated grapheme really did shape to
 * exactly one cluster; anything else falls back to group placement.
 */
export function isMonoEligible(
  baseGraphemeCount: number,
  baseClusterCount: number,
): boolean {
  return baseGraphemeCount === 1 && baseClusterCount === 1;
}

export interface RubyGlyphGroup {
  /** Source range (UTF-16, within the ruby content) of this cluster group. */
  contentRange: readonly [number, number];
  /** Glyphs of this group, re-based so `x === 0` at the group's own pen start. */
  glyphs: PositionedRubyGlyph[];
  width: number;
  /** Whether this group's source characters are all whitespace (stretchable inter-word space). */
  isWhitespace: boolean;
}

/**
 * Splits a shaped ruby run's glyphs into contiguous groups sharing the same
 * source cluster (`clusterUtf16`/`clusterEndUtf16`), preserving intra-cluster
 * shaping (kerning/ligatures within a cluster) while exposing per-cluster
 * boundaries so group-mode ruby can redistribute spacing *between* clusters
 * without re-shaping.
 *
 * `content` is the ruby text the glyphs were shaped from; it is only used to
 * mark whitespace groups, which are the sole thing a proportional (non-CJK)
 * ruby run is allowed to stretch.
 */
export function groupGlyphsByCluster(
  glyphs: readonly PositionedRubyGlyph[],
  content = "",
): RubyGlyphGroup[] {
  const groups: RubyGlyphGroup[] = [];
  let current: PositionedRubyGlyph[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0]!;
    const last = current[current.length - 1]!;
    const penStart = first.x - first.xOffset;
    const penEnd = last.x - last.xOffset + last.xAdvance;
    const source = content.slice(first.clusterUtf16, last.clusterEndUtf16);
    groups.push({
      contentRange: [first.clusterUtf16, last.clusterEndUtf16],
      glyphs: current.map((glyph) => ({ ...glyph, x: glyph.x - penStart })),
      width: penEnd - penStart,
      isWhitespace: source.length > 0 && isRunWhitespace(source),
    });
    current = [];
  };

  for (const glyph of glyphs) {
    const last = current[current.length - 1];
    if (
      last &&
      (last.clusterUtf16 !== glyph.clusterUtf16 ||
        last.clusterEndUtf16 !== glyph.clusterEndUtf16)
    ) {
      flush();
    }
    current.push(glyph);
  }
  flush();

  return groups;
}

export interface MonoRubyGraphemeInput {
  /** Source range (UTF-16, within the ruby content) of this single grapheme. */
  contentRange: readonly [number, number];
  /** Independently shaped run for just this one ruby grapheme. */
  run: ResolvedShapeRun;
}

export interface RubyGroupPlacement {
  runs: RubyRun[];
  /** Line-relative `[start, end]` x span of the base clusters. */
  baseX: readonly [number, number];
}

/**
 * Places one independently-shaped ruby grapheme centered over each
 * corresponding base cluster (classic "mono ruby": each mora sits directly
 * above its kanji). `baseClusters` and `graphemes` must be the same length
 * and in matching logical (left-to-right) order.
 *
 * Base clusters are paired with ruby graphemes by **logical source order**
 * (`cluster.source.utf16Start`), not visual `x` - the two coincide for the
 * plain left-to-right horizontal Japanese text this layer targets, but
 * source order is the semantically correct one to pair against the equally
 * logically-ordered `graphemes`, and doesn't depend on the base clusters
 * already being visually left-to-right (mono ruby under bidi/RTL reordering
 * is out of this layer's confirmed scope, but this keeps the pairing itself
 * correct rather than incidentally correct).
 */
export function placeMonoRuby(
  baseClusters: readonly ShapedCluster[],
  graphemes: readonly MonoRubyGraphemeInput[],
): RubyGroupPlacement {
  if (baseClusters.length !== graphemes.length) {
    throw new Error(
      `placeMonoRuby requires one base cluster per ruby grapheme (got ${baseClusters.length} cluster(s), ${graphemes.length} grapheme(s)).`,
    );
  }

  const sortedClusters = [...baseClusters].sort(
    (a, b) => a.source.utf16Start - b.source.utf16Start,
  );
  // Centre over each cluster's *expanded* box: JLReq base expansion inserts
  // `leadingSpace`/`trailingSpace` around the annotated clusters, and the ruby
  // belongs to that whole box, not to the bare shaped advance inside it.
  // Defensive rather than corrective: every distribution the layout engine can
  // currently produce for a single-cluster range is symmetric, so the box
  // centre and the cluster centre coincide today - but nothing in the
  // `RangeAdvance` contract guarantees that.
  const runs: RubyRun[] = sortedClusters.map((cluster, index) => {
    const grapheme = graphemes[index]!;
    const boxStart = cluster.x - cluster.leadingSpace;
    const boxEnd = cluster.x + cluster.advance + cluster.trailingSpace;
    const x = (boxStart + boxEnd) / 2 - grapheme.run.width / 2;
    return {
      contentRange: grapheme.contentRange,
      glyphs: grapheme.run.glyphs,
      width: grapheme.run.width,
      x,
    };
  });

  const xStart = Math.min(
    ...sortedClusters.map((cluster) => cluster.x - cluster.leadingSpace),
  );
  const xEnd = Math.max(
    ...sortedClusters.map(
      (cluster) => cluster.x + cluster.advance + cluster.trailingSpace,
    ),
  );
  return { runs, baseX: [xStart, xEnd] };
}

/**
 * Maximum edge gap, in ruby em, that nakatsuki distribution may leave between
 * the base range's edge and the first/last ruby cluster. JLReq caps how far
 * ruby drifts away from the characters it annotates when the base is far
 * wider than the reading (e.g. 4 kana over 11 base characters).
 */
export const MAX_RUBY_EDGE_GAP_EM = 1.0;

/** Describes how a group-ruby run may be distributed over its base range. */
export interface GroupRubyOptions {
  /** Resolved ruby font size, the unit for {@link MAX_RUBY_EDGE_GAP_EM}. */
  rubyFontSize: number;
  /**
   * Whether inter-cluster spacing may be distributed into the ruby run.
   * `false` for proportional (Latin/Cyrillic/Hangul/digit) ruby, which JLReq
   * requires to be set solid - only its inter-word whitespace may stretch.
   */
  spaceable: boolean;
}

/**
 * Places a single, contextually-shaped ruby run over the full base range,
 * following JLReq's nakatsuki (centred) distribution.
 *
 * Slack (`baseWidth - rubyWidth`) is distributed `2 : 1 : 1` - inter-cluster
 * gap `g`, leading gap `g / 2`, trailing gap `g / 2` - which for `n` clusters
 * and `n - 1` inter-cluster gaps solves to `g = slack / n`. Each edge gap is
 * then clamped to {@link MAX_RUBY_EDGE_GAP_EM} ruby em; when that clamp bites,
 * the remainder is absorbed by the inter-cluster gaps so the run stays
 * centred over the base range and clusters never overlap.
 *
 * Special cases:
 * - A single cluster has no inter-cluster gap to redistribute into, so it is
 *   simply centred: **centring wins over the edge clamp**.
 * - A run that is not narrower than its base is kept solid and centred, so it
 *   symmetrically overhangs; the caller then resolves the overhang budget
 *   and/or expands the base.
 * - A non-{@link GroupRubyOptions.spaceable} run is never letterspaced: only
 *   its own inter-word whitespace absorbs slack, otherwise it is centred solid.
 *
 * Intra-cluster shaping is never touched - only the spacing *between*
 * already-shaped clusters changes, and nothing is ever re-shaped.
 */
export function placeGroupRuby(
  baseX: readonly [number, number],
  run: ResolvedShapeRun,
  content: string,
  options: GroupRubyOptions,
): RubyRun[] {
  const baseWidth = baseX[1] - baseX[0];
  const solid = (): RubyRun[] => [
    {
      contentRange: [0, content.length],
      glyphs: run.glyphs,
      width: run.width,
      x: baseX[0] + (baseWidth - run.width) / 2,
    },
  ];

  if (run.glyphs.length === 0 || run.width >= baseWidth) return solid();

  const groups = groupGlyphsByCluster(run.glyphs, content);
  if (groups.length <= 1) return solid();

  const slack = baseWidth - run.width;
  if (!options.spaceable) {
    const gaps = whitespaceStretchGaps(groups, slack);
    return gaps ? layOutGroups(baseX[0], groups, gaps) : solid();
  }

  const n = groups.length;
  const edgeGap = Math.min(
    slack / n / 2,
    MAX_RUBY_EDGE_GAP_EM * options.rubyFontSize,
  );
  // The clamp only ever *reduces* the edge gaps, so the redistributed
  // inter-cluster gap can never go negative.
  const interGap = (slack - 2 * edgeGap) / (n - 1);
  return layOutGroups(baseX[0], groups, [
    edgeGap,
    ...(Array(n - 1).fill(interGap) as number[]),
    edgeGap,
  ]);
}

/**
 * Gap list that distributes `slack` across a proportional ruby run's interior
 * whitespace clusters (JLReq permits stretching inter-word space, never
 * letterspacing). Returns `null` when there is no interior whitespace, so the
 * caller falls back to centring the solid block.
 */
function whitespaceStretchGaps(
  groups: readonly RubyGlyphGroup[],
  slack: number,
): number[] | null {
  const interior = groups
    .map((group, index) => ({ group, index }))
    .filter(
      ({ group, index }) =>
        index > 0 && index < groups.length - 1 && group.isWhitespace,
    );
  if (interior.length === 0) return null;

  const share = slack / interior.length;
  // gaps[i] precedes groups[i]; gaps[groups.length] trails the last group.
  const gaps = Array<number>(groups.length + 1).fill(0);
  for (const { index } of interior) gaps[index + 1] += share;
  return gaps;
}

function layOutGroups(
  originX: number,
  groups: readonly RubyGlyphGroup[],
  gaps: readonly number[],
): RubyRun[] {
  let cursor = originX + (gaps[0] ?? 0);
  return groups.map((group, index) => {
    const placed: RubyRun = {
      contentRange: group.contentRange,
      glyphs: group.glyphs,
      width: group.width,
      x: cursor,
    };
    cursor += group.width + (gaps[index + 1] ?? 0);
    return placed;
  });
}
