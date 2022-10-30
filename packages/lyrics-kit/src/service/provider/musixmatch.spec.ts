import test from "ava";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { MusixMatchProvider } from "./musixmatch";

const SONG = "初音ミクの消失", ARTIST = "cosMo@暴走P feat. 初音ミク", DURATION = 289.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);
test("musixmatch test", async t => {
    t.timeout(15000);
    const musixmatch = new MusixMatchProvider();

    const result = await musixmatch.getLyrics(REQ);
    t.assert(Array.isArray(result));
    t.log("Number of hits:", result.length);
    t.log("Hits:", result);
    t.assert(result.length > 0);
    t.assert(result.map(i => i.isMatched()).reduce(
        (prev: boolean, curr: boolean): boolean => { 
            return prev || curr; 
        },
        false)
    );
});