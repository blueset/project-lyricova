export interface SpotifyLyricsJSON {
  error: boolean;
  syncType: "LINE_SYNCED";
  lines: {
    startTimeMs: string;
    words: string;
    syllables: [];
    endTimeMs: "0";
  }[];
}
