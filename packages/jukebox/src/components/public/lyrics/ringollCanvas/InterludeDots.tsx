"use client";

import type { ReactElement } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@lyricova/components/utils";
import { useAppContext } from "../../AppContext";
import {
  readPlaybackSnapshot,
  useMediaClock,
} from "../../../../hooks/useMediaClock";
import type { PlaybackSnapshot } from "../../../../hooks/types";
import {
  activeInterlude,
  interludeDotsState,
  INTERLUDE_DOT_COUNT,
  INTERLUDE_DOT_DIAMETER,
  INTERLUDE_DOT_GAP_EM,
  type InterludeGap,
} from "./interlude";

/**
 * DOM view for the Ringoll Canvas interlude indicator - a breathing three-dot
 * indicator shown during long instrumental gaps (Apple Music-like Lyrics).
 *
 * All of the timing/geometry math lives in {@link ./interlude} as pure
 * functions; this component is *only* the view. It is deliberately driven
 * straight off the media clock ({@link useMediaClock}): every animated value is
 * written imperatively to the DOM via refs inside the snapshot callback, so a
 * frame never triggers a React re-render. React state changes only when the
 * *active gap* changes (rare), which mounts/unmounts the indicator as an
 * ordinary render.
 *
 * ## Units boundary
 *
 * Detection ({@link activeInterlude}) is in **seconds**; choreography
 * ({@link interludeDotsState}) is in **milliseconds**. The bridge is the `* 1000`
 * in {@link paint}.
 *
 * ## Opacity strategy
 *
 * {@link InterludeDotsState.dotOpacities} are already premultiplied by the group
 * alpha. We take the model's blessed "set a container alpha and derive relative
 * dot alphas" path: the group element carries {@link InterludeDotsState.opacity}
 * and each dot carries only its *relative* fill (`dotOpacities[k] / opacity`),
 * so the shared alpha is applied exactly once. The division is guarded against a
 * zero group alpha so it never emits `NaN`.
 */

interface CssLength {
  readonly value: number;
  readonly unit: string;
}

function cssLength({ value, unit }: CssLength): string {
  return `${value}${unit}`;
}

/** Dot indices `[0, 1, 2]`, derived from the model's dot count. */
const DOT_INDICES = Array.from(
  { length: INTERLUDE_DOT_COUNT },
  (_unused, index) => index,
);

/**
 * Per-dot diameter as a CSS `clamp(min, preferred, max)` string, assembled from
 * {@link INTERLUDE_DOT_DIAMETER} so the raw numbers live only in the model.
 * Resolves to `clamp(0.5em, 1vh, 3em)`; the `em` terms track the container's
 * font size (see the `fontSize` inline style below).
 */
const DOT_DIAMETER_CSS = `clamp(${cssLength(INTERLUDE_DOT_DIAMETER.min)}, ${cssLength(
  INTERLUDE_DOT_DIAMETER.preferred,
)}, ${cssLength(INTERLUDE_DOT_DIAMETER.max)})`;

/**
 * Structural equality for the *active* gap. A parent that recreates the `gaps`
 * array every render (new object identities but identical geometry) must not
 * force a per-frame re-render, so we compare the fields that define a gap rather
 * than object identity alone.
 */
function isSameGap(a: InterludeGap | null, b: InterludeGap | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return (
    a.anchorLineIndex === b.anchorLineIndex &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.isNextDuet === b.isNextDuet
  );
}

export interface InterludeDotsProps {
  /** Static interlude gaps from `findInterludeGaps` (seconds). */
  gaps: readonly InterludeGap[];
  /** Base font size in CSS px, for em-relative sizing and the anchor offset. */
  fontSize: number;
  className?: string;
}

