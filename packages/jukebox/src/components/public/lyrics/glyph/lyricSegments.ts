import type {
  LyricsKitLyrics,
  LyricsKitLyricsLine,
} from "@lyricova/components/gql/schema";
import type { RevealTag } from "./karaokeTiming";
import type { FuriganaAnnotationInput } from "./types";
import { getSelectedTranslation } from "../translation";

/**
 * Segment model for the Glyph Canvas renderer.
 *
 * A {@link GlyphLyricSegment} is a normalized, self-contained view of one
 * lyrics line: absolute `startTime`/`endTime`, its base text, furigana
 * annotations, selected translation, role/alignment/minor flags, and its
 * reveal keyframes converted to **absolute-time** {@link RevealTag}s. Building
 * this model up-front (rather than reaching into the raw GraphQL shape at draw
 * time) keeps the per-frame draw path allocation-light and lets segment
 * selection support overlapping active lines.
 */

/** Horizontal alignment derived from a line's role. */
export type SegmentAlignment = "start" | "center" | "end";

export interface GlyphLyricSegment {
  /** Index of the source line in `lyrics.lines`. */
  lineIndex: number;
  /** Base text of the line. */
  content: string;
  /** Absolute start time (seconds). */
  startTime: number;
  /** Absolute end time (seconds). Always `> startTime`. */
  endTime: number;
  /** Line role (0 = default/left, 1 = right/duet, 2 = center). */
  role: number;
  /** Whether this is a minor (background) line. */
  minor: boolean;
  /** Horizontal alignment derived from {@link role}. */
  alignment: SegmentAlignment;
  /** Furigana annotations (UTF-16 `leftIndex`/`rightIndex`), possibly empty. */
  furigana: FuriganaAnnotationInput[];
  /** Reveal keyframes in absolute time, logical order. Empty when untimed. */
  timeTags: RevealTag[];
  /** Selected translation text for this line, or `null` when unavailable. */
  translation: string | null;
}

/** Maps a line role to a horizontal alignment (matches the DOM lyric CSS). */
export function alignmentForRole(role: number): SegmentAlignment {
  if (role === 1) return "end";
  if (role === 2) return "center";
  return "start";
}

export interface BuildSegmentsOptions {
  /**
   * Selected translation language key (into `attachments.translations`).
   * Falls back to `attachments.translation` when unset or missing.
   */
  translationLanguage?: string | null;
  /** Track duration (seconds), used to bound the final line's reveal. */
  trackDuration?: number | null;
  /** Fallback per-line duration (seconds) when nothing else bounds it. */
  defaultLineDuration?: number;
}

const DEFAULT_LINE_DURATION = 4;

/**
 * Largest *finite* `timeTag` across a line's reveal tags, or `undefined` when
 * there are none. Tags are authored in principle in non-decreasing order, but
 * malformed/unsorted or non-finite entries (e.g. a decreasing or `NaN` time
 * tag) must never *shrink* the derived duration - only ever fail to extend
 * it - so this takes the max over every finite tag rather than trusting the
 * array's last element. This mirrors the running-max normalization
 * `revealedOffset` applies when interpolating between tags (see
 * `karaokeTiming.ts`), just aggregated instead of sequential.
 */
function maxFiniteTagTime(
  tags: readonly { timeTag: number }[],
): number | undefined {
  let max: number | undefined;
  for (const tag of tags) {
    if (
      Number.isFinite(tag.timeTag) &&
      (max === undefined || tag.timeTag > max)
    ) {
      max = tag.timeTag;
    }
  }
  return max;
}

/**
 * Resolves a line's absolute end time. Prefers the line's own timed duration
 * (so lines can legitimately *overlap* the next one - e.g. call-and-response
 * duet roles), then the maximum finite reveal tag, then the next line's
 * start, then the track duration, and finally a constant fallback. Always
 * returns a value strictly greater than `startTime`.
 */
function resolveEndTime(
  line: LyricsKitLyricsLine,
  nextLine: LyricsKitLyricsLine | undefined,
  options: BuildSegmentsOptions,
): number {
  const startTime = line.position;
  const timeTag = line.attachments.timeTag;
  const tags = timeTag?.tags ?? [];
  const lastTagTime = maxFiniteTagTime(tags);

  const durationEnd =
    timeTag?.duration != null
      ? startTime + timeTag.duration
      : lastTagTime != null
        ? startTime + lastTagTime
        : undefined;

  const candidates = [
    durationEnd,
    nextLine?.position,
    options.trackDuration ?? undefined,
  ].filter(
    (v): v is number => v != null && Number.isFinite(v) && v > startTime,
  );

  if (candidates.length > 0) {
    // The line's own timed extent wins when present so overlaps are preserved;
    // otherwise fall back to the earliest sensible boundary.
    return durationEnd != null && durationEnd > startTime
      ? durationEnd
      : Math.min(...candidates);
  }

  const fallback = options.defaultLineDuration ?? DEFAULT_LINE_DURATION;
  return startTime + Math.max(fallback, 0.001);
}

function resolveTranslation(
  line: LyricsKitLyricsLine,
  language: string | null | undefined,
): string | null {
  const { translations, translation } = line.attachments;
  const value = getSelectedTranslation(translations, language);
  if (typeof value === "string" && value.length > 0) return value;
  return translation && translation.length > 0 ? translation : null;
}

/**
 * Builds the normalized segment model for a whole lyrics document. Untimed
 * lines (no reveal tags) get an empty `timeTags` array; Ringoll Canvas reveals
 * those lines as a whole at their authored start.
 */
export function buildLyricSegments(
  lyrics: LyricsKitLyrics,
  options: BuildSegmentsOptions = {},
): GlyphLyricSegment[] {
  const lines = lyrics.lines ?? [];
  // Fall back to the document's own duration when no explicit track duration
  // is supplied, so the final untimed line is still bounded.
  const effectiveOptions: BuildSegmentsOptions = {
    ...options,
    trackDuration: options.trackDuration ?? lyrics.length ?? null,
  };
  return lines.map((line, index) => {
    const startTime = line.position;
    const endTime = resolveEndTime(line, lines[index + 1], effectiveOptions);
    const tags = line.attachments.timeTag?.tags ?? [];
    const timeTags: RevealTag[] = tags.map((tag) => ({
      index: tag.index,
      time: startTime + tag.timeTag,
    }));

    const furigana: FuriganaAnnotationInput[] = (
      line.attachments.furigana ?? []
    ).map((f) => ({
      content: f.content,
      leftIndex: f.leftIndex,
      rightIndex: f.rightIndex,
    }));

    return {
      lineIndex: index,
      content: line.content,
      startTime,
      endTime,
      role: line.attachments.role,
      minor: line.attachments.minor,
      alignment: alignmentForRole(line.attachments.role),
      furigana,
      timeTags,
      translation: resolveTranslation(line, options.translationLanguage),
    };
  });
}

/**
 * Selects every segment active at `currentTime`, i.e. whose
 * `[startTime, endTime)` half-open interval contains it. Returns them sorted
 * by `startTime` (then `lineIndex`), and - crucially - can return **more than
 * one** segment, so genuinely overlapping lines (duet roles, background
 * echoes) are all drawn rather than one arbitrarily winning.
 */
export function selectActiveSegments(
  segments: readonly GlyphLyricSegment[],
  currentTime: number,
): GlyphLyricSegment[] {
  return segments
    .filter(
      (segment) =>
        currentTime >= segment.startTime && currentTime < segment.endTime,
    )
    .sort((a, b) => a.startTime - b.startTime || a.lineIndex - b.lineIndex);
}
