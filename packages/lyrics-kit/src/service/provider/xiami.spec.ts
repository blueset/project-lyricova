import test from "ava";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { XiamiProvider } from "./xiami";


const SONG = "初音ミクの消失", ARTIST = "初音ミク", DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);
test("xiami test", async t => {
    t.timeout(15000);
    const xiami = new XiamiProvider();

    const result = await xiami.getLyrics(REQ);
    t.assert(Array.isArray(result));
    t.log("Number of hits:", result.length);
    t.log("Hits:", result);
    t.assert(result.length > 0);
});