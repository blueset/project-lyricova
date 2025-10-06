import type { Lyrics } from "lyrics-kit/core";
import { FURIGANA } from "lyrics-kit/core";

const simplifiedJapanesePattern =
  /(言叶|缲|纷失|顷|顽张|时世|纳得|一绪|冗谈|踬|运命|马鹿|([梦飞闻谁鸣话赈见试远动仆终踴溫聲數攜积头无])(\p{sc=Hiragana}|\p{sc=Katakana}))/gu;

/**
 * Check if the provided string is “Simplified Japanese” (i.e. Japanese Text through Simplified Chinese filters)
 * @param text the string to check
 */
export function isSimplifiedJapanese(text: string): boolean {
  return simplifiedJapanesePattern.test(text);
}

export interface LyricsAnalysisResult {
  hasTranslation: boolean;
  hasFurigana: boolean;
  hasInlineTimeTags: boolean;
  hasSimplifiedJapanese: boolean;
  lastTimestamp?: number;
}

export function lyricsAnalysis(lyrics: Lyrics): LyricsAnalysisResult {
  let hasTranslation = false;
  let hasFurigana = false;
  let hasInlineTimeTags = false;
  let hasSimplifiedJapanese = false;

  if (!lyrics)
    return {
      hasTranslation,
      hasFurigana,
      hasInlineTimeTags,
      hasSimplifiedJapanese,
      lastTimestamp: null,
    };
  const lastTimestamp =
    lyrics.lines.reduce<number | null>((v, line) => {
      if (line.enabled && line.position != null && !isNaN(line.position)) {
        return v === null ? line.position : Math.max(v ?? 0, line.position);
      }
      return v;
    }, null) ?? null;
  hasTranslation = hasTranslation || lyrics.metadata.hasTranslation;

  lyrics.lines.forEach((v) => {
    hasTranslation = hasTranslation || v?.attachments?.translation() != null;
    hasFurigana =
      hasFurigana || v?.attachments?.content[FURIGANA]?.attachment != null;
    hasInlineTimeTags = hasInlineTimeTags || v?.attachments.timeTag != null;
    hasSimplifiedJapanese =
      hasSimplifiedJapanese || isSimplifiedJapanese(v.content || "");
  });

  return {
    hasTranslation,
    hasFurigana,
    hasInlineTimeTags,
    hasSimplifiedJapanese,
    lastTimestamp,
  };
}
