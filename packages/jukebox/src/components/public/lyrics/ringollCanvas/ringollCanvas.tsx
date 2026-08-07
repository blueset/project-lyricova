"use client";

import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/components/gql/schema";
import type { ComponentProps, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { cn } from "@lyricova/components/utils";
import { LyricsVirtualizer } from "../components/LyricsVirtualizer";
import { useResizeObserver } from "../../../../hooks/useResizeObserver";
import {
  GlyphRuntimeProvider,
  responsiveFontSize,
  useGlyphRuntime,
} from "../glyph/glyphRuntime";
import {
  buildLyricSegments,
  type GlyphLyricSegment,
} from "../glyph/lyricSegments";
import { EMPTY_LINE_MIN_HEIGHT, RowRenderer } from "./RowRenderer";
import { InterludeDots } from "./InterludeDots";
import { findInterludeGaps } from "./interlude";
import { buildPresentationSegments } from "./presentationTiming";

/**
 * "Ringoll Canvas" - the DOM Ringoll renderer's scrolling architecture and row
 * chrome (`../ringoll/`) with its per-span DOM karaoke text replaced by the
 * canvas glyph renderer, plus the AMLL-style interlude dots. The masked
 * container, virtualizer configuration and mask transitions are copied from
 * {@link ../ringoll/ringoll.tsx} verbatim; the new pieces are the shared glyph
 * runtime, one agreed font size / wrap width for every row, and the interlude
 * overlay.
 */
const RingollContainerDiv = (props: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      "relative size-full overflow-clip transition-[mask-image,var(--tw-mask-bottom-from-position)] duration-0",
      "mask-t-from-[calc(100%_-_5em)] mask-t-to-100% mask-b-from-70% mask-b-to-100%",
      "hover:mask-b-from-100%",
    )}
  />
);

interface Props {
  lyrics: LyricsKitLyrics;
  transLangIdx: number;
}

/**
 * Horizontal inset removed from the measured container width to get the shared
 * wrap width. It mirrors the widest role inset on a row (`pl-8` + `pr-12` =
 * `2rem + 3rem`). The sticky viewport's `px-8` does not reduce the containing
 * block of its absolutely positioned rows, so it must not be deducted here. A
 * single value is used for every role so all lines wrap identically.
 */
const ROW_PADDING_X = 80;

/**
 * Debounce window for the size the rows actually consume. A resize re-lays out
 * every line at the new width, so a drag-resize would otherwise thrash the
 * shaper; `leading` keeps the first real measurement immediate and `maxWait`
 * still lets a long drag update periodically.
 */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Fraction of the lyric area the active line is anchored at (see `alignAnchor`).
 * 4 Tailwind units to compensate for the lyrics line padding.
 */
const ANCHOR_FRACTION = "calc(10% + var(--spacing) * 4)";

export function RingollCanvasLyrics({
  lyrics,
  transLangIdx,
}: Props): ReactElement {
  // Mirrors the Glyph Canvas PoC: one runtime provider hosts the shared WASM
  // shaper / font manager / layout cache around the inner component, so the many
  // per-row canvases share a single copy instead of each initializing WASM.
  return (
    <GlyphRuntimeProvider>
      <RingollCanvasLyricsInner lyrics={lyrics} transLangIdx={transLangIdx} />
    </GlyphRuntimeProvider>
  );
}

