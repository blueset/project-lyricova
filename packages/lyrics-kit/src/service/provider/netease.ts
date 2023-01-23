import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import { LyricsProviderSource } from "../lyricsProviderSource";
import axios from "axios";
import { TITLE, ARTIST, ALBUM, LRC_BY } from "../../core/idTagKey";
import { id3TagRegex, krcLineRegex, netEaseInlineTagRegex } from "../../utils/regexPattern";
import { WordTimeTag, WordTimeTagLabel, Attachments, TIME_TAG } from "../../core/lyricsLineAttachment";
import { LyricsLine } from "../../core/lyricsLine";
import { NetEaseResponseSong, NetEaseResponseSearchResult } from "../types/netease/searchResult";
import { NetEaseResponseSingleLyrics } from "../types/netease/singleLyrics";

const SEARCH_URL = "http://music.163.com/api/search/pc";
const LYRICS_URL = "http://music.163.com/api/song/lyric";
const headers = {
  Referer: "http://music.163.com/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.3987.132 Safari/537.36",
  Cookie: "NMTID=",
};

class NeteaseKLyrics extends Lyrics {
  constructor(content: string) {
    super();
    const matches = content.matchAll(id3TagRegex);
    for (const match of matches) {
      const key = match[1].trim(), value = match[2].trim();
      if (key && value) {
        this.idTags[key] = value;
      }
    }
    const krcLineMatches = content.matchAll(krcLineRegex);
    const lines = [];
    for (const match of krcLineMatches) {
      const
        timeTagStr = match[1],
        timeTag = parseFloat(timeTagStr) / 1000,
        durationStr = match[2],
        duration = parseFloat(durationStr) / 1000;

      let lineContent = "";
      const attachment = new WordTimeTag(
        [new WordTimeTagLabel(0, 0)], duration
      );
      let dt = 0;
      const inlineTagMatches = match[3].matchAll(netEaseInlineTagRegex);
      for (const m of inlineTagMatches) {
        const timeTagStr = m[1];
        let timeTag = parseFloat(timeTagStr) / 1000;
        let fragment = m[2];
        if (m[3] !== undefined) {
          timeTag += 0.001;
          fragment += " ";
        }
        lineContent += fragment;
        dt += timeTag;
        attachment.tags.push(new WordTimeTagLabel(dt, lineContent.length));
      }

      const att = new Attachments({ [TIME_TAG]: attachment });
      const line = new LyricsLine(lineContent, timeTag, att);
      line.lyrics = this;
      lines.push(line);
    }

    this.metadata.attachmentTags.add(TIME_TAG);

    if (lines.length === 0) {
      throw new Error("Lyrics are empty");
    }

    this.lines = lines;
  }
}

export class NetEaseProvider extends LyricsProvider<NetEaseResponseSong> {
  static source = LyricsProviderSource.netease;

  constructor() {
    super();
  }

  async searchLyrics(request: LyricsSearchRequest): Promise<NetEaseResponseSong[]> {
    try {
      const parameters = {
        s: request.searchTerm.toString(),
        limit: 50,
        type: 1,
      };
      // Use axios to make request
      const outcome = await axios.post<NetEaseResponseSearchResult>(SEARCH_URL, "", {
        params: parameters,
        headers,
      });
      if (outcome.status !== 200) {
        console.error(outcome.data);
        return [];
      }
      console.log(outcome);
      return outcome.data.result.songs || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  public async fetchLyrics(token: NetEaseResponseSong): Promise<Lyrics | undefined> {
    try {
      const parameters = {
        id: token.id,
        lv: 1, kd: 1, tv: -1
      };
      const response = await axios.get<NetEaseResponseSingleLyrics>(LYRICS_URL, {
        params: parameters,
        headers,
      });
      if (response.status !== 200) {
        console.error(response.data);
        return undefined;
      }
      const data = response.data;
      let lyrics: Lyrics = undefined;
      const transLrc = data?.tlyric?.lyric ? new Lyrics(data.tlyric.lyric) : null;
      const kLrc = data?.klyric?.lyric ? new NeteaseKLyrics(data.klyric.lyric) : null;
      if (kLrc) {
        if (transLrc) {
          kLrc.forceMerge(transLrc);
        }
        lyrics = kLrc;
      } else {
        const lrc = data?.lrc?.lyric ? new Lyrics(data.lrc.lyric) : null;
        if (lrc) {
          if (transLrc) {
            lrc.merge(transLrc);
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
      lyrics.metadata.source = LyricsProviderSource.netease;
      lyrics.metadata.artworkURL = token.album.picUrl;
      lyrics.metadata.providerToken = `${token.id}`;

      return lyrics;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}