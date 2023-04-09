import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { Lyrics } from "../../core/lyrics";
import axios from "axios";
import axiosJsonp from "../../utils/axiosJsonp";
import _ from "lodash";
import { TITLE, ARTIST, ALBUM } from "../../core/idTagKey";
import { LyricsProviderSource } from "../lyricsProviderSource";
import {
  QQSongItem,
  QQResponseSearchResult,
} from "../types/qqMusic/searchResult";
import { QQResponseSinglePlainLyrics } from "../types/qqMusic/singleLyrics";
import {
  Attachments,
  FURIGANA,
  Range,
  RangeAttribute,
  TIME_TAG,
  WordTimeTag,
  WordTimeTagLabel,
} from "../../core/lyricsLineAttachment";
import { URLSearchParams } from "url";
import cheerio from "cheerio";
import { decodeQrc } from "./helpers/qqMusic/decoder";
import { LyricsLine } from "../../core";

const SEARCH_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
const LYRICS_URL = "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg";
const DETAILED_LYRICS_URL =
  "https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg ";
const headers = {
  Cookie:
    "os=pc;osver=Microsoft-Windows-10-Professional-build-16299.125-64bit;appver=2.0.3.131777;channel=netease;__remember_me=true",
  Referer: "https://c.y.qq.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36",
};

const timeTagPattern = /^\[(\d+),(\d+)\]/;

class QQMusicQLyrics extends Lyrics {
  constructor(content: string) {
    super();
    const linesString = content
      .split("\n")
      .filter((l) => l.match(timeTagPattern));

    if (linesString.length === 0) {
      throw new Error("Lyrics are empty");
    }

    const lines = linesString.map<[number, number, string]>((line) => {
      const timeTag = line.match(timeTagPattern);
      const start = parseInt(timeTag[1]);
      const duration = parseInt(timeTag[2]);
      return [start, duration, line];
    });
    const lineObjs = [];

    lines.forEach(([start, duration, line], idx) => {
      let lineContent = "";
      const attachment = new WordTimeTag([], duration);
      line.split(/([\[\(]\d+,\d+[\]\)])/g).forEach((segment) => {
        const match = segment.match(/[\[\(](\d+),(\d+)[\]\)]/);
        if (match) {
          const time = parseInt(match[1]);
          const dt = (time - start) / 1000;
          attachment.tags.push(new WordTimeTagLabel(dt, lineContent.length));
        } else {
          lineContent += segment;
        }
      });

      const att = new Attachments({ [TIME_TAG]: attachment });
      const lineObj = new LyricsLine(lineContent, start / 1000, att);
      lineObj.lyrics = this;

      lineObjs.push(lineObj);

      if (
        idx == lines.length - 1 ||
        lines[idx + 1][0] - start - duration > 500
      ) {
        const blankLine = new LyricsLine("", (start + duration) / 1000);
        blankLine.lyrics = this;
        lineObjs.push(blankLine);
      }
    });

    this.metadata.attachmentTags.add(TIME_TAG);
    this.lines = lineObjs;
  }
}

function decodeLyrics(base64: string): string {
  return _.unescape(Buffer.from(base64, "base64").toString());
}

export class QQMusicProvider extends LyricsProvider<QQSongItem> {
  // static source = LyricsProviderSource.qq;