export function InterludeDots({
  gaps,
  fontSize,
  className,
}: InterludeDotsProps): ReactElement | null {
  const { playerRef } = useAppContext();

  const groupRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Stable per-dot ref setters so the dots are not detached/reattached on the
  // (rare) re-renders.
  const dotRefSetters = useMemo(
    () =>
      DOT_INDICES.map((index) => (element: HTMLDivElement | null) => {
        dotRefs.current[index] = element;
      }),
    [],
  );

  // The active gap lives in React state so mounting/unmounting the indicator is
  // an ordinary render. It is seeded from the player so a gap already in
  // progress on mount (e.g. a seek into an interlude while paused) renders
  // immediately.
  const [activeGap, setActiveGap] = useState<InterludeGap | null>(() => {
    const player = playerRef.current;
    if (!player) return null;
    return activeInterlude(gaps, readPlaybackSnapshot(player).currentTime);
  });
  // Mirror of `activeGap` for the media-clock callback, which must compare
  // against the current value without a stale closure.
  const activeGapRef = useRef<InterludeGap | null>(activeGap);
  activeGapRef.current = activeGap;

  const safeFontSize = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 0;

  // Imperatively paint the current frame straight to the DOM. No React state is
  // touched, so animation never triggers a re-render.
  const paint = useCallback((snapshot: PlaybackSnapshot, gap: InterludeGap) => {
    const group = groupRef.current;
    if (!group) return;
    const elapsedMs = (snapshot.currentTime - gap.startTime) * 1000;
    const durationMs = gap.duration * 1000;
    const { scale, opacity, dotOpacities } = interludeDotsState(
      elapsedMs,
      durationMs,
    );
    group.style.transform = `scale(${scale})`;
    group.style.opacity = `${opacity}`;
    for (let index = 0; index < INTERLUDE_DOT_COUNT; index += 1) {
      const dot = dotRefs.current[index];
      if (!dot) continue;
      // dotOpacities are premultiplied by the group alpha; divide it back out
      // so the group's own opacity is not applied twice. Guarded so a zero
      // group alpha never divides to NaN.
      const relativeOpacity = opacity > 0 ? dotOpacities[index] / opacity : 0;
      dot.style.opacity = `${relativeOpacity}`;
    }
  }, []);

  // Sole timing source: media-clock snapshots. The active gap is kept in state
  // (so mount/unmount is a normal render) but only *changes* trigger setState;
  // every in-gap frame just paints imperatively.
  const onSnapshot = useCallback(
    (snapshot: PlaybackSnapshot) => {
      const gap = activeInterlude(gaps, snapshot.currentTime);
      if (!isSameGap(gap, activeGapRef.current)) {
        activeGapRef.current = gap;
        setActiveGap(gap);
      }
      if (gap) paint(snapshot, gap);
    },
    [gaps, paint],
  );
  useMediaClock(playerRef, onSnapshot);

  // Paint once whenever the active gap changes (mount included) so the freshly
  // mounted group is correct before the browser paints - and so a gap entered
  // while paused (no animation frames) still shows the right frozen frame
  // instead of an unpainted group. While paused, `useMediaClock` issues no
  // frames, so the last painted values simply persist (the indicator freezes).
  useLayoutEffect(() => {
    if (!activeGap) return;
    const player = playerRef.current;
    if (!player) return;
    paint(readPlaybackSnapshot(player), activeGap);
  }, [activeGap, paint, playerRef]);

  if (!activeGap) return null;

  return (
    <div
      data-testid="interlude-dots"
      data-next-duet={activeGap.isNextDuet ? "true" : "false"}
      className={cn(
        "pointer-events-none flex w-full",
        // Match the lyric rows' role alignment: duet/right-role -> right.
        activeGap.isNextDuet ? "justify-end" : "justify-start",
        className,
      )}
      // Vertical placement is owned by the container that anchors this overlay
      // (it centres the group in the blank-line band); AMLL's `dotMargin` is
      // deliberately not applied as a margin here, since inside a centring
      // parent it would skew the group off-centre by half its value.
      style={{ fontSize: `${safeFontSize}px` }}
    >
      <div
        ref={groupRef}
        data-testid="interlude-dots-group"
        className="flex items-center will-change-[transform,opacity]"
        style={{
          gap: `${INTERLUDE_DOT_GAP_EM}em`,
          transformOrigin: activeGap.isNextDuet
            ? "right center"
            : "left center",
        }}
      >
        {DOT_INDICES.map((index) => (
          <div
            key={index}
            data-testid="interlude-dot"
            ref={dotRefSetters[index]}
            className="bg-current"
            style={{
              width: DOT_DIAMETER_CSS,
              height: DOT_DIAMETER_CSS,
              borderRadius: "50%",
            }}
          />
        ))}
      </div>
    </div>
  );
}
