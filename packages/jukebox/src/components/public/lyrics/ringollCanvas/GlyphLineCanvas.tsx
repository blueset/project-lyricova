"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@lyricova/components/utils";
import { useAppContext } from "@/components/public/AppContext";
import type { PlaybackSnapshot } from "../../../../hooks/types";
import {
  readPlaybackSnapshot,
  useMediaClock,
} from "../../../../hooks/useMediaClock";
import type { GlyphCanvasContext } from "../glyph/canvasGlyphRenderer";
import {
  GLYPH_VARIATIONS,
  canvasPixelRatio,
  useGlyphRuntime,
  useGlyphRuntimeVersion,
} from "../glyph/glyphRuntime";
import type { GlyphLyricSegment } from "../glyph/lyricSegments";
import type { RubyLayoutResult } from "../glyph/types";
import {
  INACTIVE_LINE_ALPHA,
  SUNG_COLOR,
  UNSUNG_COLOR,
  lineRevealedOffset,
  paintLine,
} from "./linePainter";
import { buildWords } from "./wordModel";

/**
 * A single lyric line rendered to its own `<canvas>` with the Apple Music-like
 * Lyrics (AMLL) karaoke feel: a soft gradient sweep, per-character emphasis
 * with glow on long syllables, and a gentle per-word float.
 *
 * ## One canvas per line
 *
 * Unlike the proof-of-concept {@link ../glyph/glyphCanvas.tsx} (one
 * full-viewport canvas that stacks every active segment), this component owns
 * exactly one line so a virtualizer can mount/scroll many of them. The shared,
 * expensive machinery - the WASM shaper, the coverage-aware font manager and
 * the glyph-outline cache - lives in the {@link useGlyphRuntime} runtime and is
 * consumed read-only here; this component adds only its own `<canvas>`, the
 * paint transform, and the media-clock redraw loop.
 *
 * ## Keeping per-frame work off React
 *
 * Painting is driven **exclusively** by {@link useMediaClock}: every snapshot
 * imperatively redraws the canvas. There is no `requestAnimationFrame` of our
 * own, no `Date.now()`, and crucially no `setState` per frame - React state
 * holds only the reported height, which changes at most when the layout
 * resolves or a sizing prop changes. Each draw also computes a cheap paint
 * *signature* and returns early when it is unchanged, so the 15-25 lines that
 * are fully sung/unsung and inactive at any moment cost one map lookup per
 * frame instead of a repaint.
 */
export interface GlyphLineCanvasProps {
  segment: GlyphLyricSegment;
  /** Available width in CSS px; the layout wraps to this. */
  maxWidth: number;
  fontSize: number;
  /** Whether any line in the document has ruby (document-level row reservation). */
  reserveRubyRow: boolean;
  isActive: boolean;
  className?: string;
  /** Called when the painted height changes, so the virtualizer can re-measure. */
  onHeightChange?: (height: number) => void;
}

/**
 * Canvas padding around the text box, in em, so the emphasis glow (blur up to
 * `~0.3 em`, which bleeds roughly twice its radius) and the emphasis lift/scale
 * are not clipped. The backing store and the CSS box are grown by this on every
 * side and the paint origin is offset by it; the *reported* height stays the
 * bare text box so the virtualizer measures the layout, not the bleed.
 */
const CANVAS_PADDING_EM = 0.75;

/** Reveal-front epsilon: below it a line is "unsung", within it of the end "sung". */
const REVEAL_EPSILON = 1e-3;

/**
 * A sane height (CSS px) to render at before {@link useGlyphRuntime.layoutLine}
 * resolves (fonts still loading) or for an empty line: one text line, plus a
 * reserved ruby row when the document uses ruby.
 */
function estimateHeight(fontSize: number, reserveRubyRow: boolean): number {
  return Math.round(fontSize * (reserveRubyRow ? 1.95 : 1.2));
}

