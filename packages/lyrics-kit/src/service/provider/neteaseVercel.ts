import axios from "axios";
import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { ALBUM, ARTIST, LRC_BY, Lyrics, TITLE } from "../../core";
import {
  NetEaseResponseSearchResult,
  NetEaseResponseSong,
} from "../types/netease/searchResult";
import { LyricsProviderSource } from "../lyricsProviderSource";
import { NetEaseResponseSingleLyrics } from "../types/netease/singleLyrics";
import { NeteaseKLyrics, NeteaseYLyrics } from "./netease";

const SEARCH_URL = "https://neteasecloudmusicapi-ten-wine.vercel.app/search";
const FETCH_URL = "https://neteasecloudmusicapi-ten-wine.vercel.app/lyric/new";

export class NetEaseVercelProvider extends LyricsProvider<NetEaseResponseSong> {
  public async searchLyrics(
    request: LyricsSearchRequest
  ): Promise<NetEaseResponseSong[]> {
    let parameters;
    if (request.searchTerm.state === "info") {
      const { title, artist } = request.searchTerm;
      parameters = {
        keywords: `${title} ${artist}`,
        limit: 10,
      };
    } else if (request.searchTerm.state === "keyword") {
      parameters = {
        keywords: request.searchTerm.keyword,
        limit: 10,
      };
    }

    try {
      const response = await axios.get<NetEaseResponseSearchResult>(
        SEARCH_URL,
        {
          params: parameters,
        }
      );
      if (response.status !== 200) {
        console.error(response.data);
        return [];
      }
      if (response.status !== 200) {
        console.error(response.data);
        return [];
      }
      return response.data.result.songs || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  public async fetchLyrics(
    token: NetEaseResponseSong
  ): Promise<Lyrics | undefined> {
    try {
      const response = await axios.get<NetEaseResponseSingleLyrics>(FETCH_URL, {
        params: { id: token.id },
      });
      if (response.status !== 200) {
        console.error(response.data);
        return undefined;
      }
      const data = response.data;
      let lyrics: Lyrics = undefined;
      const transLrc = data?.tlyric?.lyric
        ? new Lyrics(data.tlyric.lyric)
        : null;
      const kLrc = data?.klyric?.lyric
        ? new NeteaseKLyrics(data.klyric.lyric)
        : null;
      const yLrc = data?.yrc?.lyric ? new NeteaseYLyrics(data.yrc.lyric) : null;
      if (yLrc) {
        if (transLrc) {
          yLrc.forceMerge(transLrc, "zh");
        }
        lyrics = yLrc;
      } else if (kLrc) {
        if (transLrc) {
          kLrc.forceMerge(transLrc, "zh");
        }
        lyrics = kLrc;
      } else {
        const lrc = data?.lrc?.lyric ? new Lyrics(data.lrc.lyric) : null;
        if (lrc) {
          if (transLrc) {
            lrc.merge(transLrc, "zh");
          }
          lyrics = lrc;
        } else {
          return undefined;
        }
      }

      lyrics.idTags[TITLE] = token.name;
      if (token.artists.length > 0) {
        lyrics.idTags[ARTIST] = token.artists[0].name;
      }
      lyrics.idTags[ALBUM] = token.album.name;
      lyrics.idTags[LRC_BY] = data.lyricUser?.nickname;

      lyrics.length = token.duration / 1000;
      lyrics.metadata.source = LyricsProviderSource.neteaseVercel;
      lyrics.metadata.artworkURL = token.album.picUrl;
      lyrics.metadata.providerToken = `${token.id}`;

      return lyrics;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}
