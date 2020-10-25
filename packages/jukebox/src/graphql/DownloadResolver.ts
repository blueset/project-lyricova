import youtubedl, { Info, Options } from "youtube-dl";
import fs from "fs";
import Path from "path";
import { MUSIC_FILES_PATH, MXGET_API_PATH, MXGET_BINARY, VIDEO_FILES_PATH } from "../utils/secret";
import { promisify } from "util";
import shortid from "shortid";
import { pythonBridge, PythonBridge } from "python-bridge";
import { GraphQLJSONObject } from "graphql-type-json";
import { decrypt, encrypt } from "../utils/crypto";
import axios from "axios";
import {
  Arg,
  Authorized,
  createUnionType,
  Field,
  Float, ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver
} from "type-graphql";
import { GraphQLString } from "graphql";
import { exec, execSync } from "child_process";
import { findFilesModifiedAfter } from "../utils/fs";

function asyncExec(command: string): Promise<{ stderr: string, stdout: string }> {
  return new Promise<{ stderr: string; stdout: string }>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) reject(err);
      resolve({ stderr, stdout });
    });
  });
}

type MxGetSourceType = "netease" | "qq" | "migu" | "kugou" | "kuwo" | "xiami" | "qianqian";
const MXGET_SOURCES: MxGetSourceType[] = ["netease", "qq", "migu", "kugou", "kuwo", "xiami", "qianqian"];

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

@ObjectType()
export class MxGetSearchResult implements MxGetSearchResultItem {
  @Field()
  source: MxGetSourceType;
  @Field()
  album: string;
  @Field()
  artist: string;
  @Field(type => ID)
  id: string;
  @Field()
  name: string;
  @Field({ nullable: true })
  listen_url?: string;
  @Field({ nullable: true })
  lyric?: string;
  @Field({ nullable: true })
  pic_url?: string;
}

@InputType()
export class YouTubeDlDownloadOptions {
  @Field({ description: "Name of file to save as.", nullable: true })
  filename?: string;

  @Field({ description: "Whether to overwrite if a file already exists.", defaultValue: false })
  overwrite: boolean;
}

@ObjectType()
export class YouTubeDlInfo {
  @Field()
  sessionId: string;

  @Field()
  filename: string;

  @Field(type => Int, { description: "Size of file in bytes, precision to every 10486 bytes." })
  size: number;

  @Field(type => GraphQLJSONObject)
  metadata: Info;
}

@ObjectType()
export class YouTubeDlDownloadMessage {
  @Field()
  message: string;
}

