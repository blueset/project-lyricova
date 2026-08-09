import { act, fireEvent, render } from "@testing-library/react";
import type { RefObject } from "react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFollowScrollOffset,
  useScrollOffset,
} from "./useScrollOffset";

const rowAccumulateHeight = [0, 100, 200, 300];
const compactRowAccumulateHeight = [0, 100, 200];

function compactToNaturalCoordinate(coordinate: number) {
  if (coordinate < 100) return coordinate;
  if (coordinate <= 200) return coordinate + 200;
  return coordinate + 200;
}

function identityCoordinate(coordinate: number) {
  return coordinate;
}

function Harness({
  startRow,
  endRow,
  containerHeight = 200,
  compact = false,
}: {
  startRow: number;
  endRow: number;
  containerHeight?: number;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    scrollOffset,
    scrollContentHeight,
    isActiveScroll,
    isUserScrolling,
    isAutoFollow,
  } = useScrollOffset({
    containerRef: containerRef as RefObject<HTMLDivElement>,
    containerSize: { width: 400, height: containerHeight },
    rowAccumulateHeight: compact
      ? [0, 100, 200, 300, 400]
      : rowAccumulateHeight,
    autoRowAccumulateHeight: compact
      ? compactRowAccumulateHeight
      : rowAccumulateHeight,
    startRow,
    endRow,
    autoStartRow: compact ? 0 : startRow,
    autoEndRow: compact ? 2 : endRow,
    align: "center",
    alignAnchor: 0.5,
    ensureAutoRangeVisible: compact,
    autoOverflowRow: compact ? 1 : -1,
    autoToNaturalCoordinate: compact
      ? compactToNaturalCoordinate
      : identityCoordinate,
  });

  return (
    <div
      ref={containerRef}
      data-testid="scroller"
      data-scroll-offset={scrollOffset}
      data-scroll-content-height={scrollContentHeight}
      data-active-scroll={isActiveScroll}
      data-user-scrolling={isUserScrolling}
      data-auto-follow={isAutoFollow}
    />
  );
}

describe("calculateFollowScrollOffset", () => {
  it("shifts a fitting active block when the preferred anchor would clip it", () => {
    expect(
      calculateFollowScrollOffset({
        rowAccumulateHeight: [0, 60, 120],
        containerHeight: 150,
        startRow: 0,
        endRow: 2,
        align: "start",
        alignAnchor: 0.5,
        ensureRangeVisible: true,
        overflowRow: 1,
      }),
    ).toBe(-30);
  });

  it("anchors the newest active row when the active block is too tall", () => {
    expect(
      calculateFollowScrollOffset({
        rowAccumulateHeight: [0, 100, 200, 300],
        containerHeight: 150,
        startRow: 0,
        endRow: 3,
        align: "start",
        alignAnchor: 0.1,
        ensureRangeVisible: true,
        overflowRow: 2,
      }),
    ).toBe(185);
  });

  it("can prioritize an active row that is not the final document row", () => {
    expect(
      calculateFollowScrollOffset({
        rowAccumulateHeight: [0, 100, 200, 300],
        containerHeight: 150,
        startRow: 0,
        endRow: 3,
        align: "start",
        alignAnchor: 0.1,
        ensureRangeVisible: true,
        overflowRow: 0,
      }),
    ).toBe(-15);
  });

  it("fits the active block inside layout-specific viewport guards", () => {
    expect(
      calculateFollowScrollOffset({
        rowAccumulateHeight: [0, 60, 120],
        containerHeight: 200,
        startRow: 0,
        endRow: 2,
        align: "start",
        alignAnchor: 0.1,
        viewportPadding: { bottom: 80 },
        ensureRangeVisible: true,
        overflowRow: 1,
      }),
    ).toBe(0);

    expect(
      calculateFollowScrollOffset({
        rowAccumulateHeight: [0, 60, 120],
        containerHeight: 200,
        startRow: 0,
        endRow: 2,
        align: "start",
        alignAnchor: 0.1,
        viewportPadding: { top: 30 },
        ensureRangeVisible: true,
        overflowRow: 1,
      }),
    ).toBe(-30);
  });
});

