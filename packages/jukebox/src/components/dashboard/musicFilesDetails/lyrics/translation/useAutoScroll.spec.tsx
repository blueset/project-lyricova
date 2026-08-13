import { act, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useAutoScroll } from "./useAutoScroll";

function TestScroller() {
  const [content, setContent] = useState("initial");
  const autoScroll = useAutoScroll<HTMLDivElement>(content);

  return (
    <>
      <button onClick={() => setContent((value) => `${value} more`)}>
        Append
      </button>
      <div ref={autoScroll.ref} onScroll={autoScroll.onScroll}>
        {content}
      </div>
    </>
  );
}

function setDimensions(
  element: HTMLElement,
  {
    clientHeight,
    scrollHeight,
  }: { clientHeight: number; scrollHeight: number },
) {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: clientHeight },
    scrollHeight: { configurable: true, value: scrollHeight },
  });
}

describe("useAutoScroll", () => {
  it("follows new content until the user scrolls up, then resumes at bottom", () => {
    const { getByRole, container } = render(<TestScroller />);
    const scroller = container.querySelector("div")!;
    const append = getByRole("button", { name: "Append" });

    setDimensions(scroller, { clientHeight: 100, scrollHeight: 200 });
    act(() => append.click());
    expect(scroller.scrollTop).toBe(200);

    scroller.scrollTop = 50;
    fireEvent.scroll(scroller);
    setDimensions(scroller, { clientHeight: 100, scrollHeight: 250 });
    act(() => append.click());
    expect(scroller.scrollTop).toBe(50);

    scroller.scrollTop = 150;
    fireEvent.scroll(scroller);
    setDimensions(scroller, { clientHeight: 100, scrollHeight: 300 });
    act(() => append.click());
    expect(scroller.scrollTop).toBe(300);
  });
});
