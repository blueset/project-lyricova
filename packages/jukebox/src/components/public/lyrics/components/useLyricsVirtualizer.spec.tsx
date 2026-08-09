import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useLyricsVirtualizer,
  type VirtualizerRowRenderProps,
} from "./useLyricsVirtualizer";

const layoutState = vi.hoisted(() => ({ height: 100 }));
const scrollState = vi.hoisted(() => ({
  isAutoFollow: true,
  lastArgs: null as Record<string, unknown> | null,
}));

vi.mock("./useContainerSize", () => ({
  useContainerSize: () => ({ width: 400, height: layoutState.height }),
}));

vi.mock("./useRowMeasurement", () => ({
  useRowMeasurement: ({ rowCount }: { rowCount: number }) => ({
    rowRefHandler: () => () => undefined,
    rowAccumulateHeight: Array.from(
      { length: rowCount + 1 },
      (_, index) => index * 50,
    ),
  }),
}));

vi.mock("./useScrollOffset", () => ({
  useScrollOffset: (args: Record<string, unknown>) => {
    scrollState.lastArgs = args;
    return {
      scrollOffset: 0,
      naturalScrollOffset: 0,
      scrollContentHeight: 400,
      isActiveScroll: !scrollState.isAutoFollow,
      isUserScrolling: false,
      isAutoFollow: scrollState.isAutoFollow,
    };
  },
}));

vi.mock("./useRenderRange", () => ({
  useRenderRange: ({
    rowAccumulateHeight,
  }: {
    rowAccumulateHeight: number[];
  }) => ({
    renderStartRow: 0,
    renderEndRow: rowAccumulateHeight.length - 1,
  }),
}));

describe("useLyricsVirtualizer", () => {
  beforeEach(() => {
    layoutState.height = 100;
    scrollState.isAutoFollow = true;
    scrollState.lastArgs = null;
  });

  it("fades nearby compacted rows during auto-follow and restores natural rows for browsing", () => {
    const rowRenderer = vi.fn(
      ({ index, top }: VirtualizerRowRenderProps) => `${index}:${top}`,
    );
    const containerRef: RefObject<HTMLDivElement> = {
      current: document.createElement("div"),
    };

    const view = renderHook(() =>
      useLyricsVirtualizer({
        containerRef,
        startRow: 0,
        endRow: 4,
        align: "start",
        alignAnchor: 0.1,
        estimatedRowHeight: 50,
        rowCount: 4,
        activeRows: [0, 3],
        compactActiveRange: true,
        rowRenderer,
      }),
    );

    expect(rowRenderer.mock.calls.map(([props]) => props.index)).toEqual([
      1, 2, 0, 3,
    ]);
    expect(rowRenderer.mock.calls.map(([props]) => props.isCompacted)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(rowRenderer.mock.calls.map(([props]) => props.top)).toEqual([
      50, 50, 0, 50,
    ]);

    rowRenderer.mockClear();
    scrollState.isAutoFollow = false;
    view.rerender();

    expect(rowRenderer.mock.calls.map(([props]) => props.index)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(rowRenderer.mock.calls.map(([props]) => props.top)).toEqual([
      0, 50, 100, 150,
    ]);
    expect(rowRenderer.mock.calls.map(([props]) => props.isCompacted)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("keeps the cumulative scroll range when the natural envelope fits", () => {
    layoutState.height = 500;
    const containerRef: RefObject<HTMLDivElement> = {
      current: document.createElement("div"),
    };

    renderHook(() =>
      useLyricsVirtualizer({
        containerRef,
        startRow: 0,
        endRow: 4,
        align: "start",
        alignAnchor: 0.1,
        estimatedRowHeight: 50,
        rowCount: 4,
        activeRows: [0],
        compactActiveRange: true,
        rowRenderer: () => null,
      }),
    );

    expect(scrollState.lastArgs?.autoStartRow).toBe(0);
    expect(scrollState.lastArgs?.autoEndRow).toBe(4);
    expect(scrollState.lastArgs?.ensureAutoRangeVisible).toBe(false);
  });

  it("resolves layout-specific padding from the measured viewport", () => {
    layoutState.height = 240;
    const containerRef: RefObject<HTMLDivElement> = {
      current: document.createElement("div"),
    };

    renderHook(() =>
      useLyricsVirtualizer({
        containerRef,
        startRow: 0,
        endRow: 4,
        align: "center",
        alignAnchor: 0.5,
        estimatedRowHeight: 50,
        rowCount: 4,
        activeRows: [0, 3],
        compactActiveRange: true,
        activeRangeViewportPadding: ({ height }) => ({
          top: height * 0.1,
          bottom: height * 0.2,
        }),
        rowRenderer: () => null,
      }),
    );

    expect(scrollState.lastArgs?.viewportPadding).toEqual({
      top: 24,
      bottom: 48,
    });
  });
});
