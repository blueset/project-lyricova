import { act, render } from "@testing-library/react";
import { createRef, forwardRef, StrictMode, useCallback } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaybackAnimationController } from "./types";
import { useWebAnimationController } from "./useWebAnimationController";

type AnimationStub = Animation & {
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
};

const animations: AnimationStub[] = [];

function createAnimationStub(): AnimationStub {
  const animation = {
    cancel: vi.fn(),
    currentTime: null,
    pause: vi.fn(),
    play: vi.fn(),
    playbackRate: 1,
    ready: Promise.resolve(),
    effect: {
      getComputedTiming: () => ({ endTime: 10_000 }),
    } as AnimationEffect,
  } as unknown as AnimationStub;
  animations.push(animation);
  return animation;
}

const Harness = forwardRef<
  PlaybackAnimationController,
  { animationVersion: number }
>(function Harness({ animationVersion }, ref) {
  const createAnimation = useCallback(() => {
    void animationVersion;
    return createAnimationStub();
  }, [animationVersion]);
  const animationRef = useWebAnimationController<HTMLSpanElement>(
    ref,
    createAnimation,
  );
  return <span ref={animationRef}>lyrics</span>;
});

afterEach(() => {
  animations.length = 0;
});

describe("useWebAnimationController", () => {
  it("synchronizes and recreates an animation on the same node", () => {
    const controller = createRef<PlaybackAnimationController>();
    const view = render(<Harness ref={controller} animationVersion={1} />);
    const firstAnimation = animations.at(-1)!;

    act(() => {
      controller.current?.synchronize({
        currentTime: 2.5,
        duration: 10,
        playbackRate: 1.25,
        state: "playing",
      });
    });
    expect(firstAnimation.currentTime).toBe(2500);
    expect(firstAnimation.playbackRate).toBe(1.25);
    expect(firstAnimation.play).toHaveBeenCalled();

    view.rerender(<Harness ref={controller} animationVersion={2} />);
    const secondAnimation = animations.at(-1)!;
    expect(secondAnimation).not.toBe(firstAnimation);
    expect(firstAnimation.cancel).toHaveBeenCalled();
    expect(secondAnimation.currentTime).toBe(2500);

    view.unmount();
    expect(secondAnimation.cancel).toHaveBeenCalled();
  });

  it("cleans up animations during Strict Mode ref replay", () => {
    const controller = createRef<PlaybackAnimationController>();
    const view = render(
      <StrictMode>
        <Harness ref={controller} animationVersion={1} />
      </StrictMode>,
    );

    view.unmount();
    expect(animations.length).toBeGreaterThan(0);
    expect(
      animations.every((animation) => animation.cancel.mock.calls.length),
    ).toBe(true);
  });

  it("keeps a completed animation at its filled end state", () => {
    const controller = createRef<PlaybackAnimationController>();
    render(<Harness ref={controller} animationVersion={1} />);
    const animation = animations.at(-1)!;

    act(() => {
      controller.current?.synchronize({
        currentTime: 12,
        duration: 20,
        playbackRate: 1,
        state: "playing",
      });
    });

    expect(animation.currentTime).toBe(12_000);
    expect(animation.pause).toHaveBeenCalled();
    expect(animation.play).not.toHaveBeenCalled();
  });
});