describe("useScrollOffset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses native scrollTop during user scrolling and resumes auto-follow", () => {
    const view = render(<Harness startRow={1} endRow={2} />);
    const scroller = view.getByTestId("scroller");

    expect(scroller.dataset.scrollOffset).toBe("50");
    expect(scroller.dataset.scrollContentHeight).toBe("450");
    expect(scroller.scrollTop).toBe(150);

    act(() => {
      vi.advanceTimersByTime(20);
      scroller.scrollTop = 210;
      fireEvent.scroll(scroller);
    });

    expect(scroller.dataset.scrollOffset).toBe("110");
    expect(scroller.dataset.activeScroll).toBe("true");
    expect(scroller.dataset.userScrolling).toBe("true");

    act(() => vi.advanceTimersByTime(151));
    expect(scroller.dataset.scrollOffset).toBe("110");
    expect(scroller.dataset.activeScroll).toBe("true");
    expect(scroller.dataset.userScrolling).toBe("false");

    view.rerender(<Harness startRow={2} endRow={3} />);
    expect(scroller.dataset.scrollOffset).toBe("110");

    act(() => vi.advanceTimersByTime(5000));
    expect(scroller.dataset.scrollOffset).toBe("150");
    expect(scroller.dataset.activeScroll).toBe("false");
    expect(scroller.scrollTop).toBe(250);

    act(() => fireEvent.scroll(scroller));
    expect(scroller.dataset.activeScroll).toBe("false");
    expect(scroller.dataset.userScrolling).toBe("false");
  });

  it("rebases native scrollTop when the viewport resizes during browsing", () => {
    const view = render(
      <Harness startRow={1} endRow={2} containerHeight={200} />,
    );
    const scroller = view.getByTestId("scroller");

    act(() => {
      scroller.scrollTop = 210;
      fireEvent.scroll(scroller);
      vi.advanceTimersByTime(151);
    });
    expect(scroller.dataset.scrollOffset).toBe("110");
    expect(scroller.dataset.activeScroll).toBe("true");
    expect(scroller.dataset.userScrolling).toBe("false");

    view.rerender(<Harness startRow={1} endRow={2} containerHeight={300} />);
    expect(scroller.dataset.scrollOffset).toBe("100");
    expect(scroller.scrollTop).toBe(250);

    act(() => fireEvent.scroll(scroller));
    expect(scroller.dataset.scrollOffset).toBe("100");
    expect(scroller.dataset.userScrolling).toBe("false");

    act(() => vi.advanceTimersByTime(4849));
    expect(scroller.dataset.activeScroll).toBe("false");
    expect(scroller.dataset.scrollOffset).toBe("0");
    expect(scroller.scrollTop).toBe(150);
  });

  it("restores natural geometry when manual scrolling starts", () => {
    const view = render(<Harness startRow={0} endRow={4} compact />);
    const scroller = view.getByTestId("scroller");

    expect(scroller.dataset.scrollOffset).toBe("0");
    expect(scroller.dataset.autoFollow).toBe("true");
    expect(scroller.scrollTop).toBe(300);

    act(() => {
      scroller.scrollTop = 310;
      fireEvent.scroll(scroller);
    });

    expect(scroller.dataset.scrollOffset).toBe("210");
    expect(scroller.dataset.activeScroll).toBe("true");
    expect(scroller.dataset.autoFollow).toBe("false");

    act(() => vi.advanceTimersByTime(5000));

    expect(scroller.dataset.scrollOffset).toBe("0");
    expect(scroller.dataset.activeScroll).toBe("false");
    expect(scroller.dataset.autoFollow).toBe("true");
    expect(scroller.scrollTop).toBe(300);
  });
});
