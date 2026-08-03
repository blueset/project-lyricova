import { Profiler, type ProfilerProps } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppContext } from "../../AppContext";
import { InterludeDots } from "./InterludeDots";
import {
  findInterludeGaps,
  interludeDotsState,
  type InterludeGap,
  type InterludeLine,
} from "./interlude";

// A single qualifying gap (seconds): line 0 ends at 2, line 1 starts at 20, so
// the gap is [2, 19.75] (duration 17.75 s). The upcoming line's role decides
// alignment - 0 (left) here, 1 (right/duet) below.
const NON_DUET_LINES: InterludeLine[] = [
  { startTime: 0, endTime: 2, role: 0 },
  { startTime: 20, endTime: 22, role: 0 },
];
const DUET_LINES: InterludeLine[] = [
  { startTime: 0, endTime: 2, role: 0 },
  { startTime: 20, endTime: 22, role: 1 },
];

const GAPS = findInterludeGaps(NON_DUET_LINES);
const DUET_GAPS = findInterludeGaps(DUET_LINES);
const GAP = GAPS[0];

/**
 * The model's own answer for a given media time, computed via the *real*
 * {@link interludeDotsState} using the exact arithmetic the component uses
 * (`(currentTime - startTime) * 1000`), so the assertions track the model
 * rather than hard-coded numbers.
 */
function expectedState(currentTime: number, gap: InterludeGap) {
  return interludeDotsState(
    (currentTime - gap.startTime) * 1000,
    gap.duration * 1000,
  );
}

function makePlayer({ currentTime = 0, paused = false } = {}) {
  const player = document.createElement("audio");
  Object.defineProperties(player, {
    currentTime: { configurable: true, writable: true, value: currentTime },
    duration: { configurable: true, writable: true, value: 300 },
    playbackRate: { configurable: true, writable: true, value: 1 },
    paused: { configurable: true, writable: true, value: paused },
    ended: { configurable: true, writable: true, value: false },
    readyState: {
      configurable: true,
      writable: true,
      value: HTMLMediaElement.HAVE_ENOUGH_DATA,
    },
  });
  return player;
}

function renderDots({
  gaps = GAPS,
  fontSize = 40,
  currentTime = 0,
  paused = false,
  onRender,
}: {
  gaps?: readonly InterludeGap[];
  fontSize?: number;
  currentTime?: number;
  paused?: boolean;
  onRender?: ProfilerProps["onRender"];
} = {}) {
  const player = makePlayer({ currentTime, paused });
  const playerRef = { current: player } as { current: HTMLAudioElement };
  const tree = (
    <AppContext playerRef={playerRef}>
      <InterludeDots gaps={gaps} fontSize={fontSize} />
    </AppContext>
  );
  const view = render(
    onRender ? (
      <Profiler id="interlude" onRender={onRender}>
        {tree}
      </Profiler>
    ) : (
      tree
    ),
  );
  return { player, playerRef, view };
}

/** Move the media clock to `currentTime` (seconds) and emit one snapshot. */
function tick(
  player: HTMLAudioElement,
  currentTime: number,
  event = "timeupdate",
) {
  act(() => {
    (player as unknown as { currentTime: number }).currentTime = currentTime;
    player.dispatchEvent(new Event(event));
  });
}

let cancelFrame: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // jsdom does not run animation frames on its own; keep them fully controlled
  // (and non-looping) so "frames" are exactly the media events we dispatch.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
  cancelFrame = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InterludeDots visibility", () => {
  it("renders nothing until the clock enters a gap, then shows the indicator", () => {
    const { player } = renderDots();
    expect(screen.queryByTestId("interlude-dots")).toBeNull();

    tick(player, 5); // inside [2, 19.75]

    const container = screen.getByTestId("interlude-dots");
    expect(container).toBeTruthy();
    // A non-duet upcoming line aligns to the start.
    expect(container.dataset.nextDuet).toBe("false");
    expect(container.className).toContain("justify-start");
  });

  it("renders exactly three dots", () => {
    const { player } = renderDots();
    tick(player, 5);
    expect(screen.getAllByTestId("interlude-dot")).toHaveLength(3);
  });

  it("hides again once the clock leaves the gap", () => {
    const { player } = renderDots();
    tick(player, 5);
    expect(screen.queryByTestId("interlude-dots")).toBeTruthy();
    tick(player, 100); // past the gap end
    expect(screen.queryByTestId("interlude-dots")).toBeNull();
  });
});

