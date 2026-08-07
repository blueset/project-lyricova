import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackSnapshot } from "../../../../hooks/types";
import type { GlyphLyricSegment } from "../glyph/lyricSegments";

// --- Runtime mock ----------------------------------------------------------
// A hoisted, mutable fake runtime the module mock delegates to. `subscribe`
// is genuine (backed by a Set) so `useGlyphRuntimeVersion` really subscribes
// and its unmount cleanup is observable; `bump()` notifies subscribers exactly
// like a font/layout landing.
const runtime = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const unsubscribeSpy = vi.fn();
  const layoutLine = vi.fn();
  const state = {
    version: 0,
    status: "ready" as "loading" | "ready" | "error",
    pathCache: {} as unknown,
  };
  const object = {
    get status() {
      return state.status;
    },
    get pathCache() {
      return state.pathCache;
    },
    layoutLine,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        unsubscribeSpy();
        listeners.delete(listener);
      };
    },
    getVersion() {
      return state.version;
    },
  };
  return {
    state,
    object,
    listeners,
    layoutLine,
    unsubscribeSpy,
    bump() {
      state.version += 1;
      listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("../glyph/glyphRuntime", async () => {
  const React = await import("react");
  return {
    // Mirrors the real size-tracking helper so the spec still asserts that the
    // component feeds the painter the axes for the size it is rendering.
    glyphVariations: (fontSize: number) =>
      ["wght=600", `opsz=${fontSize}`] as const,
    canvasPixelRatio: () => 1,
    useGlyphRuntime: () => runtime.object,
    useGlyphRuntimeVersion: (rt: {
      subscribe: (listener: () => void) => () => void;
      getVersion: () => number;
    }) =>
      React.useSyncExternalStore(rt.subscribe, rt.getVersion, rt.getVersion),
  };
});

// --- Media clock mock ------------------------------------------------------
// Capture the component's snapshot callback so a test can drive "frames"
// synchronously without a real media element or RAF.
const clock = vi.hoisted(() => ({
  onSnapshot: null as null | ((snapshot: PlaybackSnapshot) => void),
}));

vi.mock("../../../../hooks/useMediaClock", () => ({
  readPlaybackSnapshot: (): PlaybackSnapshot => ({
    currentTime: 0,
    duration: 100,
    playbackRate: 1,
    state: "paused",
  }),
  useMediaClock: (
    _playerRef: unknown,
    onSnapshot: (snapshot: PlaybackSnapshot) => void,
  ) => {
    clock.onSnapshot = onSnapshot;
  },
}));

import { AppContext } from "../../AppContext";
import { GlyphLineCanvas } from "./GlyphLineCanvas";

// --- Fixtures --------------------------------------------------------------

const MOCK_LAYOUT = {
  lines: [],
  height: 40,
  width: 100,
  baseDirection: "ltr" as const,
  rubyRow: { height: 0, baseline: 0, fontSize: 0 },
  rubyMetrics: null,
  rubies: [],
  issues: [],
  missingFontRanges: [],
};

function makeSegment(
  overrides: Partial<GlyphLyricSegment> = {},
): GlyphLyricSegment {
  return {
    lineIndex: 0,
    content: "hello",
    startTime: 0,
    endTime: 5,
    role: 0,
    minor: false,
    alignment: "start",
    furigana: [],
    timeTags: [],
    translation: null,
    ...overrides,
  };
}

function snapshot(
  currentTime: number,
  state: "playing" | "paused" = "playing",
): PlaybackSnapshot {
  return { currentTime, duration: 100, playbackRate: 1, state };
}

let ctxCalls: { clearRect: number; setTransform: number };

function renderLine(
  props: Partial<React.ComponentProps<typeof GlyphLineCanvas>> = {},
) {
  const player = document.createElement("audio");
  const playerRef = { current: player } as { current: HTMLAudioElement };
  const onHeightChange = vi.fn();
  const utils = render(
    <AppContext playerRef={playerRef}>
      <GlyphLineCanvas
        segment={makeSegment()}
        maxWidth={300}
        fontSize={40}
        reserveRubyRow={false}
        isActive={false}
        onHeightChange={onHeightChange}
        {...props}
      />
    </AppContext>,
  );
  return { ...utils, onHeightChange, player };
}

beforeEach(() => {
  ctxCalls = { clearRect: 0, setTransform: 0 };
  const ctx2d = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "clearRect") return () => (ctxCalls.clearRect += 1);
        if (prop === "setTransform") return () => (ctxCalls.setTransform += 1);
        return () => {};
      },
      set() {
        return true;
      },
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx2d as unknown as CanvasRenderingContext2D,
  );

  runtime.state.version = 0;
  runtime.state.status = "ready";
  runtime.state.pathCache = {};
  runtime.listeners.clear();
  runtime.layoutLine.mockReset().mockReturnValue(MOCK_LAYOUT);
  runtime.unsubscribeSpy.mockReset();
  clock.onSnapshot = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests -----------------------------------------------------------------

describe("GlyphLineCanvas", () => {
  it("shrink-wraps the painted box to the laid-out text", () => {
    renderLine();
    const root = screen.getByTestId("glyph-line-canvas-root");
    expect(root).toBeTruthy();
    expect(root.style.width).toBe("100px");
    expect(screen.getByTestId("glyph-line-canvas").style.width).toBe("160px");
    // The media clock is the sole timing source: the component registered a
    // snapshot callback.
    expect(clock.onSnapshot).toBeTypeOf("function");
  });

  it("reports the laid-out height once it resolves", () => {
    const { onHeightChange } = renderLine();
    expect(runtime.layoutLine).toHaveBeenCalled();
    expect(onHeightChange).toHaveBeenCalledWith(40);
    expect(screen.getByTestId("glyph-line-canvas-root").style.height).toBe(
      "40px",
    );
  });

  it("preserves an occupied width wider than the wrapping allocation", () => {
    runtime.layoutLine.mockReturnValue({ ...MOCK_LAYOUT, width: 350 });
    renderLine();
    const root = screen.getByTestId("glyph-line-canvas-root");
    expect(root.style.width).toBe("350px");
    expect(screen.getByTestId("glyph-line-canvas").style.width).toBe("410px");
  });

  it("redraws on each distinct media-clock snapshot of an active line", () => {
    renderLine({ isActive: true });
    const before = ctxCalls.clearRect;
    act(() => clock.onSnapshot?.(snapshot(1)));
    const afterFirst = ctxCalls.clearRect;
    expect(afterFirst).toBeGreaterThan(before);
    act(() => clock.onSnapshot?.(snapshot(2)));
    expect(ctxCalls.clearRect).toBeGreaterThan(afterFirst);
  });

  it("does not redraw when the snapshot has not changed", () => {
    renderLine({ isActive: true });
    act(() => clock.onSnapshot?.(snapshot(1)));
    const afterFirst = ctxCalls.clearRect;
    // Identical snapshot -> identical paint signature -> skipped.
    act(() => clock.onSnapshot?.(snapshot(1)));
    expect(ctxCalls.clearRect).toBe(afterFirst);
  });

  it("treats a fully-unsung inactive line as static across frames", () => {
    // Starts at t=10, so at t=1 and t=2 it is entirely unsung and inactive.
    renderLine({
      isActive: false,
      segment: makeSegment({ startTime: 10, endTime: 20 }),
    });
    act(() => clock.onSnapshot?.(snapshot(1)));
    const afterFirst = ctxCalls.clearRect;
    act(() => clock.onSnapshot?.(snapshot(2)));
    // Different time, but the reveal state (unsung) is unchanged -> no redraw.
    expect(ctxCalls.clearRect).toBe(afterFirst);
  });

  it("survives layoutLine returning null by rendering an estimated height", () => {
    runtime.layoutLine.mockReturnValue(null);
    const { onHeightChange } = renderLine();
    // 40px font, no ruby row -> round(40 * 1.2) = 48.
    expect(onHeightChange).toHaveBeenCalledWith(48);
    expect(screen.getByTestId("glyph-line-canvas-root").style.height).toBe(
      "48px",
    );
    expect(screen.getByTestId("glyph-line-canvas-root").style.width).toBe(
      "300px",
    );
    // It still cleared a canvas (drew empty), and never threw.
    expect(ctxCalls.clearRect).toBeGreaterThan(0);
  });

  it("picks up a layout that was not ready on mount when the runtime version bumps", () => {
    runtime.layoutLine.mockReturnValue(null);
    const { onHeightChange } = renderLine();
    expect(onHeightChange).toHaveBeenLastCalledWith(48);

    // Fonts land: layout now resolves and the runtime notifies subscribers.
    runtime.layoutLine.mockReturnValue(MOCK_LAYOUT);
    act(() => runtime.bump());
    expect(onHeightChange).toHaveBeenLastCalledWith(40);
    expect(screen.getByTestId("glyph-line-canvas-root").style.width).toBe(
      "100px",
    );
  });

  it("unsubscribes from the runtime on unmount", () => {
    const { unmount } = renderLine();
    expect(runtime.unsubscribeSpy).not.toHaveBeenCalled();
    expect(() => unmount()).not.toThrow();
    expect(runtime.unsubscribeSpy).toHaveBeenCalled();
  });
});

describe("box placement within the row", () => {
  /** The canvas box for a line of the given role alignment. */
  function rootFor(alignment: "start" | "center" | "end") {
    const { container } = renderLine({ segment: makeSegment({ alignment }) });
    return container.querySelector(
      '[data-testid="glyph-line-canvas-root"]',
    ) as HTMLElement;
  }

  // The compact painted box aligns inside the row's natural width, which may
  // be wider when the translation has more content. `text-center` on the row
  // cannot move a block box, so the root must express the alignment itself.
  it("centres the box for a centred row", () => {
    const root = rootFor("center");
    expect(root.style.marginInlineStart).toBe("auto");
    expect(root.style.marginInlineEnd).toBe("auto");
  });

  it("pushes the box to the inline end for an end-aligned row", () => {
    const root = rootFor("end");
    expect(root.style.marginInlineStart).toBe("auto");
    expect(root.style.marginInlineEnd).toBe("");
  });

  it("leaves the box at the inline start for a start-aligned row", () => {
    const root = rootFor("start");
    expect(root.style.marginInlineStart).toBe("");
    expect(root.style.marginInlineEnd).toBe("auto");
  });

  it("exposes the alignment for debugging", () => {
    expect(rootFor("center").dataset.alignment).toBe("center");
  });

  it("keeps every alignment at the occupied text width", () => {
    for (const alignment of ["start", "center", "end"] as const) {
      expect(rootFor(alignment).style.width).toBe("100px");
    }
  });
});
