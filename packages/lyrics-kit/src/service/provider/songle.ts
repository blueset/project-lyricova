import axios from "axios";
import { LyricsProvider } from ".";
import { LyricsSearchRequest } from "../lyricsSearchRequest";
import { SongleResponseLyricsList, SongleResponseSearch, SongleResponseSearchResult } from "../types/songle/searchResult";
import { SongleError, SongleLicenseResponse, SongleLyricsObject, SongleTimeTagData } from "../types/songle/lyricsResult";
import { ARTIST, Attachments, Lyrics, LyricsLine, TIME_TAG, TITLE, WordTimeTag, WordTimeTagLabel } from "../../core";
import { LyricsProviderSource } from "../lyricsProviderSource";
import cheerio, { Element } from "cheerio";

const CHORD_PROGRESSION_REGEXP = new RegExp(
  "\\b([CDEFGAB](?:b|bb)*(?:#|##|sus|maj|min|aug|m|M)*[\\d/]*(?:[CDEFGAB](?:b|bb)*(?:#|##|sus|maj|min|aug|m|M)*[\\d/]*)*\\-){2}"
);

type ScraperOptions = Partial<{
  noFormat: boolean;
}>;

/** @url https://songle.jp/lyric_parsers/98.js */
class SongleLyricsScraper {

  private parseFn: (data: any, options?: ScraperOptions) => string;
  private cache: {[url: string]: string} = {};

  private async get(url: string, format?: string) {
    if (typeof format === "undefined") {
      format = "text";
    }
    if (!url) throw new Error("url is required");
    const response = await axios.get(url);
    if (format.toLowerCase() === "json") {
      return {data: response.data, status: response.status};
    } else {
      return {data: response.data.toString(), status: response.status};
    }
  }