const YouTubeDLDownloadResponse = createUnionType({
  name: "YouTubeDLDownloadResponse",
  types: () => [YouTubeDlInfo, YouTubeDlDownloadMessage],
  resolveType: value => {
    if ("message" in value) {
      return YouTubeDlDownloadMessage;
    }
    return YouTubeDlInfo;
  }
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

  @Field(type => Float, { nullable: true })
  duration?: number;

  @Field(type => Int, { nullable: true })
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

  constructor() {
    // TODO: find a way to open a global web socket/socket.io
  }

  private publishDownloadProgress(sessionId: string, current: number, total: number) {
    console.log(`Download progress of ${sessionId}: ${current} / ${total}`);
  }

  private publishDownloadSuccess(sessionId: string) {
    console.log(`Download success: ${sessionId}`);
  }

  private publishDownloadFail(sessionId: string, error: unknown) {
    console.log(`Download failed: ${sessionId}, ${error}`);
  }

  @Mutation(returns => YouTubeDLDownloadResponse, { description: "Download video via youtube-dl." })
  public async youTubeDlDownloadVideo(
    @Arg("url") url: string,
    @Arg("options") { overwrite, filename }: YouTubeDlDownloadOptions
  ): Promise<YouTubeDlDownloadMessage | YouTubeDlInfo> {
    // Sadly I had to write my own promise on this sh#t.

    return new Promise((resolve, reject) => {
      const params = [];
      if (!overwrite) {
        params.push("--no-overwrites");
      }
      const video = youtubedl(url, params, {});

      const sessionId = shortid.generate();
      let totalSize = 0;

      video.on("info", info => {
        // console.log("Download started");
        // console.log("filename: " + info._filename);
        // console.log("size: " + info.size);
        // console.log("info", info);
        filename = filename || info._filename;
        const fileStream = fs.createWriteStream(Path.resolve(VIDEO_FILES_PATH, filename), { flags: "a" });
        video.pipe(fileStream);
        totalSize = info.size;
        resolve({
          sessionId: sessionId,
          filename: info._filename,
          size: info.size,
          metadata: info,
        });
      });

      // Will be called if download was already completed and there is nothing more to download.
      video.on("complete", info => {
        // console.log("filename: " + info._filename + " already downloaded.");
        this.publishDownloadSuccess(sessionId);
        resolve({ message: "Already downloaded" });
      });

      video.on("end", () => {
        // console.log("finished downloading!");
        this.publishDownloadSuccess(sessionId);
        resolve({ message: "Already downloaded" });
      });

      let downloaded = 0;
      video.on("data", (chunk) => {
        downloaded += (chunk as unknown as Buffer).length;
        // console.log(`Downloaded ${downloaded} bytes`);
        this.publishDownloadProgress(sessionId, downloaded, totalSize);
      });

      video.on("error", (err) => {
        // console.error("youtube-dl error", err);
        this.publishDownloadFail(sessionId, err);
        reject(err);
      });
    });
  }

  @Mutation(returns => YouTubeDLDownloadResponse, { description: "Download audio via youtube-dl." })
  public youtubeDlDownloadAudio(
    @Arg("url") url: string,
    @Arg("options") { overwrite, filename }: YouTubeDlDownloadOptions
  ): Promise<YouTubeDlDownloadMessage | YouTubeDlInfo> {
    return new Promise((resolve, reject) => {
      const params = [
        "--extract-audio",
        "--audio-format", "mp3",
        "-f", "best",
        "--embed-thumbnail",
        "--add-metadata",
      ];
      if (!overwrite) {
        params.push("--no-overwrites");
      }
      const video = youtubedl(url, params, {});

      const sessionId = shortid.generate();
      let totalSize = 0;

      video.on("info", info => {
        // console.log("Download started");
        // console.log("filename: " + info._filename);
        // console.log("size: " + info.size);
        // console.log("info", info);
        filename = filename || info._filename;
        const fileStream = fs.createWriteStream(Path.resolve(VIDEO_FILES_PATH, filename + ".$(ext)s"), { flags: "a" });
        video.pipe(fileStream);
        totalSize = info.size;
        resolve({
          sessionId: sessionId,
          filename: info._filename,
          size: info.size,
          metadata: info,
        });
      });

      // Will be called if download was already completed and there is nothing more to download.
      video.on("complete", info => {
        // console.log("filename: " + info._filename + " already downloaded.");
        this.publishDownloadSuccess(sessionId);
        resolve({ message: "Already downloaded" });
      });

      video.on("end", () => {
        // console.log("finished downloading!");
        this.publishDownloadSuccess(sessionId);
        resolve({ message: "Finished." });
      });

      let downloaded = 0;
      video.on("data", (chunk) => {
        downloaded += (chunk as unknown as Buffer).length;
        // console.log(`Downloaded ${downloaded} bytes`);
        this.publishDownloadProgress(sessionId, downloaded, totalSize);
      });

      video.on("error", (err) => {
        // console.error("youtube-dl error", err);
        this.publishDownloadFail(sessionId, err);
        reject(err);
      });
    });
  }

  /**
   * Get video info via youtube-dl.
   * GET .../youtubedl/info?url=URL_TO_VIDEO
   */
  @Query(returns => GraphQLJSONObject)
  public async youtubeDlGetInfo(@Arg("url") url: string): Promise<Info> {
    const info = await promisify(youtubedl.getInfo)(url);
    return info;
  }

  /**
   * Get video thumbnail via youtube-dl.
   * POST .../youtubedl/thumbnails
   * url=URL_TO_VIDEO
   */
  @Query(returns => [GraphQLString])
  public async youtubeDlGetThumbnail(@Arg("url") url: string): Promise<string[]> {
    const getThumb = promisify(youtubedl.getThumbs as (url: string, options: Options, callback: (err: unknown, output: string[]) => void) => void);
    const thumbInfo = await getThumb(url, { all: true });
    return thumbInfo;
  }

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

  /**
   * Search songs via music-dl
   * GET .../music-dl?query=QUERY
   */
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

  /**
   * Download song via music-dl
   * POST .../music-dl
   * <Encrypted pickle data>
   */
  @Authorized("ADMIN")
  @Mutation(returns => GraphQLString, {
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
  @Mutation(returns => GraphQLString, {
    nullable: true,
    description: "Download a file via MxGet and return the path downloaded."
  })
  public async mxGetDownload(
    @Arg("source", type => String) source: MxGetSourceType,
    @Arg("id", type => ID) id: MxGetSourceType,
  ): Promise<string> {
    if (MXGET_SOURCES.indexOf(source) < 0) throw new Error(`${source} is not a valid source.`);
    if (!id.match(/^[0-9a-zA-Z]+$/)) throw new Error(`${id} is not a valid ID.`);

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
}