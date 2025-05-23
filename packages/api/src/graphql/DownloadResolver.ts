// import youtubedl, { Info, Options } from "youtube-dl";
import Path from "path";
import { MUSIC_FILES_PATH, YTDLP_PATH } from "../utils/secret";
import { pythonBridge, PythonBridge } from "python-bridge";
import { GraphQLJSONObject } from "graphql-type-json";
import axios from "axios";
import {
  Arg,
  Authorized,
  createUnionType,
  Field,
  Float,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  PubSub,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import type { Publisher } from "type-graphql";
import { exec, execSync } from "child_process";
import { findFilesModifiedAfter } from "../utils/fs";
import sanitize from "sanitize-filename";
import Stream from "stream";
import { downloadFromStream } from "../utils/download";
import path from "path";
import type { PubSubSessionPayload } from "./index";
import { swapExt } from "../utils/path";
import YTDlpWrap from "yt-dlp-wrap";

function asyncExec(
  command: string
): Promise<{ stderr: string; stdout: string }> {
  return new Promise<{ stderr: string; stdout: string }>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) reject(err);
      resolve({ stderr, stdout });
    });
  });
}

interface MxGetSearchResultItem {
  album: string;
  artist: string;
  id: string;
  name: string;
}

interface MxGetSearchResultDetails extends MxGetSearchResultItem {
  listen_url?: string;
  lyric?: string;
  pic_url?: string;
}

@InputType()
export class YouTubeDlDownloadOptions {
  @Field({ description: "Name of file to save as.", nullable: true })
  filename?: string;

  @Field({
    description: "Whether to overwrite if a file already exists.",
    defaultValue: false,
  })
  overwrite: boolean;
}

@ObjectType()
export class YouTubeDlInfo {
  @Field()
  filename: string;

  @Field((type) => Int, {
    description: "Size of file in bytes, precision to every 10486 bytes.",
  })
  size: number;

  @Field((type) => GraphQLJSONObject)
  metadata: object;
}

@ObjectType()
export class YouTubeDlDownloadMessage {
  @Field()
  message: string;
}

const YouTubeDLDownloadResponse = createUnionType({
  name: "YouTubeDLDownloadResponse",
  types: () => [YouTubeDlInfo, YouTubeDlDownloadMessage],
  resolveType: (value) => {
    if ("message" in value) {
      return YouTubeDlDownloadMessage;
    }
    return YouTubeDlInfo;
  },
});

@ObjectType({ description: "youtube-dl download progress object." })
class YouTubeDlProgressValue {
  @Field((type) => String, { description: 'Type of update, "progress".' })
  type: "progress";

  @Field((type) => Float)
  current: number;

  @Field((type) => Float)
  total: number;

  @Field((type) => String, { nullable: true })
  speed?: string;

  @Field((type) => String, { nullable: true })
  eta?: string;

  __typename: "YouTubeDlProgressValue";
}

@ObjectType({
  description: "youtube-dl download progress when download is finished.",
})
class YouTubeDlProgressDone {
  @Field((type) => String, { description: 'Type of update, "done".' })
  type: "done";

  __typename: "YouTubeDlProgressDone";
}

@ObjectType({
  description: "youtube-dl download progress when download failed.",
})
class YouTubeDlProgressError {
  @Field((type) => String, { description: 'Type of update, "error".' })
  type: "error";

  @Field()
  message: string;

  __typename: "YouTubeDlProgressError";
}

@ObjectType()
export class YouTubeDlProgressMessage {
  @Field((type) => String, { description: 'Type of update, "message".' })
  type: "message";

  @Field()
  message: string;

  __typename: "YouTubeDlProgressMessage";
}

export type YouTubeDlProgressType =
  | YouTubeDlProgressDone
  | YouTubeDlProgressError
  | YouTubeDlProgressValue
  | YouTubeDlProgressMessage;

