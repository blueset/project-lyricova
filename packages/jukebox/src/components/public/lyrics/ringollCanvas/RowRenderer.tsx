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
import { SUNG_ALPHA, UNSUNG_ALPHA } from "./linePainter";

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

/**
 * Scale AMLL gives a non-active line, animated to `1` as the line becomes
 * current. The row's spring drives it alongside `y`, so becoming active is a
 * single coordinated motion rather than a separate transition.
 */
const INACTIVE_LINE_SCALE = 0.97;

/**
 * Minimum height (CSS px) of a row whose line has no content.
 *
 * A blank line still carries a timestamp and stays clickable (the row owns
 * `onClick`, which seeks), but it paints nothing, so its natural box collapses
 * to the padding and leaves a target far too small to hit on a touch screen.
 * `44` is the smallest comfortable touch target in Apple's Human Interface
 * Guidelines; the row is `box-border`, so this bounds the *whole* row including
 * its `py-4`.
 */
export const EMPTY_LINE_MIN_HEIGHT = 44;

/**
 * Translation size relative to the main text of the same row, and the floor
 * below which it stops shrinking.
 *
 * The two can conflict: on a narrow viewport a *minor* line's main text is
 * already near the responsive floor, and half of it falls under the readable
 * minimum. Legibility wins - but the result is then capped at the main text
 * size, because a translation that renders *larger* than the line it translates
 * inverts the visual hierarchy. On such rows the two end up equal.
 */
const TRANSLATION_FONT_RATIO = 0.5;
const TRANSLATION_MIN_FONT_SIZE = 14;

/**
 * How much more subtle the translation is than the main text it accompanies.
 *
 * Applied to whichever main-text alpha the row actually paints, so the
 * translation always sits exactly one step behind its own line rather than at a
 * fixed opacity. Which alpha that is depends on the line's *reveal* state, not
 * on whether it is the active line: a **passed** line is fully swept, so every
 * cluster paints with the sung colour just like the active line's sung portion,
 * and only a **future** line is entirely unsung. Keying this off `isActive`
 * alone would put a passed line's translation at 30% of its own main text
 * instead of 75%.
 */
const TRANSLATION_ALPHA_RATIO = 0.75;

/**
 * White at `alpha`, rounded to three decimals. The rounding matters: the alphas
 * here are products (`0.4 * 0.75` is `0.30000000000000004` in binary floating
 * point), which would otherwise reach CSS verbatim.
 */
function whiteAlpha(alpha: number): string {
  return `rgba(255, 255, 255, ${Math.round(alpha * 1000) / 1000})`;
}

/** Translation colour beside sung main text (the active line, and passed lines). */
export const SUNG_TRANSLATION_COLOR = whiteAlpha(
  SUNG_ALPHA * TRANSLATION_ALPHA_RATIO,
);
/** Translation colour beside unsung main text (future lines). */
export const UNSUNG_TRANSLATION_COLOR = whiteAlpha(
  UNSUNG_ALPHA * TRANSLATION_ALPHA_RATIO,
);

/**
 * The translation's font size (CSS px) for a row whose main text renders at
 * `mainFontSize`. See {@link TRANSLATION_FONT_RATIO} for why the floor is
 * applied before the cap.
 */
export function translationFontSize(mainFontSize: number): number {
  const scaled = mainFontSize * TRANSLATION_FONT_RATIO;
  return Math.min(mainFontSize, Math.max(TRANSLATION_MIN_FONT_SIZE, scaled));
}

/** A line renders nothing when its content is empty or only whitespace. */
export function isEmptyLine(content: string | null | undefined): boolean {
  return !content || content.trim().length === 0;
}

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
  "data-[role='2']:text-center data-[role='2']:py-4 data-[role='2']:w-full data-[role='2']:rounded-0 data-[role='2']:left-0 data-[role='2']:right-0",

  // minor
  "data-[minor='true']:text-xl",
);

/**
 * The inner box that carries the active-line scale.
 *
 * The scale deliberately does **not** live on the row element: the virtualizer
 * measures rows with `getBoundingClientRect()`, which reports the *transformed*
 * box, while `useResizeObserver` watches `contentRect`, which is transform-blind
 * and so would never fire when the scale changed. A scaled row would therefore
 * report `0.97 x` its real height and cache it forever - and because a row
 * mounts with `scale: isActive ? 1 : 0.97`, the row that happened to be active
 * at mount would cache a *different* height from every other row, permanently
 * skewing the accumulated `top` of everything below it.
 *
 * A transform on a child does not affect its parent's layout box, so keeping the
 * scale one level in leaves the measured height exact.
 */
const rowInnerClasses = cn(
  "will-change-transform",
  // Scale about the row's own alignment anchor so growing into the active line
  // pushes outward from the text edge rather than drifting it sideways, and
  // about the top edge so the spring's `y` stays the row's true top.
  "data-[role='0']:origin-top-left",
  "data-[role='1']:origin-top-right",
  "data-[role='2']:origin-top",
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
      from: {
        y: top,
        opacity: 1,
        filter: "blur(0)",
        scale: isActive ? 1 : INACTIVE_LINE_SCALE,
      },
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
          scale: isActive ? 1 : INACTIVE_LINE_SCALE,
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
    // A blank line paints nothing, so its box would otherwise collapse to the
    // padding - too small to tap, even though clicking it still seeks.
    const empty = isEmptyLine(glyphSegment.content);

    const role = row.attachments.role % 3;
    const { scale, ...rowSprings } = springs;

    // Only a line below the anchor is still unsung; the active line and every
    // passed line paint with the sung colour (see TRANSLATION_ALPHA_RATIO).
    const unsung = absoluteIndex > 0 && !isActive;

    return (
      <animated.div
        ref={setRowRef}
        style={{
          ...rowSprings,
          // A blank row has no canvas to give it a box, so it needs both
          // dimensions stated explicitly. Keep the shared wrap width as its
          // click/tap area even though non-empty rows shrink to their content.
          ...(empty
            ? { minHeight: EMPTY_LINE_MIN_HEIGHT, width: maxWidth }
            : null),
        }}
        onClick={onClick}
        data-role={role}
        data-minor={minor}
        data-empty={empty ? "true" : "false"}
        className={rowContainerClasses}
      >
        <animated.div
          style={{ scale }}
          data-role={role}
          className={rowInnerClasses}
        >
          {/* A blank line has nothing to shape, so it gets no canvas at all -
              which is also what lets EMPTY_LINE_MIN_HEIGHT actually govern the
              row box instead of the canvas' placeholder height. */}
          {!empty && (
            <GlyphLineCanvas
              segment={glyphSegment}
              maxWidth={maxWidth}
              fontSize={glyphFontSize}
              reserveRubyRow={reserveRubyRow}
              isActive={isActive ?? false}
              onHeightChange={remeasure}
            />
          )}
          <div
            className="text-balance"
            style={{
              // Sized off the row's *own* main text (already minor-adjusted) so
              // it tracks the responsive scale instead of the DOM `em` cascade,
              // and coloured one step behind whatever that text is painting.
              fontSize: translationFontSize(glyphFontSize),
              color: unsung ? UNSUNG_TRANSLATION_COLOR : SUNG_TRANSLATION_COLOR,
              // @ts-expect-error TypeScript doesn't know about the `wordBreak` property
              wordBreak: "auto-phrase",
            }}
            lang={transLang}
          >
            {transLang ? row.attachments.translations[transLang] : undefined}
          </div>
        </animated.div>
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
