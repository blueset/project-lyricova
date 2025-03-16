import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { SpotifyProvider } from "./spotify";

const SONG = "マシンガンポエムドール",
  ARTIST = "cosMo@暴走P",
  DURATION = 140.0;
const REQ = LyricsSearchRequest.fromInfo(SONG, ARTIST, DURATION);

describe('SpotifyProvider', () => {
  it('should search and return lyrics results', async () => {
    const spotifyProvider = new SpotifyProvider();

    const result = await spotifyProvider.getLyrics(REQ);
    expect(Array.isArray(result)).toBeTruthy();
    console.log("Number of hits:", result.length);
    console.log("Hits:", result);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(i => i.isMatched())).toBeTruthy();
  });
});