  public async url2Lyric(url: string, options: ScraperOptions = {}) {
    if (this.cache[url]) {
      return this.cache[url];
    }

    let restQuery: string, format: string, matched: RegExpMatchArray;

    if (url.match(/atwiki/)) {
      format = "html";
      url = url.replace(/^http:/, "https:");
      restQuery = url;
      this.parseFn = this.parseAtwiki;
    } else if (url.match(/^https?:\/\/piapro\.jp\/(t|content)\//)) {
      format = "html";
      url = url.replace(/^http:/, "https:");
      restQuery = url;
      this.parseFn = this.parsePiapro;
    } else if (
      (matched = url.match(
        /^https?:\/\/www\.jamendo\.com\/track\/(\d+)\/[^\/]+\/lyrics/
      )) !== null
    ) {
      format = "json";
      restQuery =
        // TODO: remove hardcoded client_id
        "https://api.jamendo.com/v3.0/tracks/?client_id=723c4be4&id[]=" +
        matched[1] +
        "&include=lyrics&type=single albumtrack";
      this.parseFn = this.parseJamendo;
    } else if (url.match(/\.(txt|lrc)$/)) {
      format = "plain";
      restQuery = url;
      this.parseFn = this.parseRawPlainText;
    } else {
      throw new Error(`unsupported url: ${url}`);
    }

    const {data, status} = await this.get(restQuery, format);
    if (Math.floor(status / 100) !== 2) {
      throw new Error("HTTP error: " + status);
    }

    if (format === "xml") {
      if (this.createElement(data)("parsererror").length != 0) {
        throw new Error("failed to parse XML");
      }
    } else if (format === "html") {
      if (this.createElement(data)("parsererror").length != 0) {
        throw new Error("failed to parse HTML");
      }
    }

    const result = this.parseFn(data, options);
    this.cache[url] = result;
    return result;
  }

  public parseRawPlainText(text: string, options?: ScraperOptions): string {
    if (typeof options === "undefined") {
      options = {};
    }

    // remove BOM
    const filterFn = options.noFormat ? () => true : this.filter;
    const lines = text
      .replace(/^\ufeff/, "")
      .replace(/\r/, "")
      .split(/\n/);

    const result = lines
      .filter(filterFn)
      .filter(function(line) {
        return !line.match(/^#/);
      })
      .join("\n")
      .replace(/^\s+/, "");

    if (options.noFormat) {
      return result;
    } else {
      return this.format(result);
    }
  }

  private parseJamendo(data: any) {
    if (
      typeof data.results === "undefined" ||
      data.results.length === 0 ||
      typeof data.results[0].lyrics === "undefined"
    ) {
      throw new Error("lyric not found");
    }

    return this.format(data.results[0].lyrics);
  }

  private createElement(data: string) {
    const div = cheerio.load(data);
    return div;
  }

  private parseAtwiki(data: string) {
    const $ = cheerio.load(data);
    const doc = $("#wikibody");

    if ($("div > div", doc).length === 0) {
      throw new Error("lyric not found");
    }

    const h3 = doc.find("div > h3, div > div > h3")
      .filter((_idx, element) => $(element).text() === "歌詞");

    if (h3.length === 0) {
      throw new Error("lyric not found");
    }

    const elements: Element[] = [];
    let el = h3[0];

    while ((el = el.next as Element)) {
      if (el.type === "text") continue;
      
      const tagName = el.tagName.toUpperCase();

      if (tagName === "H3") {
        break;
      } else if (tagName === "DIV") {
        elements.push(el);
      }
    }

    const parsed = elements
      .filter(function(el) {
        return (
          $("a", el).length === 0 &&
          $("form", el).length === 0
        );
      })
      .map(function(el) {
        const content = $(el).text();

        return content
          .replace(/\r/, "")
          .replace(/(\n *)+/g, "\n")
          .replace(/^[\n ]+/, "")
          .replace(/(\s)+$/, "")
          .replace(/ +\n/g, "\n");
      })
      .filter(this.filter)
      .join("\n\n");

    return this.format(parsed);
  }

  private parsePiapro(data: string) {
    const $ = cheerio.load(data);
    const doc = $(".contents_text_txt p");
    const parsed = doc.html()
      .replace(/<br><br>/g, "\n")
      .replace(/<br>/g, "")
      .replace(/^\t+/gm, "");

    return this.format(parsed);
  }

  // private escapeHtml(str: string) {
  //   return str.replace(/[&'`"<>]/g, function(match) {
  //     return {
  //       "&": "&amp;",
  //       "'": "&#x27;",
  //       "`": "&#x60;",
  //       "\"": "&quot;",
  //       "<": "&lt;",
  //       ">": "&gt;"
  //     }[match];
  //   });
  // }

  private format(content: string): string {
    content = this.preFilter(content);
    content = content
      .split(/\n/)
      .filter(this.filter)
      .join("\n");
    content = this.applyReprise(content);
    content = content
      .split(/\n/)
      .filter(this.postFilter)
      .join("\n")
      .replace(/\n\n+/g, "\n\n")
      .replace(/\n+$/g, "\n");

    return content;
  }

  private preFilter(content: string): string {
    const maxHeaderLines = 5;
    let markedIndex: number;
    const lines = content.split(/\n/);

    lines.forEach(function(line, index) {
      if (line.match(/^\S+：\S+$/m)) {
        // e.g.
        //
        // 流通：配信
        // http://www5.atwiki.jp/hmiku/pages/19646.html
        markedIndex = index;
      }
    });

    if (typeof markedIndex !== "undefined" && markedIndex < maxHeaderLines) {
      return lines.slice(markedIndex + 1).join("\n");
    } else {
      return content;
    }
  }

  private filter(content: string, index: number, lines: string[]): boolean {
    if (CHORD_PROGRESSION_REGEXP.test(content)) {
      // chord progression?
      return false;
    } else if (content.match(/[\（(].+(?:転載|書き起こし).*[\）)]/)) {
      // e.g.
      //
      // > （「CDで聞いてみて。～ニコニコ動画せれくちょん～」の歌詞カードより転載）
      // http://www5.atwiki.jp/hmiku/pages/20.html
      return false;
    } else if (content.match(/(作詞|作曲).+(作詞|作曲)/)) {
      // e.g.
      //
      // 作詞／作曲 : daniwel
      // http://aidn.jp/assets/lyrics/aiyueni.txt
      if (index === 0 || index === lines.length - 2) {
        return false;
      } else {
        return true;
      }
    }

    return true;
  }

  private postFilter(content: string): boolean {
    if (content.match(new RegExp("[（(]?※"))) {
      // e.g.
      //
      // (※以降繰り返し)
      // http://aidn.jp/assets/lyrics/aiyueni.txt
      return false;
    }

    return true;
  }

  private applyReprise(content: string): string {
    let phrase: string;
    const repriseRe = new RegExp("[（(]?(.)繰り返し[)）]?", "g");
    let matched: RegExpExecArray | null;
    let mark: string;
    let re: RegExp;
    let m: RegExpMatchArray | null;

    // find marks
    while ((matched = repriseRe.exec(content)) !== null) {
      mark = matched[1];
      re = new RegExp("^(" + mark + "[\\s\\S]+?)(?=\\n\\n[^\\u3000|\\s])", "m");

      if ((m = content.match(re)) !== null) {
        phrase = m[1]
          .replace(new RegExp("^" + mark, "m"), "")
          .replace(new RegExp("^\\n"), "")
          .replace(new RegExp("^\\u3000", "mg"), "");

        content = content.replace(re, () => phrase);

        content = content
          .replace(
            new RegExp("[（\\(]?" + mark + "繰り返し[\\)）]?", "g"),
            phrase
          )
          .replace(new RegExp("^" + mark, "m"), "");
      }
    }

    return content;
  }
}

class SongleLyrics extends Lyrics {
  constructor(lyrics: string, timeTags: SongleTimeTagData) {
    super();
    const flatternedTimeTags = timeTags.flat().flat();
    let charPointer = 0;
    const textLines = lyrics.split("\n");
    const lines: LyricsLine[] = [];
    for (const textLine of textLines) {
      const labels: WordTimeTagLabel[] = [];
      let lastChar = -1, lastEnd = -1;
      [...textLine].forEach((char, index) => {
        if (char.match(/[\s\r\n]/)) return;
        const tag = flatternedTimeTags[charPointer];
        if (tag) {
          if (tag.start_time !== null && tag.end_time !== null && (labels.length === 0 || labels.at(-1).timeTag !== tag.start_time)) {
            labels.push(new WordTimeTagLabel(tag.start_time, index));
            lastChar = index;
            lastEnd = tag.end_time;
          }
          charPointer++;
        }
      });
      if (lastChar !== -1) {
        labels.push(new WordTimeTagLabel(lastEnd, lastChar + 1));
      }
      const lastValidLine = !lines.length ? undefined : lines.findLast(line => (line?.attachments?.timeTag?.tags?.length ?? 0) > 0);
      const lineStart = labels.length ? labels[0].timeTag : lastValidLine ? lastValidLine.position + (lastValidLine.attachments.timeTag?.tags.at(-1)?.timeTag ?? 0) : 0;
      labels.forEach(label => label.timeTag -= lineStart);
      const attachments = labels.length ? new Attachments({ [TIME_TAG]: new WordTimeTag(labels) }) : undefined;
      const line = new LyricsLine(textLine, lineStart, attachments);
      if (lines.length && !lines.at(-1).content.trim() && lines.at(-1).position === line.position) {
        lines.at(-1).position -= 0.001;
      }
      lines.push(line);
    }

    this.metadata.attachmentTags.add(TIME_TAG);
    this.lines = lines;
  }
}

export class SongleProvider extends LyricsProvider<SongleResponseSearchResult> {
  private scraper: SongleLyricsScraper;
  
  constructor() {
    super();
    this.scraper = new SongleLyricsScraper();
  }

  public async searchLyrics(
    request: LyricsSearchRequest
  ): Promise<SongleResponseSearchResult[]> {
    try {
      let query = "";

      if (request.searchTerm.state === "info") {
        query = `${request.searchTerm.title} ${request.searchTerm.artist}`;
      } else if (request.searchTerm.state === "keyword") {
        query = request.searchTerm.keyword;
      }
      const searchResult = await axios.get<SongleResponseSearch[]>("https://widget.songle.jp/api/v1/songs/search.json", {
        params: {
          q: query
        }
      });
      const lyrics = (await Promise.all(searchResult.data.map(async (result) => {
        const response = await axios.get<SongleResponseLyricsList>(`https://songle.jp/songs/${result.code}/lyrics.json`);
        return response.data.lyrics;
      }))).flat().filter(lyrics => !lyrics.processing && !lyrics.failed);
      return lyrics.map((lyric) => ({
        name: lyric.song.name,
        artist: lyric.song.artist.name,
        code: lyric.song.code,
        id: lyric.id,
        durationSeconds: lyric.song.length,
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  private computeToken(t: string): number {
      const size = t.length;
      let n = 0;
      if (0 === size) {
          return n;
      }
      for (let i = 0; i < size; i++) {
          n = (n << 5) - n + t.charCodeAt(i);
          n |= 0;
      }
      return n;
  }

  private async fetchLyricsTextFromScrapper(
    token: SongleResponseSearchResult,
    url: string,
    data: SongleTimeTagData
  ) {
    try {
      const lyricsResponse = await this.scraper.url2Lyric(url);
      const lyricsObj = new SongleLyrics(lyricsResponse, data);
      lyricsObj.idTags[TITLE] = token.name;
      lyricsObj.idTags[ARTIST] = token.artist;
      return lyricsObj;
    } catch (e) {
      console.error("failed to fetch lyrics from scraper", e);
      return undefined;
    }
  }

  public async fetchLyrics(
    token: SongleResponseSearchResult
  ): Promise<Lyrics | undefined> {
    try {
      const response = await axios.get<SongleLyricsObject>(`https://songle.jp/songs/${token.code}/lyrics/${token.id}.json`);
      let lyrics = ""; 
      let lyricsObj: SongleLyrics;
      const licenseResponse = await axios.get<SongleLicenseResponse | SongleError>("https://api.textalive.jp/etc/license", {
        params: {
          url: response.data.url,
          token: this.computeToken("ta" + response.data.url),
          skipOptoutCheck: true,
        }
      });
      // console.log("licenseResponse.data:", licenseResponse.data, "token:", token);
      if ("error" in licenseResponse.data) {
        console.error("Error getting license result", licenseResponse.data.error);
        return this.fetchLyricsTextFromScrapper(token, response.data.url, response.data.data);
      } else if (!licenseResponse.data.contentUrl.startsWith("data:text/plain;base64,")) {
        console.error("Unknown content URL type: " + licenseResponse.data.contentUrl);
        return this.fetchLyricsTextFromScrapper(token, response.data.url, response.data.data);
      } else {
        const base64 = licenseResponse.data.contentUrl.slice("data:text/plain;base64,".length);
        lyrics = Buffer.from(base64, "base64").toString("utf-8");
        lyricsObj = new SongleLyrics(lyrics, response.data.data);
        lyricsObj.idTags[TITLE] = licenseResponse.data.name;
        lyricsObj.idTags[ARTIST] = licenseResponse.data.authorName;
      }
      
      lyricsObj.length = token.durationSeconds;
      lyricsObj.metadata.source = LyricsProviderSource.songle;
      lyricsObj.metadata.providerToken = token.code;
      

      return lyricsObj;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
}