import test from "ava";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { SongleProvider } from "./songle";

// const SONG = "マシンガンポエムドール",
//   ARTIST = "cosMo@暴走P",
//   DURATION = 140.0;
const SONG = "初音ミクの消失", ARTIST = "初音ミク", DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);
test("songle test", async (t) => {
  t.timeout(15000);
  const songleProvider = new SongleProvider();

  const result = await songleProvider.getLyrics(REQ);
  t.assert(Array.isArray(result));
  t.log("Number of hits:", result.length);
  t.log("Hits:", result);
  t.log("First hit:", result[0].toString());
  t.assert(result.length > 0);
  t.assert(
    result
      .map((i) => i.isMatched())
      .reduce((prev: boolean, curr: boolean): boolean => {
        return prev || curr;
      }, false)
  );
});
