import { Lyrics } from "lyrics-kit";
import { FURIGANA } from "lyrics-kit/build/main/core/lyricsLineAttachment";

const simplifiedJapanesePattern = /(言叶|缲|纷失|顷|顽张|时世|纳得|一绪|冗谈|踬|运命|马鹿|绝対|([梦飞闻谁鸣话赈见试远动仆终踴溫聲數攜积头无])(\p{sc=Hiragana}|\p{sc=Katakana}))/ug;

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

  if (!lyrics) return {
    hasTranslation, hasFurigana, hasInlineTimeTags, hasSimplifiedJapanese,
    lastTimestamp: null,
  };
  const lastTimestamp = lyrics.lines[lyrics.lines.length - 1].position;

  lyrics.lines.forEach(v => {
    hasTranslation = hasTranslation || v?.attachments?.translation() != null;
    hasFurigana = hasFurigana || v?.attachments?.content[FURIGANA]?.attachment != null;
    hasInlineTimeTags = hasInlineTimeTags || v?.attachments.timeTag != null;
    hasSimplifiedJapanese = hasSimplifiedJapanese || isSimplifiedJapanese(v.content || "");
  });

  return {
    hasTranslation,
    hasFurigana,
    hasInlineTimeTags,
    hasSimplifiedJapanese,
    lastTimestamp
  };
}