function RingollCanvasLyricsInner({
  lyrics,
  transLangIdx,
}: Props): ReactElement {
  const runtime = useGlyphRuntime();
  const lang = lyrics.translationLanguages[transLangIdx];

  const segments = useMemo(
    () =>
      buildLyricSegments(lyrics, {
        translationLanguage: lang ?? null,
        trackDuration: lyrics.length ?? null,
      }),
    [lyrics, lang],
  );
  const presentationSegments = useMemo(
    () => buildPresentationSegments(segments),
    [segments],
  );

  // New document: drop the runtime's per-document derived state (escalation
  // attempts, the document-level ruby anchors, the layout cache). The
  // content-addressed fonts and their coverage stay registered.
  const { resetDocument } = runtime;
  useEffect(() => {
    resetDocument();
  }, [segments, resetDocument]);

  // Document-level decision (see `glyphRuntime.tsx`): if *any* line carries
  // furigana, every line reserves a ruby row so line advance stays uniform and
  // rows never jitter between annotated and bare lines.
  const reserveRubyRow = useMemo(
    () => segments.some((segment) => segment.furigana.length > 0),
    [segments],
  );

  // The virtualizer hands each row its source `LyricsKitLyricsLine`; map that
  // back to the normalized segment by object identity (segments are built from
  // the same `lyrics.lines` in order, so references match).
  const segmentByLine = useMemo(() => {
    const map = new Map<LyricsKitLyricsLine, GlyphLyricSegment>();
    (lyrics.lines ?? []).forEach((line, index) => {
      const segment = segments[index];
      if (segment) map.set(line, segment);
    });
    return map;
  }, [lyrics.lines, segments]);

  const gaps = useMemo(
    () =>
      findInterludeGaps(
        segments.map((segment) => ({
          // Dots remain anchored to authored timestamps. Presentation lead-in
          // only controls row activation/scrolling and must not shorten the
          // fixed trailing countdown or move its 250 ms end offset.
          startTime: segment.startTime,
          endTime: segment.endTime,
          role: segment.role,
          // Blank lines render nothing, so they count as instrumental time
          // rather than splitting a gap in two (see `findInterludeGaps`).
          content: segment.content,
        })),
      ),
    [segments],
  );

  const { ref: sizeRef, width, height } = useResizeObserver<HTMLDivElement>();
  const [stableSize, setStableSize] = useState({ width: 0, height: 0 });
  const applyStableSize = useMemo(
    () =>
      _.debounce(
        (nextWidth: number, nextHeight: number) =>
          setStableSize({ width: nextWidth, height: nextHeight }),
        RESIZE_DEBOUNCE_MS,
        { leading: true, trailing: true, maxWait: RESIZE_DEBOUNCE_MS * 3 },
      ),
    [],
  );
  useEffect(() => {
    if (width > 0 && height > 0) applyStableSize(width, height);
  }, [width, height, applyStableSize]);
  useEffect(() => () => applyStableSize.cancel(), [applyStableSize]);

  // One font size and wrap width for the whole document, so every row agrees.
  const fontSize = responsiveFontSize(stableSize.width, stableSize.height);
  const maxWidth = Math.max(1, Math.floor(stableSize.width - ROW_PADDING_X));

  return (
    <div ref={sizeRef} className="relative size-full">
      <LyricsVirtualizer
        rows={lyrics.lines}
        timingSegments={presentationSegments}
        estimatedRowHeight={20}
        containerAs={RingollContainerDiv}
        viewportClassName="p-4 px-8"
        align="start"
        alignAnchor={0.1}
      >
        {(props) => {
          const segment = props.row && segmentByLine.get(props.row);
          return (
            props.row &&
            segment && (
              <RowRenderer
                key={props.row.position}
                {...props}
                transLang={lang}
                glyphSegment={segment}
                fontSize={fontSize}
                maxWidth={maxWidth}
                reserveRubyRow={reserveRubyRow}
              />
            )
          );
        }}
      </LyricsVirtualizer>
      {/* Interlude indicator, overlaid at the active-line anchor. It owns its
          own media-clock show/hide and left/right alignment, so it is simply
          positioned over the lyric area with the viewport's horizontal inset. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 flex items-center px-8"
        // The band starts at the active-line anchor and is exactly as tall as a
        // blank row, so centring within it puts the dots in the middle of an
        // empty line's hit area - which is where they appear during the
        // interludes that empty lines represent.
        style={{ top: ANCHOR_FRACTION, height: EMPTY_LINE_MIN_HEIGHT }}
      >
        <InterludeDots gaps={gaps} fontSize={fontSize} />
      </div>
    </div>
  );
}