const YouTubeDlProgress = createUnionType({
  name: "YouTubeDlProgress",
  types: () =>
    [
      YouTubeDlProgressDone,
      YouTubeDlProgressError,
      YouTubeDlProgressValue,
      YouTubeDlProgressMessage,
    ] as const,
  resolveType: (value) => {
    if (value?.type === "progress") {
      return "YouTubeDlProgressValue";
    } else if (value?.type === "message") {
      return "YouTubeDlProgressMessage";
    } else if (value?.type === "done") {
      return "YouTubeDlProgressDone";
    } else {
      return "YouTubeDlProgressError";
    }
  },
});

@ObjectType()
export class MusicDlSearchResult {
  @Field()
  source: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  artists?: string;

  @Field({ nullable: true })
  album?: string;

  @Field((type) => Float, { nullable: true })
  duration?: number;

  @Field((type) => Int, { nullable: true })
  size?: number;

  @Field({ nullable: true })
  songURL?: string;

  @Field({ nullable: true })
  lyricsURL?: string;

  @Field({ nullable: true })
  coverURL?: string;

  @Field()
  pickle: string;
}

@Resolver()
export class DownloadResolver {
  private publishDownloadProgress(
    publish: Publisher<PubSubSessionPayload<YouTubeDlProgressType>>,
    sessionId: string,
    current: number,
    total: number,
    speed: string = null,
    eta: string = null
  ): Promise<void> {
    console.log(
      `Download progress of ${sessionId}: ${current} / ${total} @ ${speed} ETA: ${eta}}`
    );
    return publish({
      sessionId,
      data: {
        type: "progress",
        __typename: "YouTubeDlProgressValue",
        current,
        total,
        speed,
        eta,
      },
    });
  }

  private publishDownloadSuccess(
    publish: Publisher<PubSubSessionPayload<YouTubeDlProgressType>>,
    sessionId: string
  ): Promise<void> {
    console.log(`Download success: ${sessionId}`);
    return publish({
      sessionId,
      data: { type: "done", __typename: "YouTubeDlProgressDone" },
    });
  }

  private publishDownloadMessage(
    publish: Publisher<PubSubSessionPayload<YouTubeDlProgressType>>,
    sessionId: string,
    message: string
  ): Promise<void> {
    console.log(`Download message: ${sessionId}, ${message}`);
    return publish({
      sessionId,
      data: {
        type: "message",
        message,
        __typename: "YouTubeDlProgressMessage",
      },
    });
  }

  private publishDownloadFail(
    publish: Publisher<PubSubSessionPayload<YouTubeDlProgressType>>,
    sessionId: string,
    error: unknown
  ): Promise<void> {
    console.error(`Download failed: ${sessionId}`, error);
    return publish({
      sessionId,
      data: {
        type: "error",
        message: `${error}`,
        __typename: "YouTubeDlProgressError",
      },
    });
  }

  @Subscription(() => YouTubeDlProgress, {
    topics: "YOUTUBE_DL_PROGRESS",
    filter: ({ payload, args }) => args.sessionId === payload.sessionId,
    nullable: true,
    description:
      "Progress of a `youTubeDlDownloadVideo` mutation. Session ID is required when performing mutation.",
  })
  youTubeDlDownloadProgress(
    @Root() payload: PubSubSessionPayload<YouTubeDlProgressType>,
    @Arg("sessionId") sessionId: string
  ): YouTubeDlProgressType | null {
    return payload.data;
  }

