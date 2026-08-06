import type { LineBreak, LineWrapStrategy } from "@lyricova/glyph-renderer";

export interface CanvasTextLine {
  text: string;
  sourceRange: readonly [number, number];
  width: number;
  direction: "ltr" | "rtl";
}

export interface CanvasTextLayout {
  lines: CanvasTextLine[];
  width: number;
  height: number;
  lineHeight: number;
}

export interface CanvasTextWrapOptions {
  text: string;
  maxWidth: number;
  lineHeight: number;
  measureText: (text: string) => number;
  breaks: readonly LineBreak[];
  wrapStrategy?: LineWrapStrategy;
  /** Soft UTF-16 phrase spans whose interior legal breaks are discouraged. */
  phraseRanges?: readonly (readonly [number, number])[];
}

interface Boundary {
  offset: number;
  legal: boolean;
  mandatory: boolean;
  discouraged: boolean;
}

interface LineRange {
  start: number;
  end: number;
  hardBreak: boolean;
}

interface Score {
  overflow: number;
  emergencyBreaks: number;
  phraseBreaks: number;
  variance: number;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const MAX_BALANCE_TRANSITIONS = 200_000;
const trailingBreakSpace = /[\s\u0085]+$/u;
const rtlControl = /[\u200F\u202B\u202E\u2067]/u;
const ltrControl = /[\u200E\u202A\u202D\u2066]/u;
const rtlScript =
  /[\p{Script=Adlam}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Mandaic}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Syriac}\p{Script=Thaana}]/u;
const unicodeLetter = /\p{Letter}/u;

export function canvasTextDirection(text: string): "ltr" | "rtl" {
  for (const character of text) {
    if (rtlControl.test(character)) return "rtl";
    if (ltrControl.test(character)) return "ltr";
    if (!unicodeLetter.test(character)) continue;
    if (rtlScript.test(character)) return "rtl";
    return "ltr";
  }
  return "ltr";
}

function breakDiscouraged(
  offset: number,
  phraseRanges: readonly (readonly [number, number])[],
): boolean {
  return phraseRanges.some(([start, end]) => start < offset && offset < end);
}

function lineText(text: string, start: number, end: number): string {
  return text.slice(start, end).replace(trailingBreakSpace, "");
}

