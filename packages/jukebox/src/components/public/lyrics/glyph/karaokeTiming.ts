/**
 * Pure karaoke timing math for the Glyph Canvas renderer.
 *
 * The lyrics data model carries per-line time tags whose `index` is a
 * **UTF-16 code-unit offset** into the line content (documented in the API as
 * "per Extended Grapheme Cluster", but consumed as UTF-16 everywhere else -
 * see `RubyLineRenderer.tsx` and `furiganaValidation.ts`). This module turns
 * those discrete `(index, time)` tags into:
 *
 * 1. a single **continuous revealed logical offset** (a fractional UTF-16
 *    position) for the current playback time ({@link revealedOffset}), and
 * 2. a per-cluster `0..1` karaoke fill fraction ({@link clusterFill}), which
 *    correctly handles a reveal front that lands *inside* a multi-character or
 *    ligature cluster.
 *
 * Everything here is deterministic and canvas-independent so it can be unit
 * tested and driven directly from a `PlaybackSnapshot` (no animation state,
 * no `requestAnimationFrame`). Invalid tag indices are surfaced as an
 * explicit {@link KaraokeTimingError} rather than silently clamped, so a
 * malformed line can never quietly corrupt the revealed offset / layout.
 */

/** One reveal keyframe: the reveal front reaches UTF-16 `index` at `time` (seconds). */
export interface RevealTag {
  /** UTF-16 code-unit offset into the segment content this tag reveals up to. */
  index: number;
  /** Absolute playback time (seconds) at which the reveal reaches `index`. */
  time: number;
}

/** Thrown when a segment's reveal tags are structurally invalid. */
export class KaraokeTimingError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "KaraokeTimingError";
  }
}

/**
 * Validates reveal tags against a segment of `contentLength` UTF-16 units.
 * Throws {@link KaraokeTimingError} (never silently repairs) when a tag index
 * is non-integer, out of `[0, contentLength]`, or not monotonically
 * non-decreasing, or when a tag time is non-finite. Non-monotonic *times* are
 * tolerated here (a later-authored tool may emit them) and normalized during
 * interpolation - only *indices* corrupt the logical mapping, so only they
 * throw.
 */
export function validateRevealTags(
  tags: readonly RevealTag[],
  contentLength: number,
): void {
  if (!Number.isInteger(contentLength) || contentLength < 0) {
    throw new KaraokeTimingError(
      `contentLength must be a non-negative integer (got ${contentLength}).`,
    );
  }
  let previousIndex = 0;
  tags.forEach((tag, i) => {
    if (!Number.isInteger(tag.index)) {
      throw new KaraokeTimingError(
        `Reveal tag ${i} index must be an integer (got ${tag.index}).`,
      );
    }
    if (tag.index < 0 || tag.index > contentLength) {
      throw new KaraokeTimingError(
        `Reveal tag ${i} index ${tag.index} is out of range 0..${contentLength}.`,
      );
    }
    if (tag.index < previousIndex) {
      throw new KaraokeTimingError(
        `Reveal tag ${i} index ${tag.index} decreases below the previous index ${previousIndex}.`,
      );
    }
    if (!Number.isFinite(tag.time)) {
      throw new KaraokeTimingError(
        `Reveal tag ${i} time must be finite (got ${tag.time}).`,
      );
    }
    previousIndex = tag.index;
  });
}

export interface RevealedOffsetParams {
  /** Reveal keyframes (validated), in logical order. May be empty. */
  tags: readonly RevealTag[];
  /** Segment content length in UTF-16 code units. */
  contentLength: number;
  /** Absolute time (seconds) the segment starts revealing. */
  startTime: number;
  /** Absolute time (seconds) the segment finishes revealing. */
  endTime: number;
  /** Current playback time (seconds). */
  currentTime: number;
}

/**
 * Maps `currentTime` to a **continuous** revealed logical offset in
 * `[0, contentLength]` (fractional UTF-16 units).
 *
 * - Before `startTime` -> `0`; at/after `endTime` -> `contentLength`.
 * - With no tags, reveals linearly across the whole segment.
 * - With tags, interpolates piecewise-linearly between successive
 *   `(index, time)` keyframes, anchoring the segment start at offset `0` and
 *   its end at `contentLength`. Tag times are made monotonic (running max) so
 *   a stray out-of-order time degrades to a step instead of interpolating
 *   backwards; indices are trusted because {@link validateRevealTags} has
 *   already rejected any that decrease.
 */
export function revealedOffset(params: RevealedOffsetParams): number {
  const { tags, contentLength, startTime, endTime, currentTime } = params;
  validateRevealTags(tags, contentLength);

  if (contentLength === 0) return 0;
  if (currentTime <= startTime) return 0;
  if (currentTime >= endTime) return contentLength;

  if (tags.length === 0) {
    const span = endTime - startTime;
    if (span <= 0) return contentLength;
    return clamp((currentTime - startTime) / span, 0, 1) * contentLength;
  }

  // Build interpolation points: start anchor (offset 0), the tags, end anchor
  // (offset contentLength), with times coerced to be non-decreasing.
  const points: RevealTag[] = [];
  const push = (index: number, time: number) => {
    const previous = points[points.length - 1];
    const monotonicTime = previous ? Math.max(previous.time, time) : time;
    points.push({ index, time: monotonicTime });
  };

  if (tags[0]!.index !== 0) push(0, startTime);
  for (const tag of tags) push(tag.index, tag.time);
  if (tags[tags.length - 1]!.index !== contentLength) {
    push(contentLength, endTime);
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (currentTime < a.time) return clamp(a.index, 0, contentLength);
    if (currentTime <= b.time) {
      const dt = b.time - a.time;
      if (dt <= 0) return clamp(b.index, 0, contentLength);
      const t = (currentTime - a.time) / dt;
      return clamp(a.index + t * (b.index - a.index), 0, contentLength);
    }
  }

  return contentLength;
}

/**
 * The `0..1` karaoke fill fraction for a cluster whose logical source spans
 * UTF-16 `[startUtf16, endUtf16)`, given a continuous `revealed` offset.
 *
 * A cluster fully before the reveal front is `1`, fully after is `0`, and one
 * the front is passing through - e.g. a ligature or base+combining-mark
 * cluster covering several UTF-16 units - fills proportionally to how far the
 * front has advanced across the cluster's span. This fraction is intentionally
 * direction-agnostic (it is a scalar over the cluster's logical span); the
 * renderer applies the visual fill direction (LTR/RTL) separately from the
 * cluster's bidi contract.
 *
 * A zero-width cluster (`endUtf16 <= startUtf16`) steps `0 -> 1` once the
 * front reaches its start.
 */
export function clusterFill(
  revealed: number,
  startUtf16: number,
  endUtf16: number,
): number {
  if (endUtf16 <= startUtf16) {
    return revealed >= startUtf16 ? 1 : 0;
  }
  return clamp((revealed - startUtf16) / (endUtf16 - startUtf16), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