  // @Authorized("ADMIN")
  // @Mutation(returns => YouTubeDLDownloadResponse, { description: "Download video via youtube-dl." })
  // public async youTubeDlDownloadVideo(
  //   @Arg("url") url: string,
  //   @Arg("options") { overwrite, filename }: YouTubeDlDownloadOptions,
  //   @Arg("sessionId", { nullable: true, defaultValue: null }) sessionId: string | null,
  //   @PubSub("YOUTUBE_DL_PROGRESS") publish: Publisher<PubSubSessionPayload<YouTubeDlProgressType>>,
  // ): Promise<YouTubeDlDownloadMessage | YouTubeDlInfo> {
  //   // Sadly I had to write my own promise on this sh#t.
  //
  //   return new Promise((resolve, reject) => {
  //     const params = [];
  //     if (!overwrite) {
  //       params.push("--no-overwrites");
  //     }
  //     const video = youtubedl(url, params, {});
  //
  //     let totalSize = 0;
  //
  //     video.on("info", info => {
  //       // console.log("Download started");
  //       // console.log("filename: " + info._filename);
  //       // console.log("size: " + info.size);
  //       // console.log("info", info);
  //       filename = filename || info._filename;
  //       const fileStream = fs.createWriteStream(Path.resolve(VIDEO_FILES_PATH, filename), { flags: "a" });
  //       video.pipe(fileStream);
  //       totalSize = info.size;
  //       resolve({
  //         filename: info._filename,
  //         size: info.size,
  //         metadata: info,
  //       });
  //     });
  //
  //     // Will be called if download was already completed and there is nothing more to download.
  //     video.on("complete", info => {
  //       // console.log("filename: " + info._filename + " already downloaded.");
  //       if (sessionId) this.publishDownloadSuccess(publish, sessionId);
  //       resolve({ message: "Already downloaded" });
  //     });
  //
  //     video.on("end", () => {
  //       // console.log("finished downloading!");
  //       if (sessionId) this.publishDownloadSuccess(publish, sessionId);
  //       resolve({ message: "Already downloaded" });
  //     });
  //
  //     let downloaded = 0;
  //     video.on("data", (chunk) => {
  //       downloaded += (chunk as unknown as Buffer).length;
  //       // console.log(`Downloaded ${downloaded} bytes`);
  //       if (sessionId) this.publishDownloadProgress(publish, sessionId, downloaded, totalSize);
  //     });
  //
  //     video.on("error", (err) => {
  //       // console.error("youtube-dl error", err);
  //       if (sessionId) this.publishDownloadFail(publish, sessionId, err);
  //       try {
  //         reject(err);
  //       } catch (e) {
  //         console.log(`Error while downloading music ${url}`, e);
  //       }
  //     });
  //   });
  // }

  @Authorized("ADMIN")
  @Mutation(() => String, {
    description: "Download audio via yt-dlp.",
    nullable: true,
  })
  public async youtubeDlDownloadAudio(
    @Arg("url") url: string,
    @Arg("options") { overwrite, filename }: YouTubeDlDownloadOptions,
    @Arg("sessionId", { nullable: true, defaultValue: null })
    sessionId: string | null,
    @PubSub("YOUTUBE_DL_PROGRESS")
    publish: Publisher<PubSubSessionPayload<YouTubeDlProgressType>>
  ): Promise<string> {
    const ytdlpWrap = new YTDlpWrap(YTDLP_PATH);
    const format = url.includes("nicovideo") ? "best" : "bestaudio";
    if (!filename) {
      const info = await ytdlpWrap.getVideoInfo(["-f", format, url]);
      filename = info.filename;
    }
    filename = swapExt(filename, "mp3");
    const fullPath = Path.resolve(MUSIC_FILES_PATH, filename);
    const params = [
      url,
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "128K",
      "-f",
      format,
      "--embed-thumbnail",
      "--add-metadata",
      "-o",
      fullPath,
    ];
    if (!overwrite) {
      params.push("--no-overwrites");
    }
    return new Promise((resolve, reject) => {
      // const result = await ytdlpWrap.execPromise(params);
      const stream = ytdlpWrap.exec(params);
      console.log(stream);
      stream.on("progress", (progress) => {
        if (sessionId) {
          this.publishDownloadProgress(
            publish,
            sessionId,
            progress.percent,
            100,
            progress.currentSpeed,
            progress.eta
          );
        }
      });
      stream.on("ytDlpEvent", (event, data) => {
        console.log("yt-dlp event", event, data);
        if (sessionId)
          this.publishDownloadMessage(publish, sessionId, `[${event}] ${data}`);
      });
      stream.on("error", (err) => {
        console.error("yt-dlp error", err);
        if (sessionId) this.publishDownloadFail(publish, sessionId, err);
        reject(err);
      });
      stream.on("close", () => {
        console.log("yt-dlp finished downloading!");
        if (sessionId) this.publishDownloadSuccess(publish, sessionId);
        resolve(filename);
      });
    });
  }

