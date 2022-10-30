import test, { ExecutionContext } from "ava";
import { LyricsProviderSource } from "./lyricsProviderSource";
import { LyricsProvider } from "./provider";
import { LyricsSearchRequest } from "./lyricsSearchRequest";

const SONG = "初音ミクの消失", ARTIST = "初音ミク", DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function macro(t: ExecutionContext, provider: LyricsProvider<any>) {
    t.timeout(15000);
    const result = await provider.getLyrics(REQ);
    t.assert(Array.isArray(result));
    t.log("Number of hits:", result.length);
}

// test("NetEase", macro, LyricsProviderSource.netease.build());
// test("QQ Music", macro, LyricsProviderSource.qq.build());
test("Kugou", macro, LyricsProviderSource.kugou.build());
// test("Xiami", macro, LyricsProviderSource.xiami.build());
// test("Gecimi", macro, LyricsProviderSource.gecimi.build());
test("ViewLyrics", macro, LyricsProviderSource.viewLyrics.build());
test("Syair", macro, LyricsProviderSource.syair.build());
test("Marumaru", macro, LyricsProviderSource.marumaru.build());