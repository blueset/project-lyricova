import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { KugouProvider } from "./kugou";

const SONG = "初音ミクの消失", ARTIST = "初音ミク", DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

describe('KugouProvider', () => {
    it('should search and return lyrics results', async () => {
        const kugou = new KugouProvider();

        const result = await kugou.getLyrics(REQ);
        expect(Array.isArray(result)).toBeTruthy();
        console.log("Number of hits:", result.length);
        console.log("Hits:", result);
        expect(result.length).toBeGreaterThan(0);
        expect(result.some(i => i.isMatched())).toBeTruthy();
    });
});