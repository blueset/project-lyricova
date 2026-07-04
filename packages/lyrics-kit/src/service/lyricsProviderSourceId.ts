export const LyricsProviderSourceId = {
  netease: "netease",
  neteaseVercel: "neteaseVercel",
  qq: "qq",
  kugou: "kugou",
  xiami: "xiami",
  gecimi: "gecimi",
  viewLyrics: "viewLyrics",
  syair: "syair",
  musixmatch: "musixmatch",
  youtube: "youtube",
  spotify: "spotify",
  songle: "songle",
  LrcLib: "lrclib",
} as const;

export type LyricsProviderSourceId =
  (typeof LyricsProviderSourceId)[keyof typeof LyricsProviderSourceId];