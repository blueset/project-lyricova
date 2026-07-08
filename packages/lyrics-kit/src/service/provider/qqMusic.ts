import { LyricsProvider } from "./index.js";
import type { LyricsSearchRequest } from "../lyricsSearchRequest.js";
import { Lyrics } from "../../core/lyrics.js";
import axios from "axios";
import axiosJsonp from "../../utils/axiosJsonp.js";
import _ from "lodash";
import { TITLE, ARTIST, ALBUM } from "../../core/idTagKey.js";
import { LyricsProviderSourceId } from "../lyricsProviderSourceId.js";
import type {
  QQSongItem,
  QQResponseSearchResult,
} from "../types/qqMusic/searchResult.js";
import type { QQResponseSinglePlainLyrics } from "../types/qqMusic/singleLyrics.js";
import type { Range } from "../../core/lyricsLineAttachment.js";
import {
  Attachments,
  FURIGANA,
  RangeAttribute,
  TIME_TAG,
  WordTimeTag,
  WordTimeTagLabel,
} from "../../core/lyricsLineAttachment.js";
import { URLSearchParams } from "url";
import cheerio from "cheerio";
import { decodeQrc } from "./helpers/qqMusic/decoder.js";
import { LyricsLine } from "../../core/index.js";

const SEARCH_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";
const LYRICS_URL = "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg";
const DETAILED_LYRICS_URL =
  "https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg";
const MUSICU_CLIENT_VERSION = "1003006";
const headers = {
  Cookie:
    "os=pc;osver=Microsoft-Windows-10-Professional-build-16299.125-64bit;appver=2.0.3.131777;channel=netease;__remember_me=true",
  Referer: "https://c.y.qq.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36",
};
const musicuHeaders = {
  Cookie: "tmeLoginType=-1;",
  "content-type": "application/json",
  "accept-encoding": "gzip",
  "User-Agent": "okhttp/3.14.9",
};

const timeTagPattern = /^\[(\d+),(\d+)\](.*)/;

type QQMusicuComm = Record<string, number | string>;

interface QQMusicuResponse<T> {
  code: number;
  request: {
    code: number;
    data: T;
  };
}

interface QQMusicuSessionData {
  session: {
    uid: number | string;
    sid: string;
    userip: string;
  };
}

interface QQLiteSongItem {
  title: string;
  id: number;
  mid: string;
  interval: number;
  singer: {
    title?: string;
    name?: string;
  }[];
  album?: {
    title?: string;
    name?: string;
  };
}

interface QQMusicuSearchData {
  body: {
    item_song: QQLiteSongItem[];
  };
}

interface QQMusicuPlayLyricData {
  lyric?: string;
  trans?: string;
  roma?: string;
  lrc_t?: number | string;
  qrc_t?: number | string;
  trans_t?: number | string;
  roma_t?: number | string;
}

function encodeBase64(value: string): string {
  return Buffer.from(value).toString("base64");
}

function hasValidLyricTimestamp(value: number | string | undefined): boolean {
  return value !== undefined && value !== 0 && value !== "0";
}

function makeSearchId(): string {
  return `${
    (Math.floor(Math.random() * 20) + 1) * 18014398509481984 +
    Math.floor(Math.random() * 4194304) * 4294967296 +
    (Date.now() % 86400000)
  }`;
}