  public async searchLyrics(
    request: LyricsSearchRequest
  ): Promise<QQSongItem[]> {
    try {
      const response = await axios.post<QQResponseSearchResult>(
        SEARCH_URL,
        {
          req_1: {
            method: "DoSearchForQQMusicDesktop",
            module: "music.search.SearchCgiService",
            param: {
              num_per_page: "20",
              page_num: "1",
              query: request.searchTerm.toString(),
              search_type: 0,
            },
          },
        },
        {
          headers,
        }
      );
      if (response.status !== 200) {
        console.error(response.data);
        return [];
      }
      const data = response.data;
      return data.req_1.data.body.song.list;
      // return data.req_1.data.body.song.list.slice(0, 2);
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  public async fetchLyrics(token: QQSongItem): Promise<Lyrics | undefined> {
    return (
      (await this.fetchLyricsQrc(token)) || (await this.fetchLyricsLrc(token))
    );
  }

  async fetchLyricsLrc(token: QQSongItem): Promise<Lyrics | undefined> {
    try {
      const payload = new URLSearchParams({
        callback: "MusicJsonCallback_lrc",
        pcachetime: new Date().getTime().toString(),
        songmid: token.mid,
        g_tk: "5381",
        jsonpCallback: "MusicJsonCallback_lrc",
        loginUin: "0",
        hostUin: "0",
        format: "jsonp",
        inCharset: "utf8",
        outCharset: "utf8",
        notice: "0",
        platform: "yqq",
        needNewCode: "0",
      });
      const response = await axios.post<QQResponseSinglePlainLyrics>(
        LYRICS_URL,
        payload.toString(),
        _.defaults(
          {
            headers: {
              ...headers,
              "content-type": "application/x-www-form-urlencoded",
            },
          },
          axiosJsonp
        )
      );

      if (response.status !== 200) {
        console.error(response.data);
        return undefined;
      }
      const data = response.data;
      const lrcContent = data.lyric ? decodeLyrics(data.lyric) : null;
      if (!lrcContent) {
        throw new Error("lyric is empty");
      }
      const lrc = new Lyrics(lrcContent);

      const transLrcContent = data.trans ? decodeLyrics(data.trans) : null;
      if (transLrcContent) {
        const transLrc = new Lyrics(transLrcContent);
        lrc.merge(transLrc);
      }

      lrc.idTags[TITLE] = token.title;
      if (token.singer.length > 0)
        lrc.idTags[ARTIST] = token.singer.map((s) => s.title).join(", ");
      lrc.idTags[ALBUM] = token.album?.title;

      lrc.length = token.interval;
      lrc.metadata.source = LyricsProviderSource.qq;
      lrc.metadata.providerToken = `${token.mid}`;
      if (token.mid) {
        const id = parseInt(token.mid);
        lrc.metadata.artworkURL = `http://imgcache.qq.com/music/photo/album/${id %
          100}/${id}.jpg`;
      }
      return lrc;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async fetchLyricsQrc(token: QQSongItem): Promise<Lyrics | undefined> {
    try {
      const payload = new URLSearchParams({
        version: "15",
        miniversion: "82",
        lrctype: "4",
        musicid: token.id.toString(),
      });
      const response = await axios.post<string>(
        DETAILED_LYRICS_URL,
        payload.toString(),
        {
          headers: {
            ...headers,
            "content-type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.status !== 200) {
        console.error(response.data);
        return undefined;
      }

      const xml = response.data
        .replace("<!--", "")
        .replace("-->", "")
        .replace(/<miniversion.*\/>/, "")
        .trim();

      let $ = cheerio.load(xml, { xmlMode: true });
      const lyrics = $("lyric") || [];
      for (const lyricEntry of lyrics) {
        // let content = getChildElementCDATA(lyricEntry, 'content');
        const contentHex = $(lyricEntry)
          .find("content")
          ?.text();
        const contentHexTs = $(lyricEntry)
          .find("contentts")
          ?.text();

        const contentXml = decodeQrc(contentHex);
        $ = cheerio.load(contentXml, { xmlMode: true });
        const content = $("Lyric_1").attr("LyricContent");
        const lrc = new QQMusicQLyrics(content);

        lrc.idTags[TITLE] = token.title;
        if (token.singer.length > 0)
          lrc.idTags[ARTIST] = token.singer.map((s) => s.title).join(", ");
        lrc.idTags[ALBUM] = token.album?.title;

        lrc.length = token.interval;
        lrc.metadata.source = LyricsProviderSource.qq;
        lrc.metadata.providerToken = `${token.mid}`;
        if (token.mid) {
          const id = parseInt(token.mid);
          lrc.metadata.artworkURL = `http://imgcache.qq.com/music/photo/album/${id %
            100}/${id}.jpg`;
        }

        if (contentHexTs) {
          const transLrcContent = decodeQrc(contentHexTs);
          const transLrc = new Lyrics(transLrcContent);
          lrc.merge(transLrc);

          if (transLrc.idTags.kana) {
            this.applyFurigana(lrc, transLrc.idTags.kana);
          }
        }

        return lrc;
      }
      return undefined;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  applyFurigana(lrc: Lyrics, kana: string): void {
    // Apply Furigana
    if (kana) {
      const furiganaReplacements = [...kana.matchAll(/(\d)(\D*)/g)];
      for (const line of lrc.lines) {
        if (furiganaReplacements.length < 1) break;

        // Matches either single kanji or a group of full-width digits together.
        const kanjis = [
          ...line.content.matchAll(/(\p{Script=Han}|[０-９]+)/gu),
        ];
        const furigana: [string, Range][] = [];

        while (kanjis.length > 0 && furiganaReplacements.length > 0) {
          const rep = furiganaReplacements.shift();
          let count = parseInt(rep[1]);
          const content = rep[2];

          let startIndex = Infinity,
            endIndex = -Infinity;

          while (count > 0 && kanjis.length > 0) {
            count--;
            const kanji = kanjis.shift();
            startIndex = Math.min(startIndex, kanji.index);
            endIndex = Math.max(endIndex, kanji.index + kanji[0].length);
          }

          if (content.length < 1) continue;
          furigana.push([content, [startIndex, endIndex]]);
        }

        if (furigana.length > 0) {
          line.attachments.content[FURIGANA] = new RangeAttribute(furigana);
        }
      }
    }
  }
}
