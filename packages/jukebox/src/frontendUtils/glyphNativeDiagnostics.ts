import type { ParagraphLayout, ShapedCluster } from "@lyricova/glyph-renderer";
import { measureEnhancedCanvasTextClusters } from "./enhancedCanvasTextMetricsAdapter";
import type {
  EnhancedCanvasTextClusterRequest,
  EnhancedCanvasTextMeasureContext,
  LyricovaNativeTextCluster,
  LyricovaNativeTextClustersResult,
} from "./enhancedCanvasTextMetricsTypes";

export interface GlyphNativeDiagnosticsOptions {
  readonly tolerance?: number;
}

export interface GlyphNativeDiagnosticRange {
  readonly startUtf16: number;
  readonly endUtf16: number;
  readonly text: string;
}

export interface GlyphNativeDiagnosticNativeCluster extends GlyphNativeDiagnosticRange {
  readonly visualIndex: number;
  readonly x: number | null;
  readonly advance: number | null;
  readonly advanceSource: "reported" | "derived-from-next-cluster-x" | null;
  readonly endX: number | null;
  readonly endXSource:
    "reported-x-plus-advance" | "derived-from-next-cluster-x" | null;
  readonly raw: LyricovaNativeTextCluster;
}

export interface GlyphNativeDiagnosticWasmCluster extends GlyphNativeDiagnosticRange {
  readonly visualIndex: number;
  readonly x: number;
  readonly advance: number;
  readonly endX: number;
  readonly direction: ShapedCluster["direction"];
  readonly level: number;
  readonly glyphCount: number;
  readonly isWhitespace: boolean;
  readonly raw: ShapedCluster;
}

export interface GlyphNativeScalarComparison {
  readonly status: "match" | "mismatch" | "unavailable";
  readonly native: number | null;
  readonly wasm: number | null;
  readonly delta: number | null;
  readonly tolerance: number;
  readonly nativeSource?:
    "reported" | "derived-from-next-cluster-x" | "derived-from-x-plus-advance";
  readonly reason?: "native-missing" | "wasm-missing";
}

export type GlyphNativeVisualComparison =
  | {
      readonly kind: "match";
      readonly comparisonIndex: number;
      readonly native: GlyphNativeDiagnosticNativeCluster;
      readonly wasm: GlyphNativeDiagnosticWasmCluster;
      readonly x: GlyphNativeScalarComparison;
      readonly advance: GlyphNativeScalarComparison;
      readonly endX: GlyphNativeScalarComparison;
    }
  | {
      readonly kind: "range-mismatch";
      readonly comparisonIndex: number;
      readonly native: GlyphNativeDiagnosticNativeCluster;
      readonly wasm: GlyphNativeDiagnosticWasmCluster;
    }
  | {
      readonly kind: "missing-native";
      readonly comparisonIndex: number;
      readonly wasm: GlyphNativeDiagnosticWasmCluster;
    }
  | {
      readonly kind: "extra-native";
      readonly comparisonIndex: number;
      readonly native: GlyphNativeDiagnosticNativeCluster;
    };

export interface GlyphNativeDiagnosticsSequence {
  readonly nativeRangeOrder: readonly GlyphNativeDiagnosticRange[];
  readonly wasmRangeOrder: readonly GlyphNativeDiagnosticRange[];
  readonly exactVisualOrder: boolean;
  readonly sameRangesDifferentOrder: boolean;
}

export interface GlyphNativeDiagnosticsSummary {
  readonly matches: boolean;
  readonly rangeMismatchCount: number;
  readonly missingNativeCount: number;
  readonly extraNativeCount: number;
  readonly positionMismatchCount: number;
  readonly comparedXCount: number;
  readonly comparedAdvanceCount: number;
  readonly comparedEndXCount: number;
}

export type GlyphNativeDiagnosticsNativeSide =
  | {
      readonly kind: "available";
      readonly clusters: readonly GlyphNativeDiagnosticNativeCluster[];
    }
  | {
      readonly kind: "unavailable";
      readonly reason: "missing-get-text-clusters";
    };

