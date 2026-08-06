import {
  loadDefaultJapaneseParser,
  loadDefaultSimplifiedChineseParser,
  loadDefaultThaiParser,
  loadDefaultTraditionalChineseParser,
} from "budoux";
import { TextIndexMap } from "@/frontendUtils/textIndexMap";

export type AutoPhraseLanguage = "ja" | "zh-hans" | "zh-hant" | "th";

export interface PhraseParser {
  parseBoundaries(text: string): number[];
}

export interface AutoPhraseParsers {
  ja: PhraseParser;
  "zh-hans": PhraseParser;
  "zh-hant": PhraseParser;
  th: PhraseParser;
}

export interface AutoPhraseRun {
  language: AutoPhraseLanguage;
  utf16Range: readonly [number, number];
  text: string;
}

export interface AutoPhraseResult {
  /** Soft keep-together spans to pass to `ParagraphRequest.phraseRanges`. */
  phraseRanges: [number, number][];
  /** CJT runs that were actually sent through a BudouX model. */
  runs: AutoPhraseRun[];
}

export interface AutoPhraseOptions {
  /**
   * BCP-47 language hint used for Han-only runs. Japanese is the MVP default;
   * `zh-Hans`/`zh-CN` and `zh-Hant`/`zh-TW` select the Chinese models.
   */
  language?: string | null;
  parsers?: AutoPhraseParsers;
}

type RunLanguage = AutoPhraseLanguage;
type GraphemeKind = RunLanguage | "han" | "bridge" | null;

interface GraphemePart {
  text: string;
  start: number;
  end: number;
  kind: GraphemeKind;
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const japaneseScript = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const hanScript = /\p{Script=Han}/u;
const thaiScript = /\p{Script=Thai}/u;
const phraseBridge = /^[\p{Letter}\p{Number}\p{Mark}\p{Punctuation}]+$/u;

let defaultParsers: AutoPhraseParsers | undefined;

function getDefaultParsers(): AutoPhraseParsers {
  return (defaultParsers ??= {
    ja: loadDefaultJapaneseParser(),
    "zh-hans": loadDefaultSimplifiedChineseParser(),
    "zh-hant": loadDefaultTraditionalChineseParser(),
    th: loadDefaultThaiParser(),
  });
}

function classifyGrapheme(text: string): GraphemeKind {
  if (thaiScript.test(text)) return "th";
  if (japaneseScript.test(text)) return "ja";
  if (hanScript.test(text)) return "han";
  if (phraseBridge.test(text)) return "bridge";
  return null;
}

function hanLanguage(language: string | null | undefined): RunLanguage {
  const normalized = language?.toLowerCase();
  if (!normalized?.startsWith("zh")) return "ja";
  if (
    normalized.includes("hant") ||
    /^zh-(tw|hk|mo)(?:-|$)/u.test(normalized)
  ) {
    return "zh-hant";
  }
  return "zh-hans";
}

function splitGraphemes(text: string): GraphemePart[] {
  return Array.from(graphemeSegmenter.segment(text), (part) => ({
    text: part.segment,
    start: part.index,
    end: part.index + part.segment.length,
    kind: classifyGrapheme(part.segment),
  }));
}

function resolveHan(parts: GraphemePart[], fallback: RunLanguage): void {
  let index = 0;
  while (index < parts.length) {
    if (!["ja", "han", "bridge"].includes(parts[index]!.kind ?? "")) {
      index += 1;
      continue;
    }

    const start = index;
    let hasJapanese = false;
    let hasHan = false;
    while (
      index < parts.length &&
      ["ja", "han", "bridge"].includes(parts[index]!.kind ?? "")
    ) {
      hasJapanese ||= parts[index]!.kind === "ja";
      hasHan ||= parts[index]!.kind === "han";
      index += 1;
    }
    if (!hasJapanese && !hasHan) continue;

    const resolved = hasJapanese ? "ja" : fallback;
    for (let item = start; item < index; item += 1) {
      if (parts[item]!.kind === "han") parts[item]!.kind = resolved;
    }
  }
}

function nearestLanguage(
  parts: readonly GraphemePart[],
  index: number,
  direction: -1 | 1,
): RunLanguage | null {
  for (
    let cursor = index + direction;
    cursor >= 0 && cursor < parts.length;
    cursor += direction
  ) {
    const kind = parts[cursor]!.kind;
    if (kind === "bridge") continue;
    return kind === "ja" ||
      kind === "zh-hans" ||
      kind === "zh-hant" ||
      kind === "th"
      ? kind
      : null;
  }
  return null;
}

function attachBridges(parts: GraphemePart[]): void {
  parts.forEach((part, index) => {
    if (part.kind !== "bridge") return;
    const left = nearestLanguage(parts, index, -1);
    const right = nearestLanguage(parts, index, 1);
    part.kind = left ?? right;
  });
}

function collectRuns(parts: readonly GraphemePart[]): AutoPhraseRun[] {
  const runs: AutoPhraseRun[] = [];
  let index = 0;
  while (index < parts.length) {
    const language = parts[index]!.kind;
    if (
      language !== "ja" &&
      language !== "zh-hans" &&
      language !== "zh-hant" &&
      language !== "th"
    ) {
      index += 1;
      continue;
    }

    const start = index;
    index += 1;
    while (index < parts.length && parts[index]!.kind === language) {
      index += 1;
    }
    const selected = parts.slice(start, index);
    runs.push({
      language,
      utf16Range: [selected[0]!.start, selected.at(-1)!.end],
      text: selected.map((part) => part.text).join(""),
    });
  }
  return runs;
}

/**
 * Produces BudouX phrase spans for CJT portions of `text`.
 *
 * Non-CJT-only lines return no ranges. Mixed Latin/emoji/space portions stay
 * outside the generated ranges and continue to use ordinary UAX #14 breaks.
 * Han-only runs use Japanese unless a Chinese BCP-47 hint is supplied.
 */
export function autoPhraseRanges(
  text: string,
  options: AutoPhraseOptions = {},
): AutoPhraseResult {
  if (!text) return { phraseRanges: [], runs: [] };

  const parts = splitGraphemes(text);
  resolveHan(parts, hanLanguage(options.language));
  attachBridges(parts);
  const runs = collectRuns(parts);
  const parsers = options.parsers ?? getDefaultParsers();
  const phraseRanges: [number, number][] = [];

  for (const run of runs) {
    const parser = parsers[run.language];
    const map = new TextIndexMap(run.text);
    const localBoundaries = parser
      .parseBoundaries(run.text)
      .filter(
        (offset) =>
          Number.isInteger(offset) &&
          offset > 0 &&
          offset < run.text.length &&
          map.inspectUtf16(offset).isGraphemeBoundary,
      )
      .toSorted((left, right) => left - right);
    const boundaries = [0, ...new Set(localBoundaries), run.text.length];
    const runStart = run.utf16Range[0];
    for (let index = 1; index < boundaries.length; index += 1) {
      const start = runStart + boundaries[index - 1]!;
      const end = runStart + boundaries[index]!;
      if (start < end) phraseRanges.push([start, end]);
    }
  }

  return { phraseRanges, runs };
}
