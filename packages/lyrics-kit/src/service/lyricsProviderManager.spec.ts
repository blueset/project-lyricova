import { LyricsProviderSource } from "./lyricsProviderSource.js";
import type { LyricsProvider } from "./provider/index.js";
import { LyricsSearchRequest } from "./lyricsSearchRequest.js";

const SONG = "初音ミクの消失",
  ARTIST = "初音ミク",
  DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

async function macro(provider: LyricsProvider<unknown>) {
  const result = await provider.getLyrics(REQ);
  expect(Array.isArray(result)).toBe(true);
  console.log("Number of hits:", result.length);
}

vi.setConfig({ testTimeout: 15000 });

// test("NetEase", () => macro(LyricsProviderSource.netease.build()));
// test("QQ Music", () => macro(LyricsProviderSource.qq.build()));
test("Kugou", () => macro(LyricsProviderSource.kugou.build()));
// test("Xiami", () => macro(LyricsProviderSource.xiami.build()));
// test("Gecimi", () => macro(LyricsProviderSource.gecimi.build()));
test("ViewLyrics", () => macro(LyricsProviderSource.viewLyrics.build()));
test("Syair", () => macro(LyricsProviderSource.syair.build()));