export type GlyphNativeDiagnosticsWasmSide =
  | {
      readonly kind: "single-line";
      readonly baseDirection: ParagraphLayout["baseDirection"];
      readonly lineDirection: ParagraphLayout["lines"][number]["direction"];
      readonly lineSource: GlyphNativeDiagnosticRange;
      readonly clusters: readonly GlyphNativeDiagnosticWasmCluster[];
    }
  | {
      readonly kind: "invalid-layout";
      readonly reason:
        | "empty-layout"
        | "non-single-line-layout"
        | "line-source-mismatch"
        | "cluster-source-mismatch";
      readonly detail: string;
      readonly lineCount: number;
    };

export type GlyphNativeDiagnosticsComparison =
  | {
      readonly kind: "compared";
      readonly sequence: GlyphNativeDiagnosticsSequence;
      readonly comparisons: readonly GlyphNativeVisualComparison[];
      readonly summary: GlyphNativeDiagnosticsSummary;
    }
  | {
      readonly kind: "skipped";
      readonly reason: "native-unavailable" | "invalid-layout";
    };

export interface GlyphNativeDiagnosticsReport {
  readonly text: string;
  readonly tolerance: number;
  readonly native: GlyphNativeDiagnosticsNativeSide;
  readonly wasm: GlyphNativeDiagnosticsWasmSide;
  readonly comparison: GlyphNativeDiagnosticsComparison;
}

type LayoutLine = ParagraphLayout["lines"][number];

export function compareNativeTextClustersWithParagraphLayout(
  text: string,
  nativeResult: LyricovaNativeTextClustersResult,
  layout: ParagraphLayout,
  options: GlyphNativeDiagnosticsOptions = {},
): GlyphNativeDiagnosticsReport {
  const tolerance = normalizeTolerance(options.tolerance);
  const native = normalizeNativeSide(text, nativeResult);
  const wasm = normalizeWasmSide(text, layout);

  if (native.kind !== "available" || wasm.kind !== "single-line") {
    return {
      text,
      tolerance,
      native,
      wasm,
      comparison: {
        kind: "skipped",
        reason:
          native.kind !== "available" ? "native-unavailable" : "invalid-layout",
      },
    };
  }

  const sequence = buildSequence(native.clusters, wasm.clusters);
  const comparisons = buildComparisons(
    native.clusters,
    wasm.clusters,
    sequence.sameRangesDifferentOrder,
    tolerance,
  );
  const summary = buildSummary(sequence, comparisons);

  return {
    text,
    tolerance,
    native,
    wasm,
    comparison: {
      kind: "compared",
      sequence,
      comparisons,
      summary,
    },
  };
}

export function measureEnhancedCanvasTextClusterDiagnostics(
  context: EnhancedCanvasTextMeasureContext,
  text: string,
  layout: ParagraphLayout,
  request: EnhancedCanvasTextClusterRequest = {},
  options: GlyphNativeDiagnosticsOptions = {},
): GlyphNativeDiagnosticsReport {
  const nativeResult = measureEnhancedCanvasTextClusters(
    context,
    text,
    request,
  );
  return compareNativeTextClustersWithParagraphLayout(
    text,
    nativeResult,
    layout,
    options,
  );
}

function normalizeTolerance(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(
      "Glyph native diagnostics tolerance must be a finite non-negative number.",
    );
  }
  return value;
}

function normalizeNativeSide(
  text: string,
  nativeResult: LyricovaNativeTextClustersResult,
): GlyphNativeDiagnosticsNativeSide {
  if (nativeResult.kind !== "available") {
    return nativeResult;
  }

  return {
    kind: "available",
    clusters: nativeResult.clusters.map((cluster, visualIndex, clusters) => {
      const nextCluster = clusters[visualIndex + 1];
      const x = cluster.x ?? null;
      const reportedAdvance = cluster.advance ?? null;
      const derivedAdvance =
        x !== null && nextCluster?.x !== undefined ? nextCluster.x - x : null;
      const advance = reportedAdvance ?? derivedAdvance;
      const advanceSource =
        reportedAdvance !== null
          ? "reported"
          : derivedAdvance !== null
            ? "derived-from-next-cluster-x"
            : null;
      const endX =
        x !== null && reportedAdvance !== null
          ? x + reportedAdvance
          : (nextCluster?.x ?? null);
      const endXSource =
        x !== null && reportedAdvance !== null
          ? "reported-x-plus-advance"
          : nextCluster?.x !== undefined
            ? "derived-from-next-cluster-x"
            : null;

      return {
        visualIndex,
        ...makeRange(text, cluster.sourceStartUtf16, cluster.sourceEndUtf16),
        x,
        advance,
        advanceSource,
        endX,
        endXSource,
        raw: cluster,
      };
    }),
  };
}

