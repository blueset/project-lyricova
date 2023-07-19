import axios from "axios";
import { LyricsProvider } from ".";
import { ALBUM, ARTIST, Lyrics, LyricsLine, TITLE } from "../../core";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { SpotifyAuthToken } from "../types/spotify/token";
import {
  SpotifySearchResponse,
  SpotifySearchResult,
} from "../types/spotify/search";
import { SpotifyLyricsJSON } from "../types/spotify/lyrics";
import { LyricsProviderSource } from "../lyricsProviderSource";

const TOKEN_URL = "https://open.spotify.com/get_access_token";
const SEARCH_URL = "https://api-partner.spotify.com/pathfinder/v1/query";
const LYRICS_URL = "https://spotify-lyric-api.herokuapp.com/";

export class SpotifyProvider extends LyricsProvider<SpotifySearchResult> {
  async getTokens(): Promise<string> {
    const res = await axios.get<SpotifyAuthToken>(TOKEN_URL);
    return res.data.accessToken;
  }

  public async searchLyrics(
    request: LyricsSearchRequest
  ): Promise<SpotifySearchResult[]> {
    const token = await this.getTokens();
    const res = await axios.get<SpotifySearchResponse>(SEARCH_URL, {
      params: {
        operationName: "searchTracks",
        variables: JSON.stringify({
          searchTerm: `${request.title} ${request.artist}`,
          offset: 0,
          limit: 10,
          numberOfTopResults: 20,
          includeAudiobooks: false,
        }),
        extensions: JSON.stringify({
          persistedQuery: {
            version: 1,
            sha256Hash:
              "1d021289df50166c61630e02f002ec91182b518e56bcd681ac6b0640390c0245",
          },
        }),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data.data.searchV2.tracksV2.items;
  }
  public async fetchLyrics(
    token: SpotifySearchResult
  ): Promise<Lyrics | undefined> {
    const trackid = token.item.data.id;
    const res = await axios.get<SpotifyLyricsJSON>(LYRICS_URL, {
      params: {
        trackid,
      },
    });

    if (res.data.error) {
      return undefined;
    }

    const lyrics = new Lyrics();
    lyrics.lines = res.data.lines.map(
      (l) => new LyricsLine(l.words, parseFloat(l.startTimeMs) / 1000)
    );
    lyrics.idTags[TITLE] = token.item.data.name;
    lyrics.idTags[ARTIST] = token.item.data.artists.items
      .map((a) => a.profile.name)
      .join(", ");
    lyrics.idTags[ALBUM] = token.item.data.albumOfTrack.name;
    lyrics.metadata.providerToken = trackid;
    lyrics.metadata.source = LyricsProviderSource.spotify;
    lyrics.length = token.item.data.duration.totalMilliseconds / 1000;
    if (token.item.data.albumOfTrack.coverArt.sources.length > 0) {
      let maxSize = 0,
        url = "";
      for (const source of token.item.data.albumOfTrack.coverArt.sources) {
        if (source.height > maxSize) {
          maxSize = source.height;
          url = source.url;
        }
      }
      lyrics.metadata.artworkURL = url;
    }
    return lyrics;
  }
}
