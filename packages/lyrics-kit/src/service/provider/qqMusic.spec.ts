// import test from "ava";
// import { LyricsSearchRequest } from "../lyricsSearchRequest";
// import { QQMusicProvider } from "./qqMusic";
//
//
// const SONG = "初音ミクの消失", ARTIST = "初音ミク", DURATION = 290.0;
// const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);
// test("qqMusic test", async t => {
//     t.timeout(15000);
//     const qqMusic = new QQMusicProvider();
//
//     const result = await qqMusic.getLyrics(REQ);
//     t.assert(Array.isArray(result));
//     t.log("Number of hits:", result.length);
//     t.log("Hits:", result);
//     t.assert(result.length > 0);
//     t.assert(result.map(i => i.isMatched()).reduce(
//         (prev: boolean, curr: boolean): boolean => {
//             return prev || curr;
//         },
//         false)
//     );
// });