import type { RevealTag } from "../glyph/karaokeTiming";

/**
 * Per-word timing model for the Ringoll Canvas renderer.
 *
 * Apple Music-like Lyrics (AMLL) drives every karaoke effect - the sweeping
 * fill front, the emphasised-syllable glow, the base float - from a list of
 * *words*, each with its own start/end time. Our lyrics data instead carries
 * {@link RevealTag}s: `(index, time)` keyframes where `index` is a
 * **UTF-16 code-unit offset** into the line content and `time` is an
 * **absolute** playback time in seconds (see `glyph/karaokeTiming.ts`).
 *
 * The whole point of this module is the correspondence between those two
 * shapes: **consecutive reveal tags bound one word**. Word `k` occupies the
 * half-open UTF-16 range `[tags[k].index, tags[k + 1].index)` and runs from
 * `tags[k].time` to `tags[k + 1].time`. The final tag has no successor, so it
 * is closed against the line's own end - `contentLength` for the range and
 * `lineEndTime` for the time - which is exactly how `lyricSegments.ts` bounds
 * the last line's reveal. Deriving this word list once, up front, lets the
 * per-frame draw path drive AMLL's word-granular animations without re-reading
 * the raw tags every frame.
 *
 * Everything here is pure and deterministic (no canvas, no clock, no React
 * state) so it can be unit tested in isolation and fed directly from a
 * playback snapshot.
 *
 * Unlike `karaokeTiming.ts` - which *throws* on structurally invalid tag
 * *indices* because a bad index silently corrupts the logical mapping - this
 * module **never throws**. It mirrors the timing tolerance documented there:
 * tag *times* may be authored out of order, so they are normalised with a
 * running max, guaranteeing a word can never have a negative duration.
 * Degenerate ranges (zero-width, or inverted by a decreasing index) are simply
 * dropped rather than surfaced as errors, because the caller can always fall
 * back to a linear reveal for a malformed line.
 */
export interface LyricWord {
  /** Index of this word within the line (contiguous over the retained words). */
  index: number;
  /** UTF-16 half-open source range `[start, end)` within the line's content. */
  utf16Range: readonly [number, number];
  /** Absolute start time in seconds. */
  startTime: number;
  /** Absolute end time in seconds. Always `>= startTime`. */
  endTime: number;
  /** `endTime - startTime`, in seconds. `0` for an instant (zero-duration) word. */
  duration: number;
  /** Whether this is the final word of its line (AMLL boosts its emphasis). */
  isLast: boolean;
}

/**
 * Derives the word list from a line's reveal tags.
 *
 * Each tag opens a word; the trailing sentinel `(contentLength, lineEndTime)`
 * closes the last one. Tag times are made non-decreasing with a running max
 * (a stray out-of-order or non-finite time therefore collapses a word to zero
 * duration instead of producing a negative one - it can never move the model
 * backwards), matching the running-max normalisation `revealedOffset` applies
 * when interpolating between tags. Words whose UTF-16 range is empty
 * (`start === end`) or inverted (`start > end`, e.g. from a non-monotonic
 * index that `karaokeTiming.ts` would have rejected) are dropped, so the
 * retained words always have a strictly positive width.
 *
 * Notes on the contract:
 * - Fewer than one tag yields `[]`: an untimed line has no words and the
 *   caller reveals the whole line at its authored start instead.
 * - The region before the first tag (`[0, tags[0].index)`) is not a word. The
 *   caller reveals that prefix immediately at the authored line start via
 *   {@link leadingRevealEnd}, so it receives no word float or emphasis.
 * - Zero-*duration* words (equal start/end time) are legal and retained; AMLL
 *   treats them as instant. Only zero-*width* ranges are dropped.
 */
export function buildWords(
  tags: readonly RevealTag[],
  contentLength: number,
  lineEndTime: number,
): LyricWord[] {
  if (tags.length < 1) return [];

  // Each tag opens a word; the sentinel closes the final word against the
  // line's own end. Times are normalised to be non-decreasing so no word can
  // span backwards in time.
  const rawBoundaries: readonly RevealTag[] = [
    ...tags,
    { index: contentLength, time: lineEndTime },
  ];

  let runningMax = Number.NEGATIVE_INFINITY;
  const boundaries = rawBoundaries.map((boundary) => {
    if (Number.isFinite(boundary.time) && boundary.time > runningMax) {
      runningMax = boundary.time;
    }
    // Before any finite time is seen, fall back to 0 so we never emit
    // `-Infinity`/`NaN` from a leading non-finite tag time.
    const time = Number.isFinite(runningMax) ? runningMax : 0;
    return { index: boundary.index, time };
  });

  const words: LyricWord[] = [];
  for (let k = 0; k < boundaries.length - 1; k += 1) {
    const start = boundaries[k];
    const end = boundaries[k + 1];
    // Drop zero-width and inverted ranges (the latter can only arise from a
    // decreasing tag index, which `karaokeTiming.ts` treats as corruption).
    if (!(end.index > start.index)) continue;
    words.push({
      index: words.length,
      utf16Range: [start.index, end.index] as const,
      startTime: start.time,
      endTime: end.time,
      duration: end.time - start.time,
      isLast: false,
    });
  }

  if (words.length > 0) {
    words[words.length - 1].isLast = true;
  }
  return words;
}

/**
 * End offset of text that precedes the first timed word.
 *
 * A first tag at a non-zero UTF-16 index means the prefix is already present
 * when the line starts; the tag opens the following timed word rather than
 * delaying the prefix until the tag's own timestamp.
 */
export function leadingRevealEnd(
  tags: readonly RevealTag[],
  contentLength: number,
): number {
  const firstIndex = tags[0]?.index;
  if (
    !Number.isInteger(firstIndex) ||
    firstIndex <= 0 ||
    firstIndex > contentLength
  ) {
    return 0;
  }
  return firstIndex;
}

/** Clamps to `[0, 1]`, mapping `NaN` to `0`. */
function clamp01(value: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * A word's sweep progress in `[0, 1]` at `timeSeconds`.
 *
 * Deliberately **linear, with no easing**. AMLL notes that easing a word's
 * progress desynchronises it from the authored timing - the front would lead or
 * lag the sung syllable - so the ramp is left untouched and any expressiveness
 * comes from the emphasis envelope instead.
 *
 * A word with a non-positive or non-finite duration cannot be interpolated
 * (dividing by it would yield `Infinity`/`NaN`), so it steps `0 -> 1` at
 * `startTime`. `buildWords` normalises durations, so this only guards
 * hand-built words.
 */
export function wordProgress(word: LyricWord, timeSeconds: number): number {
  const { startTime, duration } = word;
  if (!(duration > 0) || !Number.isFinite(duration)) {
    return timeSeconds < startTime ? 0 : 1;
  }
  return clamp01((timeSeconds - startTime) / duration);
}
