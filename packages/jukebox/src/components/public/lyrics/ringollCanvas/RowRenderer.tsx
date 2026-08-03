"use client";

import type { Ref } from "react";
import { forwardRef, memo, useCallback, useEffect, useRef } from "react";
import { useSpring, animated } from "@react-spring/web";
import type { LyricsKitLyricsLine } from "@lyricova/components/gql/schema";
import { cn } from "@lyricova/components/utils";
import type { RowRendererProps } from "../components/LyricsVirtualizer";
import type { GlyphLyricSegment } from "../glyph/lyricSegments";
import { useResizeObserver } from "../../../../hooks/useResizeObserver";
import { GlyphLineCanvas } from "./GlyphLineCanvas";

/**
 * Ringoll's row chrome, with the DOM karaoke text swapped for
 * {@link GlyphLineCanvas}.
 *
 * Everything the spring drives - the staggered enter/exit, the depth blur, the
 * passed-line dimming, the role-based alignment/padding/rounding and the minor
 * treatment - is copied verbatim from the DOM Ringoll row so the two renderers
 * feel identical while scrolling; only the line body changes from DOM spans to a
 * per-line `<canvas>`, and the translation sub-line stays DOM text exactly as
 * Ringoll renders it (it is short, reflows with `text-balance` /
 * `word-break: auto-phrase`, and never needs the glyph shaper).
 *
 * ## The async-height hazard this row exists to solve
 *
 * `../components/useRowMeasurement.tsx` reads each row's height from a
 * `getBoundingClientRect()` in the ref callback (fired once at mount) and from
 * an effect in the *virtualizer's* render cycle. A DOM line knows its height at
 * mount; a canvas line does **not** - its height only becomes real once fonts
 * load and `layoutLine` resolves, which happens after mount and outside any
 * virtualizer render. React never re-invokes a ref for a late size change, so
 * without help that new height is invisible and rows overlap.
 *
 * The fix is {@link setRowRef} + {@link remeasure}: we observe the row
 * element's own box (via {@link useResizeObserver}) and, additionally, take
 * {@link GlyphLineCanvas}'s `onHeightChange` signal, and on either one we
 * re-invoke the virtualizer's forwarded measurement ref **with the row
 * element**. That is deliberate: the virtualizer's source of truth is the row's
 * `getBoundingClientRect()` (canvas *plus* translation *plus* padding), not the
 * canvas paragraph height alone, so we re-report the box rather than forwarding
 * the canvas number.
 */
export interface RingollCanvasRowProps extends RowRendererProps<LyricsKitLyricsLine> {
  /** Normalized segment for this line, shaped by the canvas renderer. */
  glyphSegment: GlyphLyricSegment;
  /** Shared responsive base font size (CSS px) so every line agrees. */
  fontSize: number;
  /** Shared wrap width (CSS px) so every line wraps identically. */
  maxWidth: number;
  /** Document-level ruby-row reservation (any line in the doc has furigana). */
  reserveRubyRow: boolean;
}

/**
 * Minor (background) lines render smaller. The Glyph Canvas PoC scales its
 * numeric font size by this same ratio, so a minor canvas line here matches
 * that renderer rather than the DOM `text-xl`/`text-4xl` step (which still
 * drives the em-sized translation below).
 */
const MINOR_FONT_RATIO = 0.62;

const rowContainerClasses = cn(
  "absolute",
  "text-4xl", // fontSize: "2em"
  "will-change-[transform,opacity,filter]",
  "min-h-[0.5em]",
  "max-w-full",
  "hover:!blur-none hover:bg-current/20", // filter: blur(0), backgroundColor: color-mix(...)

  // role % 3 === 0
  "data-[role='0']:text-start data-[role='0']:py-4 data-[role='0']:pl-8 data-[role='0']:pr-12 data-[role='0']:left-0 data-[role='0']:rounded-tr-[0.75rem] data-[role='0']:rounded-br-[0.75rem]",
  // role % 3 === 1
  "data-[role='1']:text-end data-[role='1']:py-4 data-[role='1']:pr-8 data-[role='1']:pl-12 data-[role='1']:right-0 data-[role='1']:rounded-tl-[0.75rem] data-[role='1']:rounded-bl-[0.75rem]",
  // role % 3 === 2
  "data-[role='2']:text-center data-[role='2']:py-4 data-[role='2']:w-full data-[role='2']:rounded-[0.75rem]",

  // minor
  "data-[minor='true']:text-xl",
);

/** Assigns a value to either a callback ref or an object ref, tolerating null. */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

