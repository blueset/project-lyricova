import { act, fireEvent, render } from "@testing-library/react";
import type { RefObject } from "react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollOffset } from "./useScrollOffset";

const rowAccumulateHeight = [0, 100, 200, 300];

function Harness({
  startRow,
  endRow,
  containerHeight = 200,
}: {
  startRow: number;
  endRow: number;
  containerHeight?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollOffset, scrollContentHeight, isActiveScroll, isUserScrolling } =
    useScrollOffset({
      containerRef: containerRef as RefObject<HTMLDivElement>,
      containerSize: { width: 400, height: containerHeight },
      rowAccumulateHeight,
      startRow,
      endRow,
      align: "center",
      alignAnchor: 0.5,
    });

  return (
    <div
      ref={containerRef}
      data-testid="scroller"
      data-scroll-offset={scrollOffset}
      data-scroll-content-height={scrollContentHeight}
      data-active-scroll={isActiveScroll}
      data-user-scrolling={isUserScrolling}
    />
  );
}

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
});
