import { mkdtemp, readdir, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import Path from "path";
import YTDlpWrap from "yt-dlp-wrap-plus";
import { LyricsProvider } from ".";
import { ARTIST, TITLE } from "../../core/idTagKey";
import { Lyrics } from "../../core/lyrics";
import { LyricsLine } from "../../core/lyricsLine";
import { LyricsProviderSourceId } from "../lyricsProviderSourceId";
import type { LyricsSearchRequest } from "../lyricsSearchRequest";
import type { YouTubeSearchResult } from "../types/youtube/searchResult";
import type { YouTubeLyricsJSON3 } from "../types/youtube/singleLyrics";

const SEARCH_RESULT_LIMIT = 5;
const SUBTITLE_FORMAT = "json3";
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=";

type YTDlpCaptionFormat = {
  ext?: string;
  url?: string;
};

type YTDlpCaptionMap = Record<string, YTDlpCaptionFormat[]>;

type YTDlpVideoInfo = {
  id?: string;
  title?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  uploader?: string;
  channel?: string;
  duration?: number;
  duration_string?: string;
  webpage_url?: string;
  subtitles?: YTDlpCaptionMap;
  automatic_captions?: YTDlpCaptionMap;
  entries?: YTDlpVideoInfo[];
};

type YouTubeTimedTextTrack = {
  language: string;
  url: string;
  captionUrl?: string;
  isAutomatic: boolean;
};

class YouTubeLyrics extends Lyrics {
  constructor(data: YouTubeLyricsJSON3) {
    super();

    const { events } = data;

    const lyricsLines: LyricsLine[] = [];

    for (let i = 0; i < events.length; i++) {
      let addBlankLine = false;
      if (i === events.length - 1) {
        addBlankLine = true;
      } else if (
        events[i + 1].tStartMs - (events[i].tStartMs + events[i].dDurationMs) >
        1000
      ) {
        addBlankLine = true;
      }

      const start = events[i].tStartMs / 1000;
      const end = (events[i].tStartMs + events[i].dDurationMs) / 1000;
      const lineContent = events[i].segs
        .map((seg) => seg.utf8)
        .join(" ")
        .replace("\n", " ");

      const line = new LyricsLine(lineContent, start);
      line.lyrics = this;
      lyricsLines.push(line);

      if (addBlankLine) {
        const blankLine = new LyricsLine("", end);
        blankLine.lyrics = this;
        lyricsLines.push(blankLine);
      }
    }

    this.lines = lyricsLines;
  }
}

export class YouTubeProvider extends LyricsProvider<YouTubeSearchResult> {
  private readonly ytdlp = new YTDlpWrap(process.env.YTDLP_PATH);

  private static watchUrl(id: string): string {
    return `${YOUTUBE_WATCH_URL}${id}`;
  }

  private static normalizeVideoInfo(
    data: YTDlpVideoInfo | YTDlpVideoInfo[]
  ): YTDlpVideoInfo[] {
    if (Array.isArray(data)) return data;
    return data.entries ?? [data];
  }

  private static formatDuration(duration?: number): string {
    if (duration === undefined || !Number.isFinite(duration)) return "";

    const totalSeconds = Math.floor(duration);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    const paddedSeconds = seconds.toString().padStart(2, "0");
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
    }
    return `${minutes}:${paddedSeconds}`;
  }

  private static getThumbnail(info: YTDlpVideoInfo): string {
    return info.thumbnail ?? info.thumbnails?.at(-1)?.url ?? "";
  }

  private static getJson3Caption(
    formats: YTDlpCaptionFormat[]
  ): YTDlpCaptionFormat | undefined {
    return formats.find((format) => format.ext === SUBTITLE_FORMAT);
  }

  private static mapCaptionTracks(
    subtitles: YTDlpCaptionMap | undefined,
    automaticCaptions: YTDlpCaptionMap | undefined,
    url: string
  ): YouTubeTimedTextTrack[] {
    const tracks: YouTubeTimedTextTrack[] = [];
    const manualLanguages = new Set<string>();

    for (const [language, formats] of Object.entries(subtitles ?? {})) {
      const caption = YouTubeProvider.getJson3Caption(formats);
      if (!caption) continue;
      manualLanguages.add(language);
      tracks.push({ language, url, captionUrl: caption.url, isAutomatic: false });
    }

    for (const [language, formats] of Object.entries(automaticCaptions ?? {})) {
      if (manualLanguages.has(language)) continue;
      const caption = YouTubeProvider.getJson3Caption(formats);
      if (!caption) continue;
      tracks.push({ language, url, captionUrl: caption.url, isAutomatic: true });
    }

    return tracks;
  }

  private async getTimedTextTracks(
    id: string,
    url = YouTubeProvider.watchUrl(id)
  ): Promise<YouTubeTimedTextTrack[]> {
    const info = (await this.ytdlp.getVideoInfo([
      url,
      "--skip-download",
      "--sub-format",
      SUBTITLE_FORMAT,
    ])) as YTDlpVideoInfo;

    return YouTubeProvider.mapCaptionTracks(
      info.subtitles,
      info.automatic_captions,
      info.webpage_url ?? url
    );
  }

  async getTimedTextUrls(
    id: string
  ): Promise<{ language: string; url: string }[]> {
    const tracks = await this.getTimedTextTracks(id);
    return tracks.map(({ language, url, captionUrl }) => ({
      language,
      url: captionUrl ?? url,
    }));
  }

  public async searchLyrics(
    request: LyricsSearchRequest
  ): Promise<YouTubeSearchResult[]> {
    const data = (await this.ytdlp.getVideoInfo([
      `ytsearch${SEARCH_RESULT_LIMIT}:${request.title} ${request.artist}`,
      "--skip-download",
    ])) as YTDlpVideoInfo | YTDlpVideoInfo[];
    const items = YouTubeProvider.normalizeVideoInfo(data);

    const searchResults: YouTubeSearchResult[] = [];
    for (const item of items.slice(0, SEARCH_RESULT_LIMIT)) {
      if (!item.id) continue;

      const url = item.webpage_url ?? YouTubeProvider.watchUrl(item.id);
      const base = {
        id: item.id,
        title: item.title ?? "",
        thumbnail: YouTubeProvider.getThumbnail(item),
        uploader: item.uploader ?? item.channel ?? "",
        durationText:
          item.duration_string ?? YouTubeProvider.formatDuration(item.duration),
      };
      let tracks = YouTubeProvider.mapCaptionTracks(
        item.subtitles,
        item.automatic_captions,
        url
      );
      if (tracks.length === 0) {
        tracks = await this.getTimedTextTracks(base.id, url);
      }

      for (const track of tracks) {
        searchResults.push({
          ...base,
          title: `${base.title} (${track.language})`,
          language: track.language,
          url: track.url,
          isAutomatic: track.isAutomatic,
        });
      }
    }

    return searchResults;
  }

  static parseDuration(durationText: string): number {
    const parts = durationText.split(":").reverse();
    let duration = 0;
    for (let i = 0; i < parts.length; i++) {
      duration += parseInt(parts[i]) * Math.pow(60, i);
    }
    return duration;
  }

  private async fetchLyricsJSON(token: YouTubeSearchResult): Promise<YouTubeLyricsJSON3> {
    const tempDir = await mkdtemp(Path.join(tmpdir(), "lyrics-kit-youtube-"));

    try {
      const stdout = await this.ytdlp.execPromise([
        token.url,
        "--js-runtimes",
        "node",
        "--skip-download",
        token.isAutomatic ? "--write-auto-subs" : "--write-subs",
        "--sub-langs",
        token.language,
        "--sub-format",
        SUBTITLE_FORMAT,
        "-o",
        Path.join(tempDir, "%(id)s"),
      ]);

      const files = await readdir(tempDir);
      const file = files.find((name) => name.endsWith(`.${SUBTITLE_FORMAT}`));
      if (!file) {
        console.error(`No ${SUBTITLE_FORMAT} captions found for ${token.id} ${token.language}`);
        console.error(stdout);
        throw new Error(
          `Cannot find ${SUBTITLE_FORMAT} captions for ${token.id} ${token.language}`
        );
      }

      const json = await readFile(Path.join(tempDir, file), "utf8");
      return JSON.parse(json) as YouTubeLyricsJSON3;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  public async fetchLyrics(token: YouTubeSearchResult): Promise<Lyrics> {
    const data = await this.fetchLyricsJSON(token);
    const lyrics = new YouTubeLyrics(data);
    lyrics.idTags[TITLE] = token.title;
    lyrics.idTags[ARTIST] = token.uploader;
    lyrics.metadata.source = LyricsProviderSourceId.youtube;
    lyrics.metadata.providerToken = `${token.id} ${token.language}`;
    lyrics.metadata.artworkURL = token.thumbnail;
    lyrics.length = YouTubeProvider.parseDuration(token.durationText);
    return lyrics;
  }
}