function stripSearchHighlights(value: string | undefined): string {
  return (value || "").replace(/<[^>]+>/g, "");
}

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
      if (!timeTag) throw new Error("Malformed lyrics line");
      const start = parseInt(timeTag[1]);
      const duration = parseInt(timeTag[2]);
      return [start, duration, timeTag[3]];
    });
    const lineObjs: LyricsLine[] = [];

    lines.forEach(([start, duration, line], idx) => {
      let lineContent = "";
      const attachment = new WordTimeTag([], duration / 1000);
      const segments = line.split(/([\[\(]\d+,\d+[\]\)])/g);
      let hasWordTimeTags = false;
      segments.forEach((segment, idx) => {
        const match = segment.match(/[\[\(](\d+),(\d+)[\]\)]/);
        if (match) {
          hasWordTimeTags = true;
          const time = parseInt(match[1]);
          const dt = (time - start) / 1000;
          attachment.tags.push(new WordTimeTagLabel(dt, lineContent.length));
          lineContent += segments[idx - 1];
        }
      });
      if (!hasWordTimeTags) {
        lineContent = line;
      }
      attachment.tags.push(
        new WordTimeTagLabel(duration / 1000, lineContent.length),
      );

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

  private comm: QQMusicuComm = {
    ct: 11,
    cv: MUSICU_CLIENT_VERSION,
    v: MUSICU_CLIENT_VERSION,
    os_ver: "15",
    phonetype: "24122RKC7C",
    rom: `Redmi/miro/miro:15/AE3A.240806.005/OS2.0.10${
      ["5", "4", "2"][Math.floor(Math.random() * 3)]
    }.0.VOMCNXM:user/release-keys`,
    tmeAppID: "qqmusiclight",
    nettype: "NETWORK_WIFI",
    udid: "0",
  };
  private musicuInited = false;
  private musicuSessionPromise?: Promise<void>;

  private async initMusicuSession(): Promise<void> {
    if (this.musicuInited) return;

    if (!this.musicuSessionPromise) {
      this.musicuSessionPromise = this.musicuRequest<QQMusicuSessionData>(
        "GetSession",
        "music.getSession.session",
        { caller: 0, uid: "0", vkey: 0 },
        false,
      ).then((data) => {
        this.comm = {
          ...this.comm,
          uid: data.session.uid,
          sid: data.session.sid,
          userip: data.session.userip,
        };
        this.musicuInited = true;
      });
    }

    try {
      await this.musicuSessionPromise;
    } catch (e) {
      this.musicuSessionPromise = undefined;
      throw e;
    }
  }

  private async musicuRequest<T>(
    method: string,
    module: string,
    param: Record<string, unknown>,
    initSession = true,
  ): Promise<T> {
    if (initSession) {
      await this.initMusicuSession();
    }

    const response = await axios.post<QQMusicuResponse<T>>(
      SEARCH_URL,
      {
        comm: this.comm,
        request: {
          method,
          module,
          param,
        },
      },
      {
        headers: musicuHeaders,
      },
    );
    if (response.status !== 200) {
      throw new Error(`QQ Music request failed with HTTP ${response.status}`);
    }

    const data = response.data;
    if (data.code !== 0 || data.request.code !== 0) {
      throw new Error(
        `QQ Music API request failed with code ${data.code !== 0 ? data.code : data.request.code}`,
      );
    }
    return data.request.data;
  }

  private applyTokenMetadata(lrc: Lyrics, token: QQSongItem): void {
    lrc.idTags[TITLE] = token.title;
    if (token.singer.length > 0)
      lrc.idTags[ARTIST] = token.singer.map((s) => s.title).join(", ");
    lrc.idTags[ALBUM] = token.album?.title;

    lrc.length = token.interval;
    lrc.metadata.source = LyricsProviderSourceId.qq;
    lrc.metadata.providerToken = `${token.mid}`;
    if (token.mid) {
      const id = parseInt(token.mid);
      lrc.metadata.artworkURL = `http://imgcache.qq.com/music/photo/album/${id % 100}/${id}.jpg`;
    }
  }

  private parseQqLyrics(content: string): Lyrics {
    const $ = cheerio.load(content, { xmlMode: true });
    const lyricContent = $("Lyric_1").attr("LyricContent") || content;
    if (lyricContent.split("\n").some((line) => line.match(timeTagPattern))) {
      return new QQMusicQLyrics(lyricContent);
    }
    return new Lyrics(lyricContent);
  }

  private async searchLyricsLegacy(
    request: LyricsSearchRequest,
  ): Promise<QQSongItem[]> {
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
      },
    );
    if (response.status !== 200) {
      console.error(response.data);
      return [];
    }
    return response.data.req_1.data.body.song.list;
  }

  private normalizeSearchResult(song: QQLiteSongItem): QQSongItem {
    return {
      title: stripSearchHighlights(song.title),
      id: song.id,
      mid: song.mid,
      interval: song.interval,
      singer: song.singer.map((singer) => ({
        title: stripSearchHighlights(singer.title || singer.name),
      })),
      album: {
        title: stripSearchHighlights(song.album?.title || song.album?.name),
      },
    };
  }

  public async searchLyrics(
    request: LyricsSearchRequest,
  ): Promise<QQSongItem[]> {
    try {
      const data = await this.musicuRequest<QQMusicuSearchData>(
        "DoSearchForQQMusicLite",
        "music.search.SearchCgiService",
        {
          search_id: makeSearchId(),
          remoteplace: "search.android.keyboard",
          query: request.searchTerm.toString(),
          search_type: 0,
          num_per_page: 20,
          page_num: 1,
          highlight: 0,
          nqc_flag: 0,
          page_id: 1,
          grp: 1,
        },
      );
      return data.body.item_song.map((song) =>
        this.normalizeSearchResult(song),
      );
    } catch {
      try {
        return await this.searchLyricsLegacy(request);
      } catch (e) {
        console.error(e);
        return [];
      }
    }
  }
  public async fetchLyrics(token: QQSongItem): Promise<Lyrics | undefined> {
    return (
      (await this.fetchLyricsQrc(token)) ||
      (await this.fetchLyricsLegacyQrc(token)) ||
      (await this.fetchLyricsLrc(token))
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
          axiosJsonp,
        ),
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
        transLrc.lines.forEach((line) => {
          if (line.content.trim() === "//") {
            line.content = "";
          }
        });
        lrc.mergeByProximity(transLrc, "zh");
      }

      this.applyTokenMetadata(lrc, token);
      return lrc;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async fetchLyricsQrc(token: QQSongItem): Promise<Lyrics | undefined> {
    try {
      const artist = token.singer.map((s) => s.title).join(", ");
      const data = await this.musicuRequest<QQMusicuPlayLyricData>(
        "GetPlayLyricInfo",
        "music.musichallSong.PlayLyricInfo",
        {
          albumName: encodeBase64(token.album?.title || ""),
          crypt: 1,
          ct: 19,
          cv: 2111,
          interval: token.interval,
          lrc_t: 0,
          qrc: 1,
          qrc_t: 0,
          roma: 1,
          roma_t: 0,
          singerName: encodeBase64(artist),
          songID: token.id,
          songName: encodeBase64(token.title),
          trans: 1,
          trans_t: 0,
          type: 0,
        },
      );

      const lyricTimestamp = hasValidLyricTimestamp(data.qrc_t)
        ? data.qrc_t
        : data.lrc_t;
      if (!data.lyric || !hasValidLyricTimestamp(lyricTimestamp)) {
        throw new Error("lyric is empty");
      }

      const lrc = this.parseQqLyrics(decodeQrc(data.lyric));
      this.applyTokenMetadata(lrc, token);

      if (data.trans && hasValidLyricTimestamp(data.trans_t)) {
        const transLrc = this.parseQqLyrics(decodeQrc(data.trans));
        transLrc.lines.forEach((line) => {
          if (line.content.trim() === "//") {
            line.content = "";
          }
        });
        lrc.mergeByProximity(transLrc, "zh");

        if (transLrc.idTags.kana) {
          this.applyFurigana(lrc, transLrc.idTags.kana);
        }
      }

      return lrc;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async fetchLyricsLegacyQrc(token: QQSongItem): Promise<Lyrics | undefined> {
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
        },
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
      const lyrics = $("lyric");
      for (const lyricEntry of lyrics) {
        // let content = getChildElementCDATA(lyricEntry, 'content');
        const contentHex = $(lyricEntry).find("content")?.text();
        const contentHexTs = $(lyricEntry).find("contentts")?.text();

        const contentXml = decodeQrc(contentHex);
        $ = cheerio.load(contentXml, { xmlMode: true });
        const content = $("Lyric_1").attr("LyricContent");
        const lrc = new QQMusicQLyrics(content ?? "");
        this.applyTokenMetadata(lrc, token);

        if (contentHexTs) {
          const transLrcContent = decodeQrc(contentHexTs);
          const transLrc = new Lyrics(transLrcContent);
          transLrc.lines.forEach((line) => {
            if (line.content.trim() === "//") {
              line.content = "";
            }
          });
          lrc.mergeByProximity(transLrc, "zh");

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
          ...line.content.matchAll(/(\p{Script=Han}|[０-９0-9]+)/gu),
        ];
        const furigana: [string, Range][] = [];

        while (kanjis.length > 0 && furiganaReplacements.length > 0) {
          const rep = furiganaReplacements.shift();
          if (!rep) break;
          let count = parseInt(rep[1]);
          const content = rep[2];

          let startIndex = Infinity,
            endIndex = -Infinity;

          while (count > 0 && kanjis.length > 0) {
            count--;
            const kanji = kanjis.shift();
            if (!kanji) break;
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