function normalizeWasmSide(
  text: string,
  layout: ParagraphLayout,
): GlyphNativeDiagnosticsWasmSide {
  if (layout.lines.length === 0) {
    return {
      kind: "invalid-layout",
      reason: "empty-layout",
      detail:
        "Expected a single unwrapped line but the paragraph layout was empty.",
      lineCount: 0,
    };
  }
  if (layout.lines.length !== 1) {
    return {
      kind: "invalid-layout",
      reason: "non-single-line-layout",
      detail: `Expected a single unwrapped line but received ${layout.lines.length} lines.`,
      lineCount: layout.lines.length,
    };
  }

  const line = layout.lines[0]!;
  if (line.source.utf16Start !== 0 || line.source.utf16End !== text.length) {
    return {
      kind: "invalid-layout",
      reason: "line-source-mismatch",
      detail:
        `Expected the single line to cover UTF-16 range 0..${text.length}, ` +
        `received ${line.source.utf16Start}..${line.source.utf16End}.`,
      lineCount: 1,
    };
  }

  for (const cluster of line.clusters) {
    const start = cluster.source.utf16Start;
    const end = cluster.source.utf16End;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end > text.length ||
      end <= start ||
      start < line.source.utf16Start ||
      end > line.source.utf16End
    ) {
      return {
        kind: "invalid-layout",
        reason: "cluster-source-mismatch",
        detail:
          `WASM cluster range ${start}..${end} must stay within the single-line ` +
          `UTF-16 source range ${line.source.utf16Start}..${line.source.utf16End}.`,
        lineCount: 1,
      };
    }
  }

  return {
    kind: "single-line",
    baseDirection: layout.baseDirection,
    lineDirection: line.direction,
    lineSource: makeRange(text, line.source.utf16Start, line.source.utf16End),
    clusters: normalizeWasmClusters(text, line),
  };
}

function normalizeWasmClusters(
  text: string,
  line: LayoutLine,
): readonly GlyphNativeDiagnosticWasmCluster[] {
  return line.clusters.map((cluster, visualIndex) => ({
    visualIndex,
    ...makeRange(text, cluster.source.utf16Start, cluster.source.utf16End),
    x: cluster.x,
    advance: cluster.advance,
    endX: cluster.x + cluster.advance,
    direction: cluster.direction,
    level: cluster.level,
    glyphCount: cluster.glyphs.length,
    isWhitespace: cluster.isWhitespace,
    raw: cluster,
  }));
}

function makeRange(
  text: string,
  startUtf16: number,
  endUtf16: number,
): GlyphNativeDiagnosticRange {
  return {
    startUtf16,
    endUtf16,
    text: text.slice(startUtf16, endUtf16),
  };
}

function buildSequence(
  nativeClusters: readonly GlyphNativeDiagnosticNativeCluster[],
  wasmClusters: readonly GlyphNativeDiagnosticWasmCluster[],
): GlyphNativeDiagnosticsSequence {
  const nativeRangeOrder = nativeClusters.map(
    ({ startUtf16, endUtf16, text }) => ({
      startUtf16,
      endUtf16,
      text,
    }),
  );
  const wasmRangeOrder = wasmClusters.map(({ startUtf16, endUtf16, text }) => ({
    startUtf16,
    endUtf16,
    text,
  }));
  const nativeKeys = nativeRangeOrder.map(rangeKey);
  const wasmKeys = wasmRangeOrder.map(rangeKey);
  const exactVisualOrder =
    nativeKeys.length === wasmKeys.length &&
    nativeKeys.every((key, index) => key === wasmKeys[index]);

  return {
    nativeRangeOrder,
    wasmRangeOrder,
    exactVisualOrder,
    sameRangesDifferentOrder:
      !exactVisualOrder &&
      haveSameRangeMultiset(nativeKeys, wasmKeys) &&
      nativeKeys.length === wasmKeys.length,
  };
}

