import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAnimationFrame } from "./useAnimationFrame";

describe("useAnimationFrame", () => {
  it("schedules a one-shot frame when an inactive refresh key changes", () => {
    const callbacks: FrameRequestCallback[] = [];
    const onFrame = vi.fn();
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callbacks.push(callback);
        return callbacks.length;
      });
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});

    function Harness({ progress }: { progress: number }) {
      useAnimationFrame(onFrame, false, progress);
      return null;
    }

    const view = render(<Harness progress={0} />);
    expect(callbacks).toHaveLength(1);

    act(() => callbacks.shift()!(0));
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(0);

    view.rerender(<Harness progress={5} />);
    expect(callbacks).toHaveLength(1);

    act(() => callbacks.shift()!(16));
    expect(onFrame).toHaveBeenLastCalledWith(16);
    expect(callbacks).toHaveLength(0);

    view.unmount();
    requestAnimationFrame.mockRestore();
    cancelAnimationFrame.mockRestore();
  });
});
