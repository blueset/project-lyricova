import type { ParagraphLayout, ShapedCluster } from "@lyricova/glyph-renderer";
import { describe, expect, it, vi } from "vitest";
import {
  compareNativeTextClustersWithParagraphLayout,
  measureEnhancedCanvasTextClusterDiagnostics,
} from "./glyphNativeDiagnostics";
import type {
  EnhancedCanvasNativeTextCluster,
  EnhancedCanvasTextMeasureContext,
  LyricovaNativeTextClustersResult,
} from "./enhancedCanvasTextMetricsTypes";

function createMeasureContext(
  nativeClusters: readonly EnhancedCanvasNativeTextCluster[] | undefined,
): EnhancedCanvasTextMeasureContext {
  return {
    measureText: vi.fn(() =>
      nativeClusters === undefined
        ? {}
        : {
            getTextClusters: () => nativeClusters,
          },
    ),
  };
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

function makeSourceRange(text: string, startUtf16: number, endUtf16: number) {
  return {
    utf8Start: utf8Length(text.slice(0, startUtf16)),
    utf8End: utf8Length(text.slice(0, endUtf16)),
    utf16Start: startUtf16,
    utf16End: endUtf16,
  };
}

function makeGlyph(clusterStart: number, clusterEnd: number) {
  return {
    glyphId: clusterStart + 1,
    fontId: 1,
    cluster: clusterStart,
    clusterEnd,
    clusterUtf16: clusterStart,
    clusterEndUtf16: clusterEnd,
    xAdvance: 0,
    yAdvance: 0,
    xOffset: 0,
    yOffset: 0,
  };
}

function makeWasmCluster(
  text: string,
  startUtf16: number,
  endUtf16: number,
  x: number,
  advance: number,
  overrides: Partial<ShapedCluster> = {},
): ShapedCluster {
  const glyphCount = overrides.glyphs?.length ?? 1;

  return {
    source: makeSourceRange(text, startUtf16, endUtf16),
    fontId: 1,
    direction: "ltr",
    level: 0,
    glyphs:
      overrides.glyphs ??
      Array.from({ length: glyphCount }, () => makeGlyph(startUtf16, endUtf16)),
    x,
    advance,
    leadingSpace: 0,
    trailingSpace: 0,
    bounds: { xMin: 0, xMax: advance, yMin: -10, yMax: 5 },
    isWhitespace: false,
    ...overrides,
    script: overrides.script ?? "Latn",
  };
}

function makeLayout(
  text: string,
  clusters: readonly ShapedCluster[],
  overrides: Partial<ParagraphLayout> = {},
): ParagraphLayout {
  const lineSource =
    overrides.lines?.[0]?.source ?? makeSourceRange(text, 0, text.length);
  const width = clusters.reduce((sum, cluster) => sum + cluster.advance, 0);

  return {
    lines: overrides.lines ?? [
      {
        clusters: [...clusters],
        source: lineSource,
        width,
        trailingWhitespace: 0,
        top: 0,
        baseline: 16,
        height: 20,
        hardBreak: true,
        direction: "ltr",
      },
    ],
    baseDirection: "ltr",
    width,
    height: 20,
    lineHeight: 20,
    ascent: 16,
    descent: 4,
    missingFontRanges: [],
    ...overrides,
  };
}

describe("glyph native diagnostics", () => {
  it("matches a ligature cluster exactly when native and WASM ranges align", () => {
    const text = "fi";
    const layout = makeLayout(text, [
      makeWasmCluster(text, 0, 2, 0, 18, {
        glyphs: [makeGlyph(0, 2), makeGlyph(0, 2)],
      }),
    ]);
    const nativeResult: LyricovaNativeTextClustersResult = {
      kind: "available",
      clusters: [
        {
          sourceStartUtf16: 0,
          sourceEndUtf16: 2,
          x: 0,
          y: 12,
          advance: 18,
          nativeCluster: { start: 0, end: 2, x: 0, y: 12, advance: 18 },
        },
      ],
    };

    const report = compareNativeTextClustersWithParagraphLayout(
      text,
      nativeResult,
      layout,
    );

    expect(report.comparison.kind).toBe("compared");
    expect(report.comparison).toMatchObject({
      kind: "compared",
      sequence: {
        exactVisualOrder: true,
        sameRangesDifferentOrder: false,
      },
      summary: {
        matches: true,
        rangeMismatchCount: 0,
        positionMismatchCount: 0,
      },
      comparisons: [
        {
          kind: "match",
          native: { startUtf16: 0, endUtf16: 2, advance: 18 },
          wasm: { startUtf16: 0, endUtf16: 2, glyphCount: 2 },
          x: { status: "match", native: 0, wasm: 0 },
          advance: { status: "match", native: 18, wasm: 18 },
          endX: { status: "match", native: 18, wasm: 18 },
        },
      ],
    });
  });

  it("uses configurable tolerance and derived native advances from successive x positions", () => {
    const text = "AB";
    const layout = makeLayout(text, [
      makeWasmCluster(text, 0, 1, 0, 10),
      makeWasmCluster(text, 1, 2, 10, 9),
    ]);
    const nativeResult: LyricovaNativeTextClustersResult = {
      kind: "available",
      clusters: [
        {
          sourceStartUtf16: 0,
          sourceEndUtf16: 1,
          x: 0.03,
          y: 12,
          nativeCluster: { start: 0, end: 1, x: 0.03, y: 12 },
        },
        {
          sourceStartUtf16: 1,
          sourceEndUtf16: 2,
          x: 10.02,
          y: 12,
          nativeCluster: { start: 1, end: 2, x: 10.02, y: 12 },
        },
      ],
    };

    const report = compareNativeTextClustersWithParagraphLayout(
      text,
      nativeResult,
      layout,
      { tolerance: 0.05 },
    );

    expect(report.comparison).toMatchObject({
      kind: "compared",
      summary: {
        matches: true,
      },
      comparisons: [
        {
          kind: "match",
          advance: {
            status: "match",
            native: 9.99,
            wasm: 10,
            nativeSource: "derived-from-next-cluster-x",
          },
        },
        {
          kind: "match",
          x: {
            status: "match",
            native: 10.02,
            wasm: 10,
          },
        },
      ],
    });
  });

  it("reports range mismatches and extra native clusters explicitly", () => {
    const text = "AB";
    const layout = makeLayout(text, [makeWasmCluster(text, 0, 2, 0, 18)]);
    const nativeResult: LyricovaNativeTextClustersResult = {
      kind: "available",
      clusters: [
        {
          sourceStartUtf16: 0,
          sourceEndUtf16: 1,
          x: 0,
          y: 12,
          advance: 9,
          nativeCluster: { start: 0, end: 1, x: 0, y: 12, advance: 9 },
        },
        {
          sourceStartUtf16: 1,
          sourceEndUtf16: 2,
          x: 9,
          y: 12,
          advance: 9,
          nativeCluster: { start: 1, end: 2, x: 9, y: 12, advance: 9 },
        },
      ],
    };

    const report = compareNativeTextClustersWithParagraphLayout(
      text,
      nativeResult,
      layout,
    );

    expect(report.comparison).toMatchObject({
      kind: "compared",
      summary: {
        matches: false,
        rangeMismatchCount: 1,
        extraNativeCount: 1,
      },
      comparisons: [
        {
          kind: "range-mismatch",
          native: { startUtf16: 0, endUtf16: 1 },
          wasm: { startUtf16: 0, endUtf16: 2 },
        },
        {
          kind: "extra-native",
          native: { startUtf16: 1, endUtf16: 2 },
        },
      ],
    });
  });

  it("flags visual-order differences when RTL ranges appear in different cluster order", () => {
    const text = "אב";
    const layout = makeLayout(
      text,
      [
        makeWasmCluster(text, 1, 2, 0, 11, { direction: "rtl", level: 1 }),
        makeWasmCluster(text, 0, 1, 11, 11, { direction: "rtl", level: 1 }),
      ],
      { baseDirection: "rtl" },
    );
    const nativeResult: LyricovaNativeTextClustersResult = {
      kind: "available",
      clusters: [
        {
          sourceStartUtf16: 0,
          sourceEndUtf16: 1,
          x: 11,
          y: 12,
          advance: 11,
          nativeCluster: { start: 0, end: 1, x: 11, y: 12, advance: 11 },
        },
        {
          sourceStartUtf16: 1,
          sourceEndUtf16: 2,
          x: 0,
          y: 12,
          advance: 11,
          nativeCluster: { start: 1, end: 2, x: 0, y: 12, advance: 11 },
        },
      ],
    };

    const report = compareNativeTextClustersWithParagraphLayout(
      text,
      nativeResult,
      layout,
    );

    expect(report.comparison).toMatchObject({
      kind: "compared",
      sequence: {
        exactVisualOrder: false,
        sameRangesDifferentOrder: true,
      },
      summary: {
        matches: false,
        rangeMismatchCount: 2,
      },
      comparisons: [
        {
          kind: "range-mismatch",
          native: { startUtf16: 0, endUtf16: 1 },
          wasm: { startUtf16: 1, endUtf16: 2 },
        },
        {
          kind: "range-mismatch",
          native: { startUtf16: 1, endUtf16: 2 },
          wasm: { startUtf16: 0, endUtf16: 1 },
        },
      ],
    });
  });

  it("returns native unavailability separately without attempting a fake comparison", () => {
    const text = "lyrics";
    const layout = makeLayout(text, [makeWasmCluster(text, 0, 6, 0, 32)]);
    const context = createMeasureContext(undefined);

    const report = measureEnhancedCanvasTextClusterDiagnostics(
      context,
      text,
      layout,
    );

    expect(report).toMatchObject({
      text,
      native: {
        kind: "unavailable",
        reason: "missing-get-text-clusters",
      },
      wasm: {
        kind: "single-line",
      },
      comparison: {
        kind: "skipped",
        reason: "native-unavailable",
      },
    });
    expect(context.measureText).toHaveBeenCalledWith(text);
  });

  it("marks wrapped or otherwise non-single-line layouts as invalid explicitly", () => {
    const text = "wrap";
    const context = createMeasureContext([{ start: 0, end: 4, x: 0, y: 12 }]);
    const layout = makeLayout(text, [], {
      lines: [
        {
          clusters: [makeWasmCluster(text, 0, 2, 0, 10)],
          source: makeSourceRange(text, 0, 2),
          width: 10,
          trailingWhitespace: 0,
          top: 0,
          baseline: 16,
          height: 20,
          hardBreak: false,
          direction: "ltr",
        },
        {
          clusters: [makeWasmCluster(text, 2, 4, 0, 12)],
          source: makeSourceRange(text, 2, 4),
          width: 12,
          trailingWhitespace: 0,
          top: 20,
          baseline: 36,
          height: 20,
          hardBreak: true,
          direction: "ltr",
        },
      ],
    });

    const report = measureEnhancedCanvasTextClusterDiagnostics(
      context,
      text,
      layout,
    );

    expect(report).toMatchObject({
      wasm: {
        kind: "invalid-layout",
        reason: "non-single-line-layout",
      },
      comparison: {
        kind: "skipped",
        reason: "invalid-layout",
      },
    });
  });
});
