import axios from "axios";
import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { LrcLibSearchResult } from "../types/lrclib/LrcLibSearchResult";
import { ALBUM, ARTIST, Lyrics, TITLE } from "../../core";
import { LyricsProviderSource } from "../lyricsProviderSource";

const SEARCH_URL = "https://lrclib.net/api/search";
const FETCH_URL = "https://lrclib.net/api/get/";

export class LrcLibLyricsProvider extends LyricsProvider<LrcLibSearchResult> {
  public async searchLyrics(
    request: LyricsSearchRequest
  ): Promise<LrcLibSearchResult[]> {
    let parameters;
    if (request.searchTerm.state === "info") {
      const { title, artist } = request.searchTerm;
      parameters = {
        track_name: title,
        artist_name: artist,
      };
    } else if (request.searchTerm.state === "keyword") {
      parameters = {
        q: request.searchTerm.keyword,
      };
    }

    try {
      const response = await axios.get<LrcLibSearchResult[]>(SEARCH_URL, {
        params: parameters,
        headers: {
          "User-Agent":
            "lyrics-kit (https://github.com/blueset/project-lyricova)",
        },
      });
      if (response.status !== 200) {
        console.error(response.data);
        return [];
      }
      const data = response.data;
      if (!data || !Array.isArray(data)) {
        console.error("Invalid response data:", data);
        return [];
      }
      return data.filter((i) => i.syncedLyrics);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  public async fetchLyrics(
    token: LrcLibSearchResult
  ): Promise<Lyrics | undefined> {
    try {
      const lyrics = new Lyrics(token.syncedLyrics);
      lyrics.metadata.source = LyricsProviderSource.LrcLib;
      lyrics.metadata.remoteURL = FETCH_URL + token.id;
      if (token.duration) {
        lyrics.length = token.duration;
      }
      lyrics.metadata.providerToken = `${token.id}`;
      if (token.trackName) lyrics.idTags[TITLE] = token.trackName;
      if (token.artistName) lyrics.idTags[ARTIST] = token.artistName;
      if (token.albumName) lyrics.idTags[ALBUM] = token.albumName;
      return lyrics;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
