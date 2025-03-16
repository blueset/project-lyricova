import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { MusixMatchProvider } from "./musixmatch";

const SONG = "初音ミクの消失", ARTIST = "cosMo@暴走P feat. 初音ミク", DURATION = 289.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

describe('MusixMatchProvider', () => {
    it('should search and return lyrics results', async () => {
        const musixmatch = new MusixMatchProvider();

        const result = await musixmatch.getLyrics(REQ);
        expect(Array.isArray(result)).toBeTruthy();
        console.log("Number of hits:", result.length);
        console.log("Hits:", result);
        expect(result.length).toBeGreaterThan(0);
        expect(result.some(i => i.isMatched())).toBeTruthy();
    });
});