function buildComparisons(
  nativeClusters: readonly GlyphNativeDiagnosticNativeCluster[],
  wasmClusters: readonly GlyphNativeDiagnosticWasmCluster[],
  compareStrictVisualOrder: boolean,
  tolerance: number,
): readonly GlyphNativeVisualComparison[] {
  if (compareStrictVisualOrder) {
    return buildIndexComparisons(nativeClusters, wasmClusters, tolerance);
  }

  const comparisons: GlyphNativeVisualComparison[] = [];
  let nativeIndex = 0;
  let wasmIndex = 0;
  let comparisonIndex = 0;

  while (
    nativeIndex < nativeClusters.length ||
    wasmIndex < wasmClusters.length
  ) {
    const native = nativeClusters[nativeIndex];
    const wasm = wasmClusters[wasmIndex];

    if (native === undefined && wasm !== undefined) {
      comparisons.push({
        kind: "missing-native",
        comparisonIndex,
        wasm,
      });
      wasmIndex++;
      comparisonIndex++;
      continue;
    }
    if (native !== undefined && wasm === undefined) {
      comparisons.push({
        kind: "extra-native",
        comparisonIndex,
        native,
      });
      nativeIndex++;
      comparisonIndex++;
      continue;
    }
    if (native === undefined || wasm === undefined) {
      break;
    }

    if (sameRange(native, wasm)) {
      comparisons.push(
        makeMatchComparison(comparisonIndex, native, wasm, tolerance),
      );
      nativeIndex++;
      wasmIndex++;
      comparisonIndex++;
      continue;
    }

    const nextNative = nativeClusters[nativeIndex + 1];
    const nextWasm = wasmClusters[wasmIndex + 1];
    const nativeAlignsAhead =
      nextNative !== undefined && sameRange(nextNative, wasm);
    const wasmAlignsAhead =
      nextWasm !== undefined && sameRange(native, nextWasm);

    if (wasmAlignsAhead && !nativeAlignsAhead) {
      comparisons.push({
        kind: "missing-native",
        comparisonIndex,
        wasm,
      });
      wasmIndex++;
      comparisonIndex++;
      continue;
    }
    if (nativeAlignsAhead && !wasmAlignsAhead) {
      comparisons.push({
        kind: "extra-native",
        comparisonIndex,
        native,
      });
      nativeIndex++;
      comparisonIndex++;
      continue;
    }

    comparisons.push({
      kind: "range-mismatch",
      comparisonIndex,
      native,
      wasm,
    });
    nativeIndex++;
    wasmIndex++;
    comparisonIndex++;
  }

  return comparisons;
}

function buildIndexComparisons(
  nativeClusters: readonly GlyphNativeDiagnosticNativeCluster[],
  wasmClusters: readonly GlyphNativeDiagnosticWasmCluster[],
  tolerance: number,
): readonly GlyphNativeVisualComparison[] {
  const comparisons: GlyphNativeVisualComparison[] = [];
  const length = Math.max(nativeClusters.length, wasmClusters.length);

  for (let comparisonIndex = 0; comparisonIndex < length; comparisonIndex++) {
    const native = nativeClusters[comparisonIndex];
    const wasm = wasmClusters[comparisonIndex];

    if (native !== undefined && wasm !== undefined) {
      comparisons.push(
        sameRange(native, wasm)
          ? makeMatchComparison(comparisonIndex, native, wasm, tolerance)
          : {
              kind: "range-mismatch",
              comparisonIndex,
              native,
              wasm,
            },
      );
    } else if (wasm !== undefined) {
      comparisons.push({
        kind: "missing-native",
        comparisonIndex,
        wasm,
      });
    } else if (native !== undefined) {
      comparisons.push({
        kind: "extra-native",
        comparisonIndex,
        native,
      });
    }
  }

  return comparisons;
}

