import { act, render, waitFor } from "@testing-library/react";
import { useCallback, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { findActiveKeyframeIndex, useMediaClock } from "./useMediaClock";
import type { PlaybackSnapshot } from "./types";
import { usePlayerLyricsState } from "./usePlayerLyricsState";

describe("findActiveKeyframeIndex", () => {
  it.each([
    [[], 10, -1],
    [[1, 2, 3], 0, -1],
    [[1, 2, 3], 1, 0],
    [[1, 2, 3], 2.5, 1],
    [[1, 2, 3], 10, 2],
    [[1, 2, 2, 3], 2, 2],
  ] as const)("selects the frame at %s for %s", (starts, time, expected) => {
    expect(findActiveKeyframeIndex(starts, time)).toBe(expected);
  });
});

describe("useMediaClock", () => {
  it("synchronizes immediately, responds to seeks, and cleans up frames", () => {
    const snapshots: PlaybackSnapshot[] = [];
    const animationFrames = new Map<number, FrameRequestCallback>();
    let nextAnimationFrame = 1;
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        const id = nextAnimationFrame++;
        animationFrames.set(id, callback);
        return id;
      });
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((id) => {
        animationFrames.delete(id);
      });

    function Harness() {
      const playerRef = useRef<HTMLAudioElement>(null);
      useMediaClock(playerRef, (snapshot) => snapshots.push(snapshot));
      return <audio ref={playerRef} />;
    }

    const view = render(<Harness />);
    const player = view.container.querySelector("audio")!;
    Object.defineProperties(player, {
      currentTime: { configurable: true, writable: true, value: 4 },
      duration: { configurable: true, value: 30 },
      paused: { configurable: true, value: false },
      playbackRate: { configurable: true, writable: true, value: 1.5 },
      readyState: {
        configurable: true,
        writable: true,
        value: HTMLMediaElement.HAVE_ENOUGH_DATA,
      },
    });

    act(() => {
      player.dispatchEvent(new Event("play"));
    });
    expect(snapshots.at(-1)).toMatchObject({
      currentTime: 4,
      duration: 30,
      playbackRate: 1.5,
      state: "playing",
    });
    expect(animationFrames).toHaveLength(1);

    player.currentTime = 12;
    act(() => {
      player.dispatchEvent(new Event("seeked"));
    });
    expect(snapshots.at(-1)?.currentTime).toBe(12);

    Object.defineProperty(player, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });
    act(() => {
      player.dispatchEvent(new Event("waiting"));
    });
    expect(snapshots.at(-1)?.state).toBe("paused");
    expect(animationFrames).toHaveLength(0);

    view.unmount();
    expect(animationFrames).toHaveLength(0);
    expect(cancelAnimationFrame).toHaveBeenCalled();

    requestAnimationFrame.mockRestore();
    cancelAnimationFrame.mockRestore();
  });

  it("reselects a frame when a paused schedule changes", async () => {
    function Harness({ startTimes }: { startTimes: number[] }) {
      const playerRef = useRef<HTMLAudioElement>(null!);
      const bindPlayer = useCallback((player: HTMLAudioElement | null) => {
        playerRef.current = player as HTMLAudioElement;
        if (!player) return;
        Object.defineProperties(player, {
          currentTime: { configurable: true, value: 6 },
          duration: { configurable: true, value: 20 },
          paused: { configurable: true, value: true },
          playbackRate: { configurable: true, value: 1 },
          readyState: {
            configurable: true,
            value: HTMLMediaElement.HAVE_ENOUGH_DATA,
          },
        });
      }, []);
      const state = usePlayerLyricsState(
        startTimes.map((start, index) => ({ data: index, start })),
        playerRef,
      );
      return (
        <>
          <audio ref={bindPlayer} />
          <output>{state.currentFrameId}</output>
        </>
      );
    }

    const view = render(<Harness startTimes={[1, 5]} />);
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("1"));
    view.rerender(<Harness startTimes={[1, 7]} />);
    await waitFor(() => expect(view.getByRole("status").textContent).toBe("0"));
  });
});
