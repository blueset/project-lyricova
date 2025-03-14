import test from "ava";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { NetEaseVercelProvider } from "./neteaseVercel";

const SONG = "初音ミクの消失", ARTIST = "初音ミク", DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);
test("neteaseVercel test", async t => {
  t.timeout(15000);
  const netEaseVercelProvider = new NetEaseVercelProvider();

  const result = await netEaseVercelProvider.getLyrics(REQ);
  t.assert(Array.isArray(result));
  t.log("Number of hits:", result.length);
  t.log("Hits:", result);
  t.log("Item 0;", result[0].toString());
  t.assert(result.length > 0);
  t.assert(result.map(i => i.isMatched()).reduce(
    (prev: boolean, curr: boolean): boolean => {
      return prev || curr;
    },
    false)
  );
});