function makeMatchComparison(
  comparisonIndex: number,
  native: GlyphNativeDiagnosticNativeCluster,
  wasm: GlyphNativeDiagnosticWasmCluster,
  tolerance: number,
): GlyphNativeVisualComparison {
  return {
    kind: "match",
    comparisonIndex,
    native,
    wasm,
    x: compareScalar(native.x, wasm.x, tolerance, "reported"),
    advance: compareScalar(
      native.advance,
      wasm.advance,
      tolerance,
      native.advanceSource === "derived-from-next-cluster-x"
        ? "derived-from-next-cluster-x"
        : native.advanceSource === "reported"
          ? "reported"
          : undefined,
    ),
    endX: compareScalar(
      native.endX,
      wasm.endX,
      tolerance,
      native.endXSource === "derived-from-next-cluster-x"
        ? "derived-from-next-cluster-x"
        : native.endXSource === "reported-x-plus-advance"
          ? "derived-from-x-plus-advance"
          : undefined,
    ),
  };
}

function compareScalar(
  native: number | null,
  wasm: number | null,
  tolerance: number,
  nativeSource?: GlyphNativeScalarComparison["nativeSource"],
): GlyphNativeScalarComparison {
  if (native === null) {
    return {
      status: "unavailable",
      native: null,
      wasm,
      delta: null,
      tolerance,
      ...(nativeSource === undefined ? {} : { nativeSource }),
      reason: "native-missing",
    };
  }
  if (wasm === null) {
    return {
      status: "unavailable",
      native,
      wasm: null,
      delta: null,
      tolerance,
      ...(nativeSource === undefined ? {} : { nativeSource }),
      reason: "wasm-missing",
    };
  }

  const delta = native - wasm;
  return {
    status: Math.abs(delta) <= tolerance ? "match" : "mismatch",
    native,
    wasm,
    delta,
    tolerance,
    ...(nativeSource === undefined ? {} : { nativeSource }),
  };
}

function buildSummary(
  sequence: GlyphNativeDiagnosticsSequence,
  comparisons: readonly GlyphNativeVisualComparison[],
): GlyphNativeDiagnosticsSummary {
  let rangeMismatchCount = 0;
  let missingNativeCount = 0;
  let extraNativeCount = 0;
  let positionMismatchCount = 0;
  let comparedXCount = 0;
  let comparedAdvanceCount = 0;
  let comparedEndXCount = 0;

  for (const comparison of comparisons) {
    switch (comparison.kind) {
      case "range-mismatch":
        rangeMismatchCount++;
        break;
      case "missing-native":
        missingNativeCount++;
        break;
      case "extra-native":
        extraNativeCount++;
        break;
      case "match": {
        const scalarComparisons = [
          comparison.x,
          comparison.advance,
          comparison.endX,
        ];
        if (comparison.x.status !== "unavailable") comparedXCount++;
        if (comparison.advance.status !== "unavailable") comparedAdvanceCount++;
        if (comparison.endX.status !== "unavailable") comparedEndXCount++;
        if (
          scalarComparisons.some(
            (scalarComparison) => scalarComparison.status === "mismatch",
          )
        ) {
          positionMismatchCount++;
        }
        break;
      }
    }
  }

  return {
    matches:
      sequence.exactVisualOrder &&
      rangeMismatchCount === 0 &&
      missingNativeCount === 0 &&
      extraNativeCount === 0 &&
      positionMismatchCount === 0,
    rangeMismatchCount,
    missingNativeCount,
    extraNativeCount,
    positionMismatchCount,
    comparedXCount,
    comparedAdvanceCount,
    comparedEndXCount,
  };
}

function sameRange(
  left: GlyphNativeDiagnosticRange,
  right: GlyphNativeDiagnosticRange,
): boolean {
  return (
    left.startUtf16 === right.startUtf16 && left.endUtf16 === right.endUtf16
  );
}

function rangeKey(range: GlyphNativeDiagnosticRange): string {
  return `${range.startUtf16}:${range.endUtf16}`;
}

function haveSameRangeMultiset(
  nativeKeys: readonly string[],
  wasmKeys: readonly string[],
): boolean {
  if (nativeKeys.length !== wasmKeys.length) {
    return false;
  }

  const counts = new Map<string, number>();
  for (const key of nativeKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const key of wasmKeys) {
    const count = counts.get(key);
    if (count === undefined) {
      return false;
    }
    if (count === 1) {
      counts.delete(key);
    } else {
      counts.set(key, count - 1);
    }
  }
  return counts.size === 0;
}