  /**
   * Get video info via yt-dlp.
   */
  @Authorized("ADMIN")
  @Query((returns) => GraphQLJSONObject)
  public async youtubeDlGetInfo(@Arg("url") url: string): Promise<object> {
    const ytdlpWrap = new YTDlpWrap(YTDLP_PATH);
    const format = url.includes("nicovideo") ? "best" : "bestaudio";
    const info = await ytdlpWrap.getVideoInfo(["-f", format, url]);
    // console.log("yt-dlp info", info);
    if (Array.isArray(info))
      throw new Error("Playlist download is not supported yet");
    return info;
  }

  //
  // /**
  //  * Get video thumbnail via youtube-dl.
  //  * POST .../youtubedl/thumbnails
  //  * url=URL_TO_VIDEO
  //  */
  // @Authorized("ADMIN")
  // @Query(returns => [String])
  // public async youtubeDlGetThumbnail(@Arg("url") url: string): Promise<string[]> {
  //   const getThumb = promisify(youtubedl.getThumbs as (url: string, options: Options, callback: (err: unknown, output: string[]) => void) => void);
  //   const thumbInfo = await getThumb(url, { all: true });
  //   return thumbInfo;
  // }

  /*
  private async prepareMusicDlPythonSession(): Promise<PythonBridge> {
    const python = pythonBridge({ python: "/usr/local/bin/python3" });
    await python.ex`
import pickle
import codecs
import sys
from music_dl.source import MusicSource
from music_dl import config
from pytimeparse import parse

ms = MusicSource()
config.init()

def search(term):
    result = ms.search(
        term, ["baidu", "kugou", "netease", "163", "qq", "migu"]
    )
    data = []
    for i in result:
        duration = i.duration
        if isinstance(duration, str):
            duration = parse(duration)
        
        data.append({
            "source": i.source,
            "title": i.title,
            "artists": i.singer,
            "album": i.album,
            "duration": duration,
            "size": round(i.size * 1048576),
            "songURL": i.song_url,
            "lyricsURL": i.lyrics_url,
            "coverURL": i.cover_url,
            "pickle": codecs.encode(pickle.dumps(i), "base64").decode()
        })
    return data


def download():
    data = sys.stdin.read()
    pickled = codecs.decode(data.encode(), "base64")
    obj = pickle.loads(pickled)
    obj.download()
    return obj.song_fullname
    `;
    return python;
  }
  */

  /**
   * Search songs via music-dl
   * GET .../music-dl?query=QUERY
   */
  /*
  @Authorized("ADMIN")
  @Query(returns => [MusicDlSearchResult])
  public async musicDlSearch(@Arg("query") query: string): Promise<MusicDlSearchResult[]> {
    const python = await this.prepareMusicDlPythonSession();
    const outcome: MusicDlSearchResult[] = await python`search(${query})`;
    outcome.forEach(v => {
      v.pickle = encrypt(v.pickle);
    });
    await python.end();
    return outcome;
  }
  */

  /**
   * Download song via music-dl
   * POST .../music-dl
   * <Encrypted pickle data>
   */
  /*
  @Authorized("ADMIN")
  @Mutation(returns => String, {
    nullable: true,
    description: "Download a file via music-dl and return the path downloaded."
  })
  public async musicDlDownload(@Arg("pickle") encrypted: string): Promise<string> {
    const payload = decrypt(encrypted);
    const python = await this.prepareMusicDlPythonSession();
    python.stdin.write(payload);
    python.stdin.end();
    const outcome = await python`download()`;
    // TODO: move file to right place
    await python.end();
    return outcome;
  }
  */

