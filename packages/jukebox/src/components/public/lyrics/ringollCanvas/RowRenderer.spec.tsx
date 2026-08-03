import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LyricsKitLyricsLine,
  LyricsKitAttachment,
} from "@lyricova/components/gql/schema";
import type { LyricsSegment } from "../../../../hooks/useActiveLyricsRanges";
import type { GlyphLyricSegment } from "../glyph/lyricSegments";

// --- GlyphLineCanvas mock --------------------------------------------------
// The row is chrome only; the canvas shaping/painting has its own 8 specs. We
// swap it for a stub that (a) records the props it receives, (b) counts its
// renders so the `memo` boundary is observable, and (c) exposes a button that
// fires `onHeightChange`, standing in for the real "fonts loaded, layout
// resolved, height grew after mount" event that jsdom's no-op ResizeObserver
// can never produce.
const glyphCanvas = vi.hoisted(() => ({
  renderCount: 0,
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock("./GlyphLineCanvas", async () => {
  const React = await import("react");
  return {
    GlyphLineCanvas: (props: Record<string, unknown>) => {
      glyphCanvas.renderCount += 1;
      glyphCanvas.lastProps = props;
      return React.createElement(
        "div",
        {
          "data-testid": "glyph-line-canvas",
          "data-active": String(props.isActive),
        },
        React.createElement("button", {
          type: "button",
          "data-testid": "simulate-height-change",
          onClick: () =>
            (props.onHeightChange as ((height: number) => void) | undefined)?.(
              123,
            ),
        }),
      );
    },
  };
});

// --- react-spring mock -----------------------------------------------------
// Capture every `api.start(...)` so the staggered delay / immediate / opacity /
// blur that the row hands the spring can be asserted directly, and let a test
// pin the spring's "current y" (the value the enter/exit direction is derived
// from). `animated.<tag>` is a stable forwardRef host element so the row does
// not remount its box on re-render.
const spring = vi.hoisted(() => ({
  startCalls: [] as Array<{
    to: { y: number; opacity: number; filter: string };
    delay: number;
    immediate: boolean;
  }>,
  currentY: 0,
}));

vi.mock("@react-spring/web", async () => {
  const React = await import("react");
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  return {
    useSpring: (factory: () => { from: Record<string, unknown> }) => {
      const initial = typeof factory === "function" ? factory() : factory;
      const api = {
        start: (args: (typeof spring.startCalls)[number]) => {
          spring.startCalls.push(args);
        },
        current: [{ get: () => ({ y: spring.currentY }) }],
      };
      return [initial?.from ?? {}, api];
    },
    animated: new Proxy(
      {},
      {
        get: (_target, tag: string) => {
          if (!cache.has(tag)) {
            const Comp = React.forwardRef<unknown, Record<string, unknown>>(
              (props, ref) => React.createElement(tag, { ...props, ref }),
            );
            Comp.displayName = `animated.${tag}`;
            cache.set(
              tag,
              Comp as React.ComponentType<Record<string, unknown>>,
            );
          }
          return cache.get(tag);
        },
      },
    ),
  };
});

import { RowRenderer, type RingollCanvasRowProps } from "./RowRenderer";

// --- Fixtures --------------------------------------------------------------

function makeAttachments(
  overrides: Partial<LyricsKitAttachment> = {},
): LyricsKitAttachment {
  return {
    translation: null,
    translations: {},
    timeTag: null,
    furigana: [],
    role: 0,
    minor: false,
    ...overrides,
  } as unknown as LyricsKitAttachment;
}

function makeRow(
  overrides: Partial<LyricsKitLyricsLine> = {},
): LyricsKitLyricsLine {
  return {
    content: "hello world",
    position: 0,
    attachments: makeAttachments(),
    ...overrides,
  } as unknown as LyricsKitLyricsLine;
}

function makeGlyphSegment(
  overrides: Partial<GlyphLyricSegment> = {},
): GlyphLyricSegment {
  return {
    lineIndex: 0,
    content: "hello world",
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

function makeProps(
  overrides: Partial<RingollCanvasRowProps> = {},
): RingollCanvasRowProps {
  return {
    row: makeRow(),
    segment: { start: 0, end: 5 } as unknown as LyricsSegment,
    top: 0,
    absoluteIndex: 0,
    isActive: false,
    isActiveScroll: false,
    isUserScrolling: false,
    transLang: undefined,
    onClick: vi.fn(),
    glyphSegment: makeGlyphSegment(),
    fontSize: 40,
    maxWidth: 300,
    reserveRubyRow: false,
    ...overrides,
  };
}

/** Parses `blur(<n>px)` back to its numeric radius. */
function parseBlur(filter: string): number {
  const match = /blur\(([-\d.]+)px\)/.exec(filter);
  return match ? Number(match[1]) : NaN;
}

/** The row element is the single root the renderer mounts. */
function rowOf(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

function lastStart() {
  return spring.startCalls.at(-1)!;
}

beforeEach(() => {
  glyphCanvas.renderCount = 0;
  glyphCanvas.lastProps = null;
  spring.startCalls.length = 0;
  spring.currentY = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

// --- Tests -----------------------------------------------------------------

describe("RingollCanvas RowRenderer", () => {
  describe("role and minor chrome", () => {
    it.each([
      [0, "0"],
      [1, "1"],
      [2, "2"],
      [3, "0"],
    ])("maps role %i to data-role='%s' (alignment)", (role, expected) => {
      const row = makeRow({ attachments: makeAttachments({ role }) });
      const { container } = render(<RowRenderer {...makeProps({ row })} />);
      expect(rowOf(container).getAttribute("data-role")).toBe(expected);
    });

    it("sets data-minor='true' for a minor line and 'false' otherwise", () => {
      const minorRow = makeRow({
        attachments: makeAttachments({ minor: true }),
      });
      const { container: minorContainer } = render(
        <RowRenderer {...makeProps({ row: minorRow })} />,
      );
      expect(rowOf(minorContainer).getAttribute("data-minor")).toBe("true");

      const { container: majorContainer } = render(
        <RowRenderer {...makeProps()} />,
      );
      expect(rowOf(majorContainer).getAttribute("data-minor")).toBe("false");
    });

    it("scales the canvas font size down for a minor line", () => {
      const minorRow = makeRow({
        attachments: makeAttachments({ minor: true }),
      });
      render(<RowRenderer {...makeProps({ row: minorRow, fontSize: 50 })} />);
      expect(glyphCanvas.lastProps?.fontSize).toBeCloseTo(50 * 0.62);
    });

    it("passes the shared font size straight through for a major line", () => {
      render(<RowRenderer {...makeProps({ fontSize: 50 })} />);
      expect(glyphCanvas.lastProps?.fontSize).toBe(50);
    });

    it("forwards isActive, maxWidth and reserveRubyRow to the canvas", () => {
      render(
        <RowRenderer
          {...makeProps({
            isActive: true,
            maxWidth: 280,
            reserveRubyRow: true,
          })}
        />,
      );
      expect(glyphCanvas.lastProps?.isActive).toBe(true);
      expect(glyphCanvas.lastProps?.maxWidth).toBe(280);
      expect(glyphCanvas.lastProps?.reserveRubyRow).toBe(true);
    });
  });

  describe("spring choreography", () => {
    it("applies the staggered delay for a non-active-scroll row", () => {
      // old y (1000) is below the new top (0) -> entering upward -> direction 1.
      spring.currentY = 1000;
      render(
        <RowRenderer
          {...makeProps({
            top: 0,
            absoluteIndex: 4,
            isActiveScroll: false,
            isUserScrolling: false,
          })}
        />,
      );
      const call = lastStart();
      expect(call.delay).toBe(4 * 30);
      expect(call.immediate).toBe(false);
      expect(call.to.y).toBe(0);
    });

    it("uses no delay and no blur for the active-scroll row", () => {
      render(
        <RowRenderer
          {...makeProps({ isActiveScroll: true, absoluteIndex: 4 })}
        />,
      );
      const call = lastStart();
      expect(call.delay).toBe(0);
      expect(call.to.filter).toBe("blur(0)");
    });

    it("passes immediate to the spring while the user is scrolling", () => {
      render(<RowRenderer {...makeProps({ isUserScrolling: true })} />);
      expect(lastStart().immediate).toBe(true);
    });

    it("dims a passed line (absoluteIndex <= 0, inactive) to opacity 0.5", () => {
      render(
        <RowRenderer {...makeProps({ absoluteIndex: -3, isActive: false })} />,
      );
      expect(lastStart().to.opacity).toBe(0.5);
    });

    it("keeps a passed line at full opacity while it is active", () => {
      render(
        <RowRenderer {...makeProps({ absoluteIndex: -3, isActive: true })} />,
      );
      expect(lastStart().to.opacity).toBe(1);
    });

    it("scales the depth blur with |absoluteIndex|", () => {
      render(<RowRenderer {...makeProps({ absoluteIndex: -2 })} />);
      const near = parseBlur(lastStart().to.filter);
      spring.startCalls.length = 0;
      render(<RowRenderer {...makeProps({ absoluteIndex: -6 })} />);
      const far = parseBlur(lastStart().to.filter);
      expect(near).toBeCloseTo(2 * 0.3);
      expect(far).toBeCloseTo(6 * 0.3);
      expect(far).toBeGreaterThan(near);
    });
  });

  describe("translation sub-line", () => {
    it("renders the translation for the selected language", () => {
      const row = makeRow({
        attachments: makeAttachments({ translations: { en: "Hello" } }),
      });
      const { container } = render(
        <RowRenderer {...makeProps({ row, transLang: "en" })} />,
      );
      const translation = container.querySelector('[lang="en"]');
      expect(translation?.textContent).toBe("Hello");
    });

    it("renders no translation text when no language is selected", () => {
      const row = makeRow({
        attachments: makeAttachments({ translations: { en: "Hello" } }),
      });
      const { container } = render(<RowRenderer {...makeProps({ row })} />);
      expect(container.textContent).not.toContain("Hello");
    });

    it("dims the translation for an inactive line below the anchor (absoluteIndex > 0)", () => {
      const row = makeRow({
        attachments: makeAttachments({ translations: { en: "Hello" } }),
      });
      const { container } = render(
        <RowRenderer
          {...makeProps({
            row,
            transLang: "en",
            absoluteIndex: 3,
            isActive: false,
          })}
        />,
      );
      expect(container.querySelector('[lang="en"]')?.className).toContain(
        "opacity-40",
      );
    });

    it("does not dim the translation for a passed or active line", () => {
      const row = makeRow({
        attachments: makeAttachments({ translations: { en: "Hello" } }),
      });
      const { container } = render(
        <RowRenderer
          {...makeProps({
            row,
            transLang: "en",
            absoluteIndex: -3,
            isActive: false,
          })}
        />,
      );
      expect(container.querySelector('[lang="en"]')?.className).not.toContain(
        "opacity-40",
      );
    });
  });

  describe("interaction", () => {
    it("invokes onClick when the row is clicked", () => {
      const onClick = vi.fn();
      const { container } = render(<RowRenderer {...makeProps({ onClick })} />);
      fireEvent.click(rowOf(container));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("async height re-measurement", () => {
    it("re-invokes the measurement ref when the canvas height changes after mount", () => {
      const measurementRef = vi.fn();
      const { container } = render(
        <RowRenderer ref={measurementRef} {...makeProps()} />,
      );
      const rowEl = rowOf(container);

      // Mount already reported the box at least once, with the row element.
      expect(measurementRef).toHaveBeenCalled();
      expect(measurementRef.mock.calls.every(([node]) => node === rowEl)).toBe(
        true,
      );

      measurementRef.mockClear();
      // The canvas resolves its layout late and grows -> onHeightChange fires.
      fireEvent.click(screen.getByTestId("simulate-height-change"));

      // The row must re-report *its own box* (not the canvas number) so the
      // virtualizer re-reads getBoundingClientRect and re-lays the scroll.
      expect(measurementRef).toHaveBeenCalledWith(rowEl);
    });

    it("re-reports through an object measurement ref too", () => {
      const measurementRef = { current: null as HTMLDivElement | null };
      const { container } = render(
        <RowRenderer ref={measurementRef} {...makeProps()} />,
      );
      expect(measurementRef.current).toBe(rowOf(container));
    });
  });

  describe("memoization", () => {
    it("does not re-render when only an unrelated prop changes", () => {
      const props = makeProps();
      const { rerender } = render(<RowRenderer {...props} />);
      const before = glyphCanvas.renderCount;

      // onClick is not part of the comparator -> no re-render.
      rerender(<RowRenderer {...props} onClick={vi.fn()} />);
      expect(glyphCanvas.renderCount).toBe(before);
    });

    it("re-renders when a compared prop (top) changes", () => {
      const props = makeProps();
      const { rerender } = render(<RowRenderer {...props} />);
      const before = glyphCanvas.renderCount;

      rerender(<RowRenderer {...props} top={999} />);
      expect(glyphCanvas.renderCount).toBeGreaterThan(before);
    });

    it("re-renders when the shared font size changes (a resize)", () => {
      const props = makeProps();
      const { rerender } = render(<RowRenderer {...props} />);
      const before = glyphCanvas.renderCount;

      rerender(<RowRenderer {...props} fontSize={props.fontSize + 4} />);
      expect(glyphCanvas.renderCount).toBeGreaterThan(before);
    });
  });
});
