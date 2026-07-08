import Path from "path";
import { writeFile } from "fs/promises";
import { ARTIST, TITLE } from "../../core/idTagKey.js";
import { LyricsProviderSourceId } from "../lyricsProviderSourceId.js";
import { LyricsSearchRequest } from "../lyricsSearchRequest.js";
import type { YouTubeSearchResult } from "../types/youtube/searchResult.js";

const mockGetVideoInfo = jest.fn();
const mockExecPromise = jest.fn();

jest.mock("yt-dlp-wrap-plus", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getVideoInfo: mockGetVideoInfo,
    execPromise: mockExecPromise,
  })),
}));

import { YouTubeProvider } from "./youtube.js";

describe("YouTubeProvider yt-dlp integration", () => {
  beforeEach(() => {
    mockGetVideoInfo.mockReset();
    mockExecPromise.mockReset();
  });

  it("normalizes yt-dlp search results and prefers manual captions", async () => {
    mockGetVideoInfo.mockResolvedValueOnce([
      {
        id: "manual-video",
        title: "Manual Song",
        uploader: "Uploader",
        duration: 65,
        thumbnail: "https://example.test/thumb.jpg",
        webpage_url: "https://www.youtube.com/watch?v=manual-video",
        subtitles: {
          ja: [{ ext: "json3" }],
          en: [{ ext: "vtt" }],
        },
        automatic_captions: {
          ja: [{ ext: "json3" }],
          en: [{ ext: "json3" }],
        },
      },
    ]);

    const provider = new YouTubeProvider();
    const results = await provider.searchLyrics(
      LyricsSearchRequest.fromInfo("Manual Song", "Uploader", 65),
    );

    expect(mockGetVideoInfo).toHaveBeenCalledWith([
      "ytsearch5:Manual Song Uploader",
      "--skip-download",
    ]);
    expect(results).toEqual([
      {
        id: "manual-video",
        title: "Manual Song (ja)",
        thumbnail: "https://example.test/thumb.jpg",
        uploader: "Uploader",
        durationText: "1:05",
        language: "ja",
        url: "https://www.youtube.com/watch?v=manual-video",
        isAutomatic: false,
      },
      {
        id: "manual-video",
        title: "Manual Song (en)",
        thumbnail: "https://example.test/thumb.jpg",
        uploader: "Uploader",
        durationText: "1:05",
        language: "en",
        url: "https://www.youtube.com/watch?v=manual-video",
        isAutomatic: true,
      },
    ]);
  });

  it("downloads JSON3 captions through yt-dlp and parses lyrics metadata", async () => {
    mockExecPromise.mockImplementation(async (args: string[]) => {
      const outputIndex = args.indexOf("-o") + 1;
      const outputTemplate = args[outputIndex];
      const subtitlePath = `${outputTemplate.replace("%(id)s", "caption-video")}.ja.json3`;
      await writeFile(
        subtitlePath,
        JSON.stringify({
          events: [
            {
              tStartMs: 1200,
              dDurationMs: 800,
              segs: [{ utf8: "hello" }, { utf8: "world" }],
            },
          ],
        }),
      );
    });

    const provider = new YouTubeProvider();
    const token: YouTubeSearchResult = {
      id: "caption-video",
      title: "Caption Song (ja)",
      thumbnail: "https://example.test/art.jpg",
      uploader: "Caption Artist",
      durationText: "0:02",
      language: "ja",
      url: "https://www.youtube.com/watch?v=caption-video",
      isAutomatic: true,
    };

    const lyrics = await provider.fetchLyrics(token);
    const args = mockExecPromise.mock.calls[0][0] as string[];

    expect(args.slice(0, 10)).toEqual([
      token.url,
      "--js-runtimes",
      "node",
      "--skip-download",
      "--write-auto-subs",
      "--sub-langs",
      token.language,
      "--sub-format",
      "json3",
      "-o",
    ]);
    expect(Path.basename(args[10])).toBe("%(id)s");
    expect(lyrics.lines[0].content).toBe("hello world");
    expect(lyrics.lines[0].position).toBe(1.2);
    expect(lyrics.idTags[TITLE]).toBe(token.title);
    expect(lyrics.idTags[ARTIST]).toBe(token.uploader);
    expect(lyrics.metadata.source).toBe(LyricsProviderSourceId.youtube);
    expect(lyrics.metadata.providerToken).toBe("caption-video ja");
    expect(lyrics.metadata.artworkURL).toBe(token.thumbnail);
    expect(lyrics.length).toBe(2);
  });
});
