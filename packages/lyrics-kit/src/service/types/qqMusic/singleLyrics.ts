export interface QQResponseSinglePlainLyrics {
  retcode: number;
  code: number;
  subcode: number;
  /** Lyrics string (Base64 of XML encoded) */
  lyric: string;
  /** Translated string (Base64 of XML encoded) */
  trans?: string;
}
