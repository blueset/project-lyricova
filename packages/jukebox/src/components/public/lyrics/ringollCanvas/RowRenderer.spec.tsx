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
    to: { y: number; opacity: number; filter: string; scale: number };
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

import {
  SUNG_TRANSLATION_COLOR,
  UNSUNG_TRANSLATION_COLOR,
  RowRenderer,
  isEmptyLine,
  translationFontSize,
  type RingollCanvasRowProps,
} from "./RowRenderer";

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

    // The translation is coloured relative to whatever its own line shows, so
    // it is keyed off `isActive` alone - not off the row's scroll distance as
    // the earlier `opacity-40` rule was. A *passed* line is inactive too, and
    // now dims with the rest of them.
    function renderTranslation(overrides: Partial<RingollCanvasRowProps>) {
      const row = makeRow({
        attachments: makeAttachments({ translations: { en: "Hello" } }),
      });
      const { container } = render(
        <RowRenderer {...makeProps({ row, transLang: "en", ...overrides })} />,
      );
      return container.querySelector('[lang="en"]') as HTMLElement;
    }

    it("keeps the active line's translation just behind its sung text", () => {
      const node = renderTranslation({ absoluteIndex: 0, isActive: true });
      expect(node.style.color).toBe(SUNG_TRANSLATION_COLOR);
    });

    it("dims the translation of a future line to match its unsung text", () => {
      const node = renderTranslation({ absoluteIndex: 3, isActive: false });
      expect(node.style.color).toBe(UNSUNG_TRANSLATION_COLOR);
    });

    it("keeps a passed line's translation beside its sung text, not its unsung", () => {
      // A passed line is fully swept, so its main text paints with the *sung*
      // colour exactly like the active line's sung portion. Keying the
      // translation off `isActive` would drop it to 0.3 next to 1.0 main text -
      // 30% of its own line instead of the intended 75%.
      const node = renderTranslation({ absoluteIndex: -3, isActive: false });
      expect(node.style.color).toBe(SUNG_TRANSLATION_COLOR);
    });

    it("holds the same 0.75 ratio to its own main text in every line state", () => {
      const alphaOf = (color: string) =>
        Number(/rgba\([^)]*,\s*([\d.]+)\)/.exec(color)?.[1]);
      // Main text alpha the canvas actually paints in each state.
      expect(alphaOf(SUNG_TRANSLATION_COLOR) / 1).toBeCloseTo(0.75, 6);
      expect(alphaOf(UNSUNG_TRANSLATION_COLOR) / 0.4).toBeCloseTo(0.75, 6);
    });

    it("sizes the translation from the row's own main text, not the em cascade", () => {
      const major = renderTranslation({ fontSize: 56 });
      expect(major.style.fontSize).toBe(`${translationFontSize(56)}px`);

      // A minor row's main text is already reduced, so its translation follows
      // that reduced size rather than the document font size.
      const row = makeRow({
        attachments: makeAttachments({
          translations: { en: "Hello" },
          minor: true,
        }),
      });
      const { container } = render(
        <RowRenderer {...makeProps({ row, transLang: "en", fontSize: 56 })} />,
      );
      const minorSize = (container.querySelector('[lang="en"]') as HTMLElement)
        .style.fontSize;
      expect(minorSize).toBe(`${translationFontSize(56 * 0.62)}px`);
      expect(parseFloat(minorSize)).toBeLessThan(
        parseFloat(major.style.fontSize),
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

describe("translationFontSize", () => {
  it("is always smaller than the main text once above the floor", () => {
    for (const main of [22, 30, 40, 56]) {
      expect(translationFontSize(main)).toBeLessThan(main);
    }
  });

  it("stops shrinking at the readable floor", () => {
    // 0.5 x 22 = 11, below the floor, so the floor wins.
    expect(translationFontSize(22)).toBe(14);
  });

  it("never renders larger than the text it translates", () => {
    // A minor line on a narrow viewport: the floor would exceed the main text,
    // so the cap pulls it back down to parity rather than inverting the
    // hierarchy.
    expect(translationFontSize(10)).toBe(10);
  });

  it("scales with the responsive size in between", () => {
    expect(translationFontSize(56)).toBe(28);
    expect(translationFontSize(40)).toBe(20);
  });
});

describe("isEmptyLine", () => {
  it("treats missing, empty and whitespace-only content as empty", () => {
    expect(isEmptyLine(undefined)).toBe(true);
    expect(isEmptyLine(null)).toBe(true);
    expect(isEmptyLine("")).toBe(true);
    expect(isEmptyLine("   \n\t ")).toBe(true);
  });

  it("treats any real text as non-empty", () => {
    expect(isEmptyLine("a")).toBe(false);
    expect(isEmptyLine("hello")).toBe(false);
  });
});

describe("empty lines stay tappable", () => {
  it("gives a contentless line a touch-sized minimum height", () => {
    const { container } = render(
      <RowRenderer
        {...makeProps({
          row: makeRow({ content: "" }),
          glyphSegment: makeGlyphSegment({ content: "" }),
        })}
      />,
    );
    const row = rowOf(container);
    expect(row.dataset.empty).toBe("true");
    expect(row.style.minHeight).toBe("44px");
  });

  it("gives a blank line the full shared-width hit area", () => {
    // Content rows shrink to their laid-out text. A blank row has no canvas, so
    // without an explicit width it would shrink to nothing and become hard to
    // tap.
    const { container } = render(
      <RowRenderer
        {...makeProps({
          maxWidth: 640,
          row: makeRow({ content: "" }),
          glyphSegment: makeGlyphSegment({ content: "" }),
        })}
      />,
    );
    expect(rowOf(container).style.width).toBe("640px");
  });

  it("leaves a line with content to size itself from its canvas", () => {
    const { container } = render(
      <RowRenderer {...makeProps({ maxWidth: 640 })} />,
    );
    expect(rowOf(container).style.width).toBe("");
  });

  it("renders no canvas for a blank line, so the minimum actually governs", () => {
    // Without this the minimum is inert: GlyphLineCanvas falls back to
    // `estimateHeight` (>= 16px) even with nothing to lay out, which plus the
    // row's 32px of padding already exceeds 44px. The blank row was only
    // tappable by accident, and paid for a canvas plus a media-clock
    // subscription to paint nothing.
    render(
      <RowRenderer
        {...makeProps({
          row: makeRow({ content: "   " }),
          glyphSegment: makeGlyphSegment({ content: "   " }),
        })}
      />,
    );
    expect(screen.queryByTestId("glyph-line-canvas")).toBeNull();
  });

  it("still renders a canvas for a line with content", () => {
    render(<RowRenderer {...makeProps()} />);
    expect(screen.queryByTestId("glyph-line-canvas")).not.toBeNull();
  });

  it("leaves a line with content to its natural height", () => {
    const { container } = render(<RowRenderer {...makeProps()} />);
    const row = rowOf(container);
    expect(row.dataset.empty).toBe("false");
    expect(row.style.minHeight).toBe("");
  });
});

describe("active line scale", () => {
  it("starts a non-active row slightly shrunk and animates it to full size", () => {
    const { rerender } = render(
      <RowRenderer {...makeProps({ isActive: false })} />,
    );
    expect(spring.startCalls.at(-1)?.to.scale).toBe(0.97);

    rerender(<RowRenderer {...makeProps({ isActive: true })} />);
    expect(spring.startCalls.at(-1)?.to.scale).toBe(1);
  });

  it("scales about the row's own alignment anchor", () => {
    for (const [role, origin] of [
      [0, "origin-top-left"],
      [1, "origin-top-right"],
      [2, "origin-top"],
    ] as const) {
      const { container } = render(
        <RowRenderer
          {...makeProps({
            row: makeRow({ attachments: makeAttachments({ role }) }),
          })}
        />,
      );
      // Scaling about the aligned edge keeps the text anchor put instead of
      // drifting the line sideways as it grows.
      const inner = rowOf(container).firstElementChild as HTMLElement;
      expect(inner.className).toContain(origin);
    }
  });

  it("keeps the scale off the element the virtualizer measures", () => {
    // The virtualizer sizes rows with `getBoundingClientRect()`, which reports
    // the *transformed* box, while the ResizeObserver behind `remeasure`
    // watches `contentRect`, which is transform-blind and so never fires on a
    // scale change. A scale on the row itself would therefore report ~0.97x its
    // real height and cache it forever - and since a row mounts at
    // `scale: isActive ? 1 : 0.97`, whichever row was active at mount would
    // cache a different height from all the others, skewing every `top` below
    // it. A transform on a child does not affect the parent's layout box.
    const { container } = render(
      <RowRenderer {...makeProps({ isActive: false })} />,
    );
    const row = rowOf(container);
    expect(row.style.transform).toBe("");
    expect(row.style.scale).toBe("");

    const inner = row.firstElementChild as HTMLElement;
    expect(inner.style.scale).toBe("0.97");
  });
});
