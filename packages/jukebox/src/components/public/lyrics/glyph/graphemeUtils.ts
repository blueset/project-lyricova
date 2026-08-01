const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

/** Splits `text` into extended grapheme clusters (UAX #29). */
export function splitGraphemes(text: string): string[] {
  return Array.from(graphemeSegmenter.segment(text), (part) => part.segment);
}

/** Counts the extended grapheme clusters (UAX #29) in `text`. */
export function countGraphemes(text: string): number {
  let count = 0;
  for (const _part of graphemeSegmenter.segment(text)) count++;
  return count;
}
