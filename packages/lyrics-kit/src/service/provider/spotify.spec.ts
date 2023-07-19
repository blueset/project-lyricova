import test from "ava";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { SpotifyProvider } from "./spotify";

const SONG = "マシンガンポエムドール",
  ARTIST = "cosMo@暴走P",
  DURATION = 140.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);
test("spotify test", async (t) => {
  t.timeout(15000);
  const spotifyProvider = new SpotifyProvider();

  const result = await spotifyProvider.getLyrics(REQ);
  t.assert(Array.isArray(result));
  t.log("Number of hits:", result.length);
  t.log("Hits:", result);
  t.assert(result.length > 0);
  t.assert(
    result
      .map((i) => i.isMatched())
      .reduce((prev: boolean, curr: boolean): boolean => {
        return prev || curr;
      }, false)
  );
});
