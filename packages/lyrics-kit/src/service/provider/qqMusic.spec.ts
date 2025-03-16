import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { QQMusicProvider } from "./qqMusic";

const SONG = "初音ミクの消失",
  ARTIST = "初音ミク",
  DURATION = 290.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

describe('QQMusicProvider', () => {
  it('should search and return lyrics results', async () => {
    const qqMusic = new QQMusicProvider();
    const result = await qqMusic.getLyrics(REQ);
    expect(Array.isArray(result)).toBeTruthy();
    console.log("Number of hits:", result.length);
    console.log("Hits:", result);
    console.log("Item 0:", result[0].toString());
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(i => i.isMatched())).toBeTruthy();
  });
});
