import { Request, Response, NextFunction, Router } from "express";
import youtubedl, { Options, Info } from "youtube-dl";
import fs from "fs";
import Path from "path";
import { VIDEO_FILES_PATH } from "../utils/secret";
import { promisify } from "util";
import shortid from "shortid";
import { pythonBridge, PythonBridge } from "python-bridge";
import { GraphQLJSONObject } from "graphql-type-json";
import { encrypt, decrypt } from "../utils/crypto";
import { Resolver, Mutation, Arg, Field, InputType, ObjectType, Int, createUnionType, Query, Float } from "type-graphql";
import { GraphQLString } from "graphql";


@InputType()
class YouTubeDlDownloadOptions {
  @Field({ description: "Name of file to save as.", nullable: true })
  filename?: string;

  @Field({ description: "Whether to overwrite if a file already exists.", defaultValue: false })
  overwrite: boolean;
}

@ObjectType()
class YouTubeDlInfo {
  @Field()
  sessionId: string;

  @Field()
  filename: string;

  @Field(type => Int)
  size: number;

  @Field(type => GraphQLJSONObject)
  metadata: Info;
}

@ObjectType()
class YouTubeDlDownloadMessage {
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
class MusicDlSearchResult {

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
export class DownloadController {

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

  @Mutation(returns => YouTubeDLDownloadResponse, { description: "Download audio via youtube-dl." })
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
        const fileStream = fs.createWriteStream(Path.join(VIDEO_FILES_PATH, filename), { flags: "a" });
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
  public youtubeDlAudio(
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
        const fileStream = fs.createWriteStream(Path.join(VIDEO_FILES_PATH, filename + ".$(ext)s"), { flags: "a" });
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

ms = MusicSource()
config.init()

def search(term):
    result = ms.search(
        term, ["baidu", "kugou", "netease", "163", "qq", "migu"]
    )
    data = [
        {
            "source": i.source,
            "title": i.title,
            "artists": i.singer,
            "album": i.album,
            "duration": i.duration,
            "size": i.size,
            "songURL": i.song_url,
            "lyricsURL": i.lyrics_url,
            "coverURL": i.cover_url,
            "pickle": codecs.encode(pickle.dumps(i), "base64").decode()
        }
        for i in result
    ]
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
    outcome.forEach(v => { v.pickle = encrypt(v.pickle); });
    await python.end();
    return outcome;
  }

  /**
   * Download song via music-dl
   * POST .../music-dl
   * <Encrypted pickle data>
   */
  @Mutation(returns => GraphQLString, { nullable: true, description: "Download a file via music-dl and return the path downloaded." })
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
}