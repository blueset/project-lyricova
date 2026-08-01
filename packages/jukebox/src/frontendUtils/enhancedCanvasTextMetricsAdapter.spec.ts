import { describe, expect, it, vi } from "vitest";
import { measureEnhancedCanvasTextClusters } from "./enhancedCanvasTextMetricsAdapter";
import type {
  EnhancedCanvasNativeTextCluster,
  EnhancedCanvasTextMeasureContext,
} from "./enhancedCanvasTextMetricsTypes";

function createMeasureContext(
  metrics: ReturnType<EnhancedCanvasTextMeasureContext["measureText"]>,
): EnhancedCanvasTextMeasureContext {
  return {
    measureText: vi.fn(() => metrics),
  };
}

describe("measureEnhancedCanvasTextClusters", () => {
  it("returns an explicit unavailable result when native clusters are absent", () => {
    const context = createMeasureContext({});

    expect(measureEnhancedCanvasTextClusters(context, "lyrics")).toEqual({
      kind: "unavailable",
      reason: "missing-get-text-clusters",
    });
    expect(context.measureText).toHaveBeenCalledWith("lyrics");
  });

  it("accepts canonical start/end clusters from the current draft", () => {
    const nativeClusters: EnhancedCanvasNativeTextCluster[] = [
      {
        start: 0,
        end: 1,
        x: 0,
        y: 12,
        align: "center",
        baseline: "middle",
      },
      {
        start: 1,
        end: 3,
        x: 14,
        y: 12,
      },
    ];
    const context = createMeasureContext({
      getTextClusters: () => nativeClusters,
    });

    expect(measureEnhancedCanvasTextClusters(context, "A😀")).toEqual({
      kind: "available",
      clusters: [
        {
          sourceStartUtf16: 0,
          sourceEndUtf16: 1,
          x: 0,
          y: 12,
          align: "center",
          baseline: "middle",
          nativeCluster: nativeClusters[0],
        },
        {
          sourceStartUtf16: 1,
          sourceEndUtf16: 3,
          x: 14,
          y: 12,
          nativeCluster: nativeClusters[1],
        },
      ],
    });
  });

  it("accepts legacy begin/end clusters and preserves extension fields", () => {
    const nativeClusters: EnhancedCanvasNativeTextCluster[] = [
      {
        begin: 0,
        end: 1,
        x: 0,
        y: 12,
        align: "center",
        baseline: "middle",
      },
      {
        begin: 1,
        end: 3,
        x: 14,
        y: 12,
        advance: 18,
        bounds: {
          x: 10,
          y: -4,
          width: 18,
          height: 20,
          left: 10,
          top: -4,
          right: 28,
          bottom: 16,
        },
      },
    ];
    const getTextClusters = vi.fn(() => nativeClusters);
    const context = createMeasureContext({ getTextClusters });

    expect(
      measureEnhancedCanvasTextClusters(context, "A😀", {
        align: "center",
        baseline: "middle",
        x: 2,
        y: 4,
      }),
    ).toEqual({
      kind: "available",
      clusters: [
        {
          sourceStartUtf16: 0,
          sourceEndUtf16: 1,
          x: 0,
          y: 12,
          align: "center",
          baseline: "middle",
          nativeCluster: nativeClusters[0],
        },
        {
          sourceStartUtf16: 1,
          sourceEndUtf16: 3,
          x: 14,
          y: 12,
          advance: 18,
          bounds: {
            x: 10,
            y: -4,
            width: 18,
            height: 20,
            left: 10,
            top: -4,
            right: 28,
            bottom: 16,
          },
          nativeCluster: nativeClusters[1],
        },
      ],
    });
    expect(getTextClusters).toHaveBeenCalledWith(0, 3, {
      align: "center",
      baseline: "middle",
      x: 2,
      y: 4,
    });
  });

  it("throws when canonical start and legacy begin disagree", () => {
    const context = createMeasureContext({
      getTextClusters: () => [{ start: 0, begin: 1, end: 2, x: 0, y: 12 }],
    });

    expect(() => measureEnhancedCanvasTextClusters(context, "AB")).toThrow(
      /start and begin must agree/,
    );
  });

  it("throws when a native implementation reports malformed clusters", () => {
    const context = createMeasureContext({
      getTextClusters: () => [{ start: 0, end: 1, x: 12 }],
    });

    expect(() => measureEnhancedCanvasTextClusters(context, "A")).toThrow(
      /must expose both x and y together/,
    );
  });

  it("wraps native getTextClusters exceptions instead of pretending success", () => {
    const nativeError = new Error("behind a flag");
    const context = createMeasureContext({
      getTextClusters: () => {
        throw nativeError;
      },
    });

    try {
      measureEnhancedCanvasTextClusters(context, "A");
      throw new Error("expected measureEnhancedCanvasTextClusters to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/getTextClusters\(\) threw/);
      expect((error as Error & { cause?: unknown }).cause).toBe(nativeError);
    }
  });
});
