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
}
