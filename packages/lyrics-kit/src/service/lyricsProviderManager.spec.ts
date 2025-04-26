import { LyricsProviderSource } from "./lyricsProviderSource";
import { LyricsProvider } from "./provider";
import { LyricsSearchRequest } from "./lyricsSearchRequest";

const SONG = "初音ミクの消失",
  ARTIST = "初音ミク",
  DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

async function macro(provider: LyricsProvider<any>) {
  const result = await provider.getLyrics(REQ);
  expect(Array.isArray(result)).toBe(true);
  console.log("Number of hits:", result.length);
}

jest.setTimeout(15000);

// test("NetEase", () => macro(LyricsProviderSource.netease.build()));
// test("QQ Music", () => macro(LyricsProviderSource.qq.build()));
test("Kugou", () => macro(LyricsProviderSource.kugou.build()));
// test("Xiami", () => macro(LyricsProviderSource.xiami.build()));
// test("Gecimi", () => macro(LyricsProviderSource.gecimi.build()));
test("ViewLyrics", () => macro(LyricsProviderSource.viewLyrics.build()));
test("Syair", () => macro(LyricsProviderSource.syair.build()));
