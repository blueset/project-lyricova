import type { ShapedCluster } from "@lyricova/glyph-renderer";
import type { PositionedRubyGlyph, RubyRun } from "./types";
import type { ResolvedShapeRun } from "./glyphMetrics";

/**
 * Mono-ruby is only used when the base run's grapheme count *and* cluster
 * count both match the ruby content's grapheme count 1:1 - i.e. every base
 * grapheme shaped to exactly one cluster (no ligature merged multiple base
 * characters together) and there is exactly one ruby grapheme to pair with
 * each. Otherwise the base/ruby mapping isn't "clean" and group placement is
 * used instead.
 */
export function isMonoEligible(
  baseGraphemeCount: number,
  baseClusterCount: number,
  rubyGraphemeCount: number,
): boolean {
  return (
    baseGraphemeCount > 0 &&
    baseGraphemeCount === rubyGraphemeCount &&
    baseClusterCount === baseGraphemeCount
  );
}

export interface RubyGlyphGroup {
  /** Source range (UTF-16, within the ruby content) of this cluster group. */
  contentRange: readonly [number, number];
  /** Glyphs of this group, re-based so `x === 0` at the group's own pen start. */
  glyphs: PositionedRubyGlyph[];
  width: number;
}

/**
 * Splits a shaped ruby run's glyphs into contiguous groups sharing the same
 * source cluster (`clusterUtf16`/`clusterEndUtf16`), preserving intra-cluster
 * shaping (kerning/ligatures within a cluster) while exposing per-cluster
 * boundaries so group-mode ruby can redistribute spacing *between* clusters
 * without re-shaping.
 */
export function groupGlyphsByCluster(
  glyphs: readonly PositionedRubyGlyph[],
): RubyGlyphGroup[] {
  const groups: RubyGlyphGroup[] = [];
  let current: PositionedRubyGlyph[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0]!;
    const last = current[current.length - 1]!;
    const penStart = first.x - first.xOffset;
    const penEnd = last.x - last.xOffset + last.xAdvance;
    groups.push({
      contentRange: [first.clusterUtf16, last.clusterEndUtf16],
      glyphs: current.map((glyph) => ({ ...glyph, x: glyph.x - penStart })),
      width: penEnd - penStart,
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
  const runs: RubyRun[] = sortedClusters.map((cluster, index) => {
    const grapheme = graphemes[index]!;
    const clusterCenter = cluster.x + cluster.advance / 2;
    const x = clusterCenter - grapheme.run.width / 2;
    return {
      contentRange: grapheme.contentRange,
      glyphs: grapheme.run.glyphs,
      width: grapheme.run.width,
      x,
    };
  });

  const xStart = Math.min(...sortedClusters.map((cluster) => cluster.x));
  const xEnd = Math.max(
    ...sortedClusters.map((cluster) => cluster.x + cluster.advance),
  );
  return { runs, baseX: [xStart, xEnd] };
}

/**
 * Places a single, contextually-shaped ruby run over the full base range.
 *
 * - If the ruby run is *wider* than (or exactly as wide as) the base range,
 *   it is kept as one block with shaping context (kerning/ligatures) fully
 *   preserved, centered over the base range - since the ruby can't be
 *   compressed to fit, it symmetrically overhangs both edges of the base.
 * - If the ruby run is *narrower* than the base range, it is split at its
 *   own cluster boundaries (via {@link groupGlyphsByCluster}) and the
 *   clusters are distributed with equal, non-negative gaps ("space-around")
 *   so the whole ruby run spans exactly the base width without ever
 *   overlapping - shaping *within* each cluster is still untouched, only
 *   inter-cluster spacing changes.
 */
export function placeGroupRuby(
  baseX: readonly [number, number],
  run: ResolvedShapeRun,
  contentLength: number,
): RubyRun[] {
  const baseWidth = baseX[1] - baseX[0];

  if (run.glyphs.length === 0 || run.width >= baseWidth) {
    // Wider than (or equal to) the base, or empty: keep the contextually
    // shaped run as one centered block, allowing symmetric overhang - never
    // compress it into negative, overlapping inter-cluster gaps.
    const x = baseX[0] + (baseWidth - run.width) / 2;
    return [{ contentRange: [0, contentLength], glyphs: run.glyphs, width: run.width, x }];
  }

  const groups = groupGlyphsByCluster(run.glyphs);
  if (groups.length <= 1) {
    // Nothing to distribute across (single cluster) - center as one block.
    const x = baseX[0] + (baseWidth - run.width) / 2;
    return [{ contentRange: [0, contentLength], glyphs: run.glyphs, width: run.width, x }];
  }

  const totalWidth = groups.reduce((sum, group) => sum + group.width, 0);
  // Narrower than the base by construction (checked above), so this gap is
  // always >= 0 - `Math.max` only guards floating-point edge cases.
  const gap = Math.max(0, (baseWidth - totalWidth) / groups.length);
  let cursor = baseX[0] + gap / 2;
  return groups.map((group) => {
    const placed: RubyRun = {
      contentRange: group.contentRange,
      glyphs: group.glyphs,
      width: group.width,
      x: cursor,
    };
    cursor += group.width + gap;
    return placed;
  });
}