  /*
  @Authorized("ADMIN")
  @Query(returns => [MxGetSearchResult])
  public async mxGetSearch(@Arg("query") query: string): Promise<MxGetSearchResult[]> {
    const results: MxGetSearchResult[] = [];
    await Promise.all(MXGET_SOURCES.map(async (source) => {
      try {
        const resp = await axios.get<{ data: MxGetSearchResultItem[] }>(`${MXGET_API_PATH}${source}/search/${encodeURIComponent(query)}`);
        await Promise.all(resp.data.data.map(async (item) => {
          try {
            const resp = await axios.get<{ data: MxGetSearchResultDetails }>(`${MXGET_API_PATH}${source}/song/${item.id}`);
            results.push({
              ...resp.data.data,
              source
            });
          } catch (e) {
            console.error(`[mxget] error occurred while getting ${item.id} from ${source}`, e);
          }
        }));
      } catch (e) {
        if (e?.data?.msg === "search songs: no data") return;
        console.error(`[mxget] error occurred while searching for ${query} from ${source}`, e);
      }
    }));
    return results;
  }

  @Authorized("ADMIN")
  @Mutation(returns => String, {
    nullable: true,
    description: "Download a file via MxGet and return the path downloaded."
  })
  public async mxGetDownload(
    @Arg("source", type => String) source: MxGetSourceType,
    @Arg("id", type => ID) id: MxGetSourceType,
  ): Promise<string> {
    if (MXGET_SOURCES.indexOf(source) < 0) throw new Error(`${source} is not a valid source.`);
    if (!id.match(/^[0-9a-zA-Z]+$/)) throw new Error(`${id} is not a valid ID.`);

    if (source === "qq") return this.qqMusicDownload(id);

    execSync(`${MXGET_BINARY} config --dir '${MUSIC_FILES_PATH}'`);
    const startTime = new Date();

    const { stderr } = await asyncExec(`${MXGET_BINARY} song --from ${source} --id ${id} --lyric --tag`);
    if (stderr.includes("[ERROR]")) {
      console.error("Failed to download music file", source, id, stderr);
      return null;
    }

    const files =
      findFilesModifiedAfter(startTime, MUSIC_FILES_PATH).filter(v => {
        const l = v.toLowerCase();
        return !l.endsWith(".lrc") && !l.endsWith(".lrcx");
      });

    if (files.length > 0) return files[0];
    return null;
  }

  private async qqMusicDownload(songId: string): Promise<string> {
    const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36" };
    try {
      const songInfo = (await axios.get<QQSongInfoPartial>(`${QQ_API_PATH}song?songmid=${songId}`, { headers })).data;
      if (!songInfo.data) return null;
      const fileName = sanitize(`${songInfo.data.trackInfo.name} - ${songInfo.data.trackInfo.singer.map(v => v.name).join(", ")}`);
      const { media_mid, size_128mp3, size_320mp3, size_ape, size_flac } = songInfo.data.trackInfo.file;
      let url: string | null = null;
      let ext = "";
      if (size_flac) {
        const downloadLink = (await axios.get<QQAPIDownloadResult>(`${QQ_API_PATH}song/url?id=${songId}&mediaId=${media_mid}&type=flac`, { headers })).data;
        if (downloadLink.result === 100) url = downloadLink.data;
        ext = ".flac";
      }
      if (url === null && size_ape) {
        const downloadLink = (await axios.get<QQAPIDownloadResult>(`${QQ_API_PATH}song/url?id=${songId}&mediaId=${media_mid}&type=ape`, { headers })).data;
        if (downloadLink.result === 100) url = downloadLink.data;
        ext = ".ape";
      }
      if (url === null && size_320mp3) {
        const downloadLink = (await axios.get<QQAPIDownloadResult>(`${QQ_API_PATH}song/url?id=${songId}&mediaId=${media_mid}&type=320`, { headers })).data;
        if (downloadLink.result === 100) url = downloadLink.data;
        ext = ".mp3";
      }
      if (url === null && size_128mp3) {
        const downloadLink = (await axios.get<QQAPIDownloadResult>(`${QQ_API_PATH}song/url?id=${songId}&mediaId=${media_mid}&type=128`, { headers })).data;
        if (downloadLink.result === 100) url = downloadLink.data;
        ext = ".mp3";
      }
      if (url === null) return null;
      const response = await axios.get<Stream>(url, { responseType: "stream" });
      await downloadFromStream(response.data, path.join(MUSIC_FILES_PATH, fileName + ext));
      return fileName + ext;
    } catch {

      return null;
    }
  }
  */
}