describe("InterludeDots choreography", () => {
  it("writes scale and per-dot opacity from interludeDotsState (start, mid, near-end)", () => {
    const { player } = renderDots();

    // The choreography occupies the trailing 4 s of the gap ([15.75, 19.75]
    // here), so the sampled frames are start/mid/near-end *of that window*.
    for (const currentTime of [16.4, 17.75, 19.7]) {
      tick(player, currentTime);
      const state = expectedState(currentTime, GAP);

      const group = screen.getByTestId("interlude-dots-group");
      expect(group.style.transform).toBe(`scale(${state.scale})`);
      expect(group.style.opacity).toBe(`${state.opacity}`);

      // The group carries the shared alpha; each dot carries its relative fill.
      screen.getAllByTestId("interlude-dot").forEach((dot, index) => {
        const relative =
          state.opacity > 0 ? state.dotOpacities[index] / state.opacity : 0;
        expect(dot.style.opacity).toBe(`${relative}`);
      });

      // The sampled times are non-trivial (partial/near-full opacity).
      expect(state.opacity).toBeGreaterThan(0);
      expect(Number.isNaN(state.scale)).toBe(false);
    }
  });

  it("keeps the group hidden (opacity 0) during the first 500 ms", () => {
    const { player } = renderDots();
    tick(player, 15.85); // 100 ms into the trailing window, < 500 ms

    const group = screen.getByTestId("interlude-dots-group");
    expect(group.style.opacity).toBe("0");
    // The model agrees the indicator is hidden this early.
    expect(expectedState(15.85, GAP).opacity).toBe(0);
  });

  it("right-aligns the indicator for a duet gap", () => {
    const { player } = renderDots({ gaps: DUET_GAPS });
    tick(player, 5);

    const container = screen.getByTestId("interlude-dots");
    expect(container.dataset.nextDuet).toBe("true");
    expect(container.className).toContain("justify-end");
    expect(container.className).not.toContain("justify-start");
    expect(
      screen.getByTestId("interlude-dots-group").style.transformOrigin,
    ).toBe("right center");
  });
});

describe("InterludeDots is driven off the DOM, not React", () => {
  it("re-renders only when the active gap changes, not per frame", () => {
    const onRender = vi.fn();
    const { player } = renderDots({ onRender });

    const afterMount = onRender.mock.calls.length;

    tick(player, 5); // enter the gap -> exactly one commit
    const afterEnter = onRender.mock.calls.length;
    expect(afterEnter).toBe(afterMount + 1);

    // Many in-gap frames: values are painted imperatively, no re-render.
    for (const currentTime of [5.5, 6, 7, 8.25, 9, 10, 12.5, 15, 19]) {
      tick(player, currentTime);
    }
    expect(onRender.mock.calls.length).toBe(afterEnter);

    tick(player, 100); // leave the gap -> one more commit
    expect(onRender.mock.calls.length).toBe(afterEnter + 1);
  });

  it("freezes on the last painted frame when playback pauses mid-interlude", () => {
    const { player } = renderDots();
    tick(player, 17.75); // mid animation window, playing

    const group = screen.getByTestId("interlude-dots-group");
    const frozenTransform = group.style.transform;
    const frozenOpacity = group.style.opacity;
    expect(frozenTransform).toBe(`scale(${expectedState(17.75, GAP).scale})`);
    expect(frozenOpacity).not.toBe("0");

    // Pausing at the same position must not reset or jump the indicator, and it
    // must cancel the pending animation frame so nothing keeps advancing.
    (player as unknown as { paused: boolean }).paused = true;
    act(() => {
      player.dispatchEvent(new Event("pause"));
    });

    expect(group.style.transform).toBe(frozenTransform);
    expect(group.style.opacity).toBe(frozenOpacity);
    expect(cancelFrame).toHaveBeenCalled();
  });
});

describe("InterludeDots lifecycle & robustness", () => {
  it("unmounts cleanly, removing every listener it added and cancelling frames", () => {
    const player = makePlayer();
    const addSpy = vi.spyOn(player, "addEventListener");
    const removeSpy = vi.spyOn(player, "removeEventListener");
    const playerRef = { current: player } as { current: HTMLAudioElement };

    const view = render(
      <AppContext playerRef={playerRef}>
        <InterludeDots gaps={GAPS} fontSize={40} />
      </AppContext>,
    );
    tick(player, 10); // enter the gap, schedule a frame

    const added = new Set(addSpy.mock.calls.map((call) => call[0]));
    view.unmount();
    const removed = new Set(removeSpy.mock.calls.map((call) => call[0]));

    expect(added.size).toBeGreaterThan(0);
    for (const event of added) expect(removed.has(event)).toBe(true);
    expect(cancelFrame).toHaveBeenCalled();
    // A late event on the detached player must not throw.
    expect(() => player.dispatchEvent(new Event("timeupdate"))).not.toThrow();
  });

  it.each([0, -10, NaN, Infinity])(
    "emits no NaN in any inline style for degenerate fontSize %s",
    (fontSize) => {
      const { player } = renderDots({ fontSize });
      tick(player, 10);

      const elements = [
        screen.getByTestId("interlude-dots"),
        screen.getByTestId("interlude-dots-group"),
        ...screen.getAllByTestId("interlude-dot"),
      ];
      for (const element of elements) {
        expect(element.getAttribute("style") ?? "").not.toContain("NaN");
      }
    },
  );
});
