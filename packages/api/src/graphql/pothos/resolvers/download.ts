import Path from "path";
import { MUSIC_FILES_PATH, YTDLP_PATH } from "../../../utils/secret";
import { swapExt } from "../../../utils/path";
import YTDlpWrap from "yt-dlp-wrap";
import { builder } from "../builder";
import {
  pubsub,
  TOPIC_YOUTUBE_DL_PROGRESS,
  PubSubSessionPayload,
} from "../pubsub";
import { YouTubeDlProgressShape } from "../types/download";

const YouTubeDlDownloadOptions = builder.inputType("YouTubeDlDownloadOptions", {
  fields: (t) => ({
    filename: t.string({
      required: false,
      description: "Name of file to save as.",
    }),
    overwrite: t.boolean({
      defaultValue: false,
      description: "Whether to overwrite if a file already exists.",
    }),
  }),
});

function publishDownloadProgress(
  sessionId: string,
  current: number,
  total: number,
  speed: string | null = null,
  eta: string | null = null
): Promise<void> {
  console.log(
    `Download progress of ${sessionId}: ${current} / ${total} @ ${speed} ETA: ${eta}}`
  );
  return pubsub.publish(TOPIC_YOUTUBE_DL_PROGRESS, {
    sessionId,
    data: {
      type: "progress",
      __typename: "YouTubeDlProgressValue",
      current,
      total,
      speed,
      eta,
    },
  } as PubSubSessionPayload<YouTubeDlProgressShape>);
}

function publishDownloadSuccess(sessionId: string): Promise<void> {
  console.log(`Download success: ${sessionId}`);
  return pubsub.publish(TOPIC_YOUTUBE_DL_PROGRESS, {
    sessionId,
    data: { type: "done", __typename: "YouTubeDlProgressDone" },
  } as PubSubSessionPayload<YouTubeDlProgressShape>);
}

function publishDownloadMessage(
  sessionId: string,
  message: string
): Promise<void> {
  console.log(`Download message: ${sessionId}, ${message}`);
  return pubsub.publish(TOPIC_YOUTUBE_DL_PROGRESS, {
    sessionId,
    data: { type: "message", message, __typename: "YouTubeDlProgressMessage" },
  } as PubSubSessionPayload<YouTubeDlProgressShape>);
}

function publishDownloadFail(
  sessionId: string,
  error: unknown
): Promise<void> {
  console.error(`Download failed: ${sessionId}`, error);
  return pubsub.publish(TOPIC_YOUTUBE_DL_PROGRESS, {
    sessionId,
    data: {
      type: "error",
      message: `${error}`,
      __typename: "YouTubeDlProgressError",
    },
  } as PubSubSessionPayload<YouTubeDlProgressShape>);
}

builder.mutationField("youtubeDlDownloadAudio", (t) =>
  t.string({
    nullable: true,
    authScopes: { admin: true },
    description: "Download audio via yt-dlp.",
    args: {
      url: t.arg.string(),
      options: t.arg({ type: YouTubeDlDownloadOptions }),
      sessionId: t.arg.string({ required: false, defaultValue: null }),
    },
    resolve: async (_root, { url, options, sessionId }) => {
      let { filename } = options;
      const { overwrite } = options;
      const ytdlpWrap = new YTDlpWrap(YTDLP_PATH);
      const format = url.includes("nicovideo") ? "best" : "bestaudio";
      if (!filename) {
        const info = await ytdlpWrap.getVideoInfo(["-f", format, url]);
        filename = info.filename;
      }
      if (!filename) {
        throw new Error("Could not determine output filename.");
      }
      filename = swapExt(filename, "mp3");
      const fullPath = Path.resolve(MUSIC_FILES_PATH!, filename);
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
      return new Promise<string>((resolve, reject) => {
        const stream = ytdlpWrap.exec(params);
        console.log(stream);
        stream.on("progress", (progress) => {
          if (sessionId) {
            publishDownloadProgress(
              sessionId,
              progress.percent ?? 0,
              100,
              progress.currentSpeed,
              progress.eta
            );
          }
        });
        stream.on("ytDlpEvent", (event, data) => {
          console.log("yt-dlp event", event, data);
          if (sessionId)
            publishDownloadMessage(sessionId, `[${event}] ${data}`);
        });
        stream.on("error", (err) => {
          console.error("yt-dlp error", err);
          if (sessionId) publishDownloadFail(sessionId, err);
          reject(err);
        });
        stream.on("close", () => {
          console.log("yt-dlp finished downloading!");
          if (sessionId) publishDownloadSuccess(sessionId);
          resolve(filename);
        });
      });
    },
  })
);

builder.queryField("youtubeDlGetInfo", (t) =>
  t.field({
    type: "JSONObject",
    authScopes: { admin: true },
    args: { url: t.arg.string() },
    resolve: async (_root, { url }) => {
      const ytdlpWrap = new YTDlpWrap(YTDLP_PATH);
      const format = url.includes("nicovideo") ? "best" : "bestaudio";
      const info = await ytdlpWrap.getVideoInfo(["-f", format, url]);
      if (Array.isArray(info))
        throw new Error("Playlist download is not supported yet");
      return info;
    },
  })
);
