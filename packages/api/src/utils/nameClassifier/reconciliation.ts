import pinyin from "pinyin";
import MeCab from "mecab-async";
import kanjidic from "../kanjidic2.mod.min.json";
import { hiraToRoma, kanaToHira } from "../kanaUtils";
import { phoneticSkeleton } from "./normalize";

interface MecabParsedResult {
  kanji: string;
  reading: string;
  alphaForwardLogRate: number;
  isLineBreak: boolean;
  partOfSpeech: string;
}

const mecab = new MeCab<MecabParsedResult>();
mecab.command =
  'mecab --node-format="%M\u200C%f[7]\u200C%pA\u200C%f[0],%f[1],%f[2],%f[3],%f[4],%f[5]\n" --unk-format="%M\u200C%M\u200C%pA\u200C%f[0],%f[1],%f[2],%f[3],%f[4],%f[5]\n" --marginal';
mecab.parser = function (data: string[]): MecabParsedResult {
  const [kanji, reading, alphaForwardLogRateStr, partOfSpeech] =
    data[0].split("\u200C");
  return {
    kanji,
    reading,
    alphaForwardLogRate: parseFloat(alphaForwardLogRateStr),
    isLineBreak: reading === undefined,
    partOfSpeech,
  };
};

const hanRegex = /\p{Script=Han}/u;
const kanaRegex = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
const kanjidicMap: Record<string, string[]> = kanjidic;

function romanizeKana(reading: string): string {
  return hiraToRoma(kanaToHira(reading)).replace(/\s+/g, "").trim();
}

function fallbackJapaneseUnits(text: string): string[] {
  const units: string[] = [];

  for (const char of text) {
    if (/\s/u.test(char)) {
      continue;
    }
    if (hanRegex.test(char)) {
      const readings = kanjidicMap[char] ?? [];
      const reading =
        readings.find((value) => kanaRegex.test(value)) ?? readings[0] ?? char;
      units.push(romanizeKana(reading));
      continue;
    }
    if (kanaRegex.test(char)) {
      units.push(romanizeKana(char));
      continue;
    }
    units.push(char);
  }

  return units.filter(Boolean);
}

function romanizeJapaneseUnits(text: string): string[] {
  const words = mecab.parseSyncFormat(text) as MecabParsedResult[];
  const units = words
    .filter((word) => !word.isLineBreak)
    .flatMap((word) => {
      const reading = word.reading;
      if (reading && kanaRegex.test(reading) && reading !== word.kanji) {
        return romanizeKana(reading);
      }
      return fallbackJapaneseUnits(word.kanji);
    })
    .filter(Boolean);

  return units;
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) {
    index++;
  }
  return index;
}

function commonSuffixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (
    index < limit &&
    a[a.length - 1 - index] === b[b.length - 1 - index]
  ) {
    index++;
  }
  return index;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, idx) => idx);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    for (let j = 0; j <= b.length; j++) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

/**
 * Romanize Han text as tone-stripped Mandarin pinyin.
 */
export function romanizeAsMandarin(hanText: string): string {
  return pinyin(hanText, { style: pinyin.STYLE_NORMAL })
    .map((syllables) => syllables[0]?.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Romanize Han text as Japanese using MeCab, with KANJIDIC2 fallback.
 */
export async function romanizeAsJapanese(hanText: string): Promise<string> {
  try {
    const units = romanizeJapaneseUnits(hanText);
    if (units.length > 0) {
      return units.join(" ");
    }
  } catch {
    // Fall through to KANJIDIC2 fallback.
  }

  return fallbackJapaneseUnits(hanText).join(" ");
}

/**
 * Score how similar two romanizations are after phonetic normalization.
 */
export function scoreSimilarity(candidate: string, target: string): number {
  const normalizedCandidate = phoneticSkeleton(candidate);
  const normalizedTarget = phoneticSkeleton(target);

  if (normalizedCandidate === normalizedTarget) {
    return 1;
  }
  if (!normalizedCandidate.length || !normalizedTarget.length) {
    return 0;
  }

  const maxLen = Math.max(normalizedCandidate.length, normalizedTarget.length);
  const editRatio =
    1 - levenshteinDistance(normalizedCandidate, normalizedTarget) / maxLen;
  const prefixRatio =
    commonPrefixLength(normalizedCandidate, normalizedTarget) / maxLen;
  const suffixRatio =
    commonSuffixLength(normalizedCandidate, normalizedTarget) / maxLen;
  const edgeBonus = (prefixRatio + suffixRatio) / 2;

  return Math.max(0, Math.min(1, editRatio * 0.85 + edgeBonus * 0.15));
}

/**
 * Romanize the Han text as Mandarin and Japanese, then score both against a target romanization.
 */
export async function reconcile(
  romanization: string,
  hanText: string,
): Promise<{
  mandarinScore: number;
  japaneseScore: number;
  mandarinReading: string;
  japaneseReading: string;
}> {
  const [mandarinReading, japaneseReading] = await Promise.all([
    Promise.resolve(romanizeAsMandarin(hanText)),
    romanizeAsJapanese(hanText),
  ]);

  return {
    mandarinScore: scoreSimilarity(mandarinReading, romanization),
    japaneseScore: scoreSimilarity(japaneseReading, romanization),
    mandarinReading,
    japaneseReading,
  };
}
