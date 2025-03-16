import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { YouTubeProvider } from "./youtube";

const SONG = "初音ミクの消失", ARTIST = "cosMo@暴走P feat. 初音ミク", DURATION = 289.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

describe('YouTubeProvider', () => {
    it('should search and return lyrics results', async () => {
        const YouTube = new YouTubeProvider();

        const result = await YouTube.getLyrics(REQ);
        expect(Array.isArray(result)).toBeTruthy();
        console.log("Number of hits:", result.length);
        console.log("Hits:", result);
        result.forEach(v => console.log("Entry:", v.toString()));
        expect(result.length).toBeGreaterThan(0);
        expect(result.some(i => i.isMatched())).toBeTruthy();
    });
});