function createMeasureRange(
  text: string,
  measureText: (text: string) => number,
): (start: number, end: number) => number {
  const cache = new Map<string, number>();
  return (start, end) => {
    const key = `${start}:${end}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const width = measureText(lineText(text, start, end));
    cache.set(key, width);
    return width;
  };
}

function collectBoundaries(
  text: string,
  breaks: readonly LineBreak[],
  phraseRanges: readonly (readonly [number, number])[],
): Boundary[] {
  const breakByOffset = new Map(
    breaks.map((item) => [item.utf16Index, item.mandatory]),
  );
  const boundaries: Boundary[] = [
    { offset: 0, legal: true, mandatory: false, discouraged: false },
  ];
  for (const part of graphemeSegmenter.segment(text)) {
    const offset = part.index + part.segment.length;
    const mandatory = breakByOffset.get(offset) === true;
    boundaries.push({
      offset,
      legal: breakByOffset.has(offset),
      mandatory,
      discouraged: !mandatory && breakDiscouraged(offset, phraseRanges),
    });
  }
  return boundaries;
}

function greedyRanges(
  text: string,
  boundaries: readonly Boundary[],
  maxWidth: number,
  measureRange: (start: number, end: number) => number,
): LineRange[] {
  const lines: LineRange[] = [];
  let lineStartIndex = 0;
  let index = 1;
  let lastPreferred: number | null = null;
  let lastPhrase: number | null = null;

  while (index < boundaries.length) {
    const boundary = boundaries[index]!;
    const previousOffset = boundaries[index - 1]!.offset;
    const segment = text.slice(previousOffset, boundary.offset);
    const mandatoryControl =
      boundary.mandatory &&
      segment.replace(trailingBreakSpace, "").length === 0;

    if (mandatoryControl) {
      lines.push({
        start: boundaries[lineStartIndex]!.offset,
        end: boundary.offset,
        hardBreak: true,
      });
      lineStartIndex = index;
      lastPreferred = null;
      lastPhrase = null;
      index += 1;
      continue;
    }

    const width = measureRange(
      boundaries[lineStartIndex]!.offset,
      boundary.offset,
    );
    if (maxWidth > 0 && width > maxWidth) {
      const selected = lastPreferred ?? lastPhrase;
      if (selected !== null && selected > lineStartIndex) {
        lines.push({
          start: boundaries[lineStartIndex]!.offset,
          end: boundaries[selected]!.offset,
          hardBreak: false,
        });
        lineStartIndex = selected;
        index = selected + 1;
        lastPreferred = null;
        lastPhrase = null;
        continue;
      }
      if (index - 1 > lineStartIndex) {
        lines.push({
          start: boundaries[lineStartIndex]!.offset,
          end: previousOffset,
          hardBreak: false,
        });
        lineStartIndex = index - 1;
        lastPreferred = null;
        lastPhrase = null;
        continue;
      }
    }

    if (boundary.mandatory) {
      lines.push({
        start: boundaries[lineStartIndex]!.offset,
        end: boundary.offset,
        hardBreak: true,
      });
      lineStartIndex = index;
      lastPreferred = null;
      lastPhrase = null;
    } else if (boundary.legal) {
      if (boundary.discouraged) lastPhrase = index;
      else lastPreferred = index;
    }
    index += 1;
  }

  if (lineStartIndex + 1 < boundaries.length) {
    lines.push({
      start: boundaries[lineStartIndex]!.offset,
      end: boundaries.at(-1)!.offset,
      hardBreak: true,
    });
  }
  return lines;
}

function addScore(
  score: Score,
  width: number,
  ideal: number,
  maxWidth: number,
  emergency: boolean,
  discouraged: boolean,
): Score {
  const overflow = Math.max(0, width - maxWidth);
  const deviation = width - ideal;
  return {
    overflow: score.overflow + overflow * overflow,
    emergencyBreaks: score.emergencyBreaks + Number(emergency),
    phraseBreaks: score.phraseBreaks + Number(discouraged),
    variance: score.variance + deviation * deviation,
  };
}

function better(left: Score, right: Score): boolean {
  const epsilon = 1e-6;
  if (Math.abs(left.overflow - right.overflow) > epsilon) {
    return left.overflow < right.overflow;
  }
  if (left.emergencyBreaks !== right.emergencyBreaks) {
    return left.emergencyBreaks < right.emergencyBreaks;
  }
  if (left.phraseBreaks !== right.phraseBreaks) {
    return left.phraseBreaks < right.phraseBreaks;
  }
  return left.variance + epsilon < right.variance;
}

function balanceGroup(
  boundaries: readonly Boundary[],
  startIndex: number,
  endIndex: number,
  lineCount: number,
  maxWidth: number,
  measureRange: (start: number, end: number) => number,
): LineRange[] | null {
  const candidates = boundaries.slice(startIndex, endIndex + 1);
  const work = lineCount * candidates.length * candidates.length;
  if (candidates.length <= lineCount || work > MAX_BALANCE_TRANSITIONS) {
    return null;
  }

  const totalWidth = measureRange(
    candidates[0]!.offset,
    candidates.at(-1)!.offset,
  );
  const ideal = Math.min(maxWidth, totalWidth / lineCount);
  const scores: Array<Array<Score | null>> = Array.from(
    { length: lineCount + 1 },
    () => Array(candidates.length).fill(null),
  );
  const previous: Array<Array<number | null>> = Array.from(
    { length: lineCount + 1 },
    () => Array(candidates.length).fill(null),
  );
  scores[0]![0] = {
    overflow: 0,
    emergencyBreaks: 0,
    phraseBreaks: 0,
    variance: 0,
  };

  for (let used = 1; used <= lineCount; used += 1) {
    for (let end = 1; end < candidates.length; end += 1) {
      if (candidates.length - 1 - end < lineCount - used) continue;
      for (let start = 0; start < end; start += 1) {
        const score = scores[used - 1]![start];
        if (!score) continue;
        const width = measureRange(
          candidates[start]!.offset,
          candidates[end]!.offset,
        );
        const isLast = end + 1 === candidates.length;
        const candidate = addScore(
          score,
          width,
          ideal,
          maxWidth,
          !isLast && !candidates[end]!.legal,
          !isLast && candidates[end]!.discouraged,
        );
        const current = scores[used]![end];
        if (!current || better(candidate, current)) {
          scores[used]![end] = candidate;
          previous[used]![end] = start;
        }
      }
    }
  }

  if (!scores[lineCount]!.at(-1)) return null;
  const lines: LineRange[] = [];
  let used = lineCount;
  let end = candidates.length - 1;
  while (used > 0) {
    const start = previous[used]![end];
    if (start === null) return null;
    lines.push({
      start: candidates[start]!.offset,
      end: candidates[end]!.offset,
      hardBreak: false,
    });
    end = start;
    used -= 1;
  }
  return lines.reverse();
}

function balancedRanges(
  boundaries: readonly Boundary[],
  greedy: readonly LineRange[],
  maxWidth: number,
  measureRange: (start: number, end: number) => number,
): LineRange[] {
  const result: LineRange[] = [];
  let groupStart = 0;
  for (let index = 0; index < greedy.length; index += 1) {
    if (!greedy[index]!.hardBreak) continue;
    const group = greedy.slice(groupStart, index + 1);
    const startIndex = boundaries.findIndex(
      (boundary) => boundary.offset === group[0]!.start,
    );
    const endIndex = boundaries.findIndex(
      (boundary) => boundary.offset === group.at(-1)!.end,
    );
    const balanced =
      group.length > 1 && startIndex >= 0 && endIndex > startIndex
        ? balanceGroup(
            boundaries,
            startIndex,
            endIndex,
            group.length,
            maxWidth,
            measureRange,
          )
        : null;
    if (balanced) {
      balanced.at(-1)!.hardBreak = true;
      result.push(...balanced);
    } else {
      result.push(...group);
    }
    groupStart = index + 1;
  }
  return result;
}

export function wrapCanvasText(
  options: CanvasTextWrapOptions,
): CanvasTextLayout {
  const {
    text,
    maxWidth,
    lineHeight,
    measureText,
    breaks,
    wrapStrategy = "balanced",
    phraseRanges = [],
  } = options;
  if (!text) return { lines: [], width: 0, height: 0, lineHeight };

  const boundaries = collectBoundaries(text, breaks, phraseRanges);
  const measureRange = createMeasureRange(text, measureText);
  const greedy = greedyRanges(text, boundaries, maxWidth, measureRange);
  const ranges =
    wrapStrategy === "balanced" && maxWidth > 0
      ? balancedRanges(boundaries, greedy, maxWidth, measureRange)
      : greedy;
  const lines = ranges.map((range) => {
    const value = lineText(text, range.start, range.end);
    return {
      text: value,
      sourceRange: [range.start, range.end] as const,
      width: measureText(value),
      direction: canvasTextDirection(value),
    };
  });
  return {
    lines,
    width: lines.reduce((max, line) => Math.max(max, line.width), 0),
    height: lines.length * lineHeight,
    lineHeight,
  };
}