export function GlyphLineCanvas({
  segment,
  maxWidth,
  fontSize,
  reserveRubyRow,
  isActive,
  className,
  onHeightChange,
}: GlyphLineCanvasProps) {
  const { playerRef } = useAppContext();
  const runtime = useGlyphRuntime();
  const runtimeVersion = useGlyphRuntimeVersion(runtime);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<PlaybackSnapshot | null>(null);
  /** Last painted signature; a matching one means the frame is a no-op. */
  const lastPaintRef = useRef<string | null>(null);
  /** Last *reported* height, so `onHeightChange` fires only on real changes. */
  const heightRef = useRef<number>(-1);

  const [height, setHeight] = useState<number>(() =>
    estimateHeight(fontSize, reserveRubyRow),
  );

  const words = useMemo(
    () => buildWords(segment.timeTags, segment.content.length, segment.endTime),
    [segment.timeTags, segment.content, segment.endTime],
  );

  const draw = useCallback(
    (snapshot: PlaybackSnapshot | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cache = runtime.pathCache;

      const content = segment.content;
      const hasContent = content.trim().length > 0;
      // The runtime memoizes layout per (text, size, width, ruby) and returns
      // `null` while this line's fonts load; a `null` layout paints an empty
      // canvas at the estimated height rather than throwing or blanking.
      const layout: RubyLayoutResult | null =
        hasContent && cache
          ? runtime.layoutLine({
              lineIndex: segment.lineIndex,
              text: content,
              furigana: segment.furigana,
              fontSize,
              maxWidth,
              reserveRubyRow,
            })
          : null;

      const paragraphHeight =
        layout?.height ?? estimateHeight(fontSize, reserveRubyRow);

      // Report height changes (never per-frame: `paragraphHeight` only moves
      // when the layout resolves or a sizing prop changes).
      if (heightRef.current !== paragraphHeight) {
        heightRef.current = paragraphHeight;
        setHeight(paragraphHeight);
        onHeightChange?.(paragraphHeight);
      }

      const time = snapshot?.currentTime ?? 0;
      const contentLength = content.length;
      const revealed = layout
        ? lineRevealedOffset({
            words,
            time,
            contentLength,
            startTime: segment.startTime,
            endTime: segment.endTime,
          })
        : 0;
      const fullyUnsung = revealed <= REVEAL_EPSILON;
      const fullySung =
        contentLength > 0 && revealed >= contentLength - REVEAL_EPSILON;
      // Static once fully swept (or not started) and not the active line; while
      // active, the emphasis/float animate so every frame differs.
      const animating = isActive || (!fullyUnsung && !fullySung);
      const timeKey = animating
        ? Math.round(time * 1000)
        : fullySung
          ? "sung"
          : "unsung";
      const signature = [
        runtimeVersion,
        Math.round(fontSize),
        Math.round(maxWidth),
        reserveRubyRow ? 1 : 0,
        isActive ? 1 : 0,
        segment.minor ? 1 : 0,
        layout ? 1 : 0,
        Math.round(paragraphHeight),
        timeKey,
      ].join("|");
      if (signature === lastPaintRef.current) return;
      lastPaintRef.current = signature;

      const margin = Math.ceil(fontSize * CANVAS_PADDING_EM);
      const dpr = canvasPixelRatio();
      const cssWidth = maxWidth + margin * 2;
      const cssHeight = paragraphHeight + margin * 2;
      const backingWidth = Math.max(1, Math.round(cssWidth * dpr));
      const backingHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      // CSS box is the padded bleed area, offset up/left by the margin so the
      // text box itself stays put; the container clips nothing (overflow
      // visible) and reports the bare text-box height.
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.left = `${-margin}px`;
      canvas.style.top = `${-margin}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!layout || !cache) return;

      // Origin at the text box's top-left (inside the margin), device-scaled.
      ctx.setTransform(dpr, 0, 0, dpr, margin * dpr, margin * dpr);
      paintLine(
        ctx as unknown as GlyphCanvasContext,
        {
          layout,
          content,
          words,
          time,
          startTime: segment.startTime,
          endTime: segment.endTime,
          fontSize,
          minor: segment.minor,
          lineAlpha: isActive ? 1 : INACTIVE_LINE_ALPHA,
          activeColor: SUNG_COLOR,
          inactiveColor: UNSUNG_COLOR,
          alignment: segment.alignment,
          contentWidth: maxWidth,
          variations: GLYPH_VARIATIONS,
        },
        cache,
      );
    },
    [
      runtime,
      runtimeVersion,
      segment,
      maxWidth,
      fontSize,
      reserveRubyRow,
      isActive,
      words,
      onHeightChange,
    ],
  );

  // Prop/runtime changes rebuild `draw`; repaint the current snapshot so a
  // resize, activation toggle, or (via `runtimeVersion`) a late font load lands
  // immediately instead of waiting for the next media-clock tick.
  useEffect(() => {
    draw(snapshotRef.current);
  }, [draw]);

  // Late readiness while paused: seed a snapshot from the player and paint once
  // the runtime reports ready, so a paused line still shows its state.
  useEffect(() => {
    if (runtime.status !== "ready") return;
    const player = playerRef.current;
    if (player && !snapshotRef.current) {
      snapshotRef.current = readPlaybackSnapshot(player);
    }
    draw(snapshotRef.current);
  }, [runtime.status, draw, playerRef]);

  // Sole timing source: media-clock snapshots. No independent RAF, no per-frame
  // React state - just an imperative redraw of the current snapshot.
  useMediaClock(
    playerRef,
    useCallback(
      (snapshot: PlaybackSnapshot) => {
        snapshotRef.current = snapshot;
        draw(snapshot);
      },
      [draw],
    ),
  );

  return (
    <div
      className={cn(className)}
      data-testid="glyph-line-canvas-root"
      data-active={isActive ? "true" : "false"}
      style={{
        position: "relative",
        width: maxWidth,
        height,
        overflow: "visible",
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="glyph-line-canvas"
        style={{ position: "absolute" }}
      />
    </div>
  );
}