const InnerRowRenderer = forwardRef<HTMLDivElement, RingollCanvasRowProps>(
  (
    {
      row,
      glyphSegment,
      top,
      absoluteIndex,
      isActive,
      isActiveScroll,
      isUserScrolling,
      onClick,
      transLang,
      fontSize,
      maxWidth,
      reserveRubyRow,
    },
    ref,
  ) => {
    const [springs, api] = useSpring(() => ({
      from: { y: top, opacity: 1, filter: "blur(0)" },
      config: { mass: 0.85, friction: 15, tension: 100 },
    }));

    useEffect(() => {
      const old = api.current[0]?.get().y;
      const direction = old > top ? 1 : -1;
      const delay = isActiveScroll
        ? 0
        : Math.max(0, absoluteIndex * direction) * 30;
      api.start({
        to: {
          y: top,
          opacity: absoluteIndex <= 0 && !isActive ? 0.5 : 1,
          filter: isActiveScroll
            ? "blur(0)"
            : `blur(${Math.abs(absoluteIndex) * 0.3}px)`,
        },
        delay,
        immediate: isUserScrolling,
      });
    }, [absoluteIndex, api, isActive, isActiveScroll, isUserScrolling, top]);

    // The row's own DOM element, kept so we can re-report its box on a late
    // size change (see the module doc). The forwarded measurement ref is stored
    // in a ref updated every render because `memo` can freeze props (and thus
    // the ref) while the ResizeObserver still needs the current one.
    const rowElementRef = useRef<HTMLDivElement | null>(null);
    const measurementRef = useRef<Ref<HTMLDivElement> | undefined>(ref);
    measurementRef.current = ref;

    const { ref: sizeRef, height: measuredHeight } =
      useResizeObserver<HTMLDivElement>();

    // Re-invoke the virtualizer's measurement ref with the *row* element so it
    // re-reads `getBoundingClientRect()` - the box that includes the canvas,
    // the translation line and the padding, which is what the virtualizer
    // trusts. Forwarding only the canvas height would drop the rest.
    const remeasure = useCallback(() => {
      const node = rowElementRef.current;
      if (node) assignRef(measurementRef.current, node);
    }, []);

    // Merge three consumers of the row element into one stable callback ref: our
    // own element handle, the ResizeObserver, and the forwarded measurement ref.
    const setRowRef = useCallback(
      (node: HTMLDivElement | null) => {
        rowElementRef.current = node;
        sizeRef(node);
        assignRef(measurementRef.current, node);
      },
      [sizeRef],
    );

    // When the row's observed box changes after mount - the canvas resolved its
    // layout late, or the translation reflowed - re-report it. No-op in the
    // initial `0` state and idempotent once the height settles.
    useEffect(() => {
      remeasure();
    }, [measuredHeight, remeasure]);

    const minor = row.attachments.minor;
    const glyphFontSize = minor ? fontSize * MINOR_FONT_RATIO : fontSize;

    return (
      <animated.div
        ref={setRowRef}
        style={{ ...springs }}
        onClick={onClick}
        data-role={row.attachments.role % 3}
        data-minor={minor}
        className={rowContainerClasses}
      >
        <GlyphLineCanvas
          segment={glyphSegment}
          maxWidth={maxWidth}
          fontSize={glyphFontSize}
          reserveRubyRow={reserveRubyRow}
          isActive={isActive ?? false}
          onHeightChange={remeasure}
        />
        <div
          className={cn(
            "text-[0.625em] text-balance", // fontSize, textWrap
            absoluteIndex > 0 && !isActive && "opacity-40", // dim opacity
          )}
          // @ts-expect-error TypeScript doesn't know about the `wordBreak` property
          style={{ wordBreak: "auto-phrase" }} // wordBreak
          lang={transLang}
        >
          {transLang ? row.attachments.translations[transLang] : undefined}
        </div>
      </animated.div>
    );
  },
);

InnerRowRenderer.displayName = "InnerRowRenderer";

export const RowRenderer = memo(
  InnerRowRenderer,
  (prev, next) =>
    prev.top === next.top &&
    prev.transLang === next.transLang &&
    prev.isActive === next.isActive &&
    prev.absoluteIndex === next.absoluteIndex &&
    prev.isActiveScroll === next.isActiveScroll &&
    prev.isUserScrolling === next.isUserScrolling &&
    // Canvas-specific inputs: a resize changes the shared font size / wrap
    // width, and a new document swaps the segment identity - all of which must
    // re-lay the line, unlike the DOM row which only depended on scroll state.
    prev.fontSize === next.fontSize &&
    prev.maxWidth === next.maxWidth &&
    prev.reserveRubyRow === next.reserveRubyRow &&
    prev.glyphSegment === next.glyphSegment,
);
