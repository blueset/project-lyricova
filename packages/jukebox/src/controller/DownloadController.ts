import { Request, Response, NextFunction, Router } from "express";
import youtubedl, { Options } from "youtube-dl";
import fs from "fs";
import Path from "path";
import { VIDEO_FILES_PATH } from "../utils/secret";
import { promisify } from "util";
import shortid from "shortid";
import { pythonBridge, PythonBridge } from "python-bridge";
import { encrypt, decrypt } from "../utils/crypto";

export class DownloadController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post("/youtubedl/video", this.youtubeDlVideo);
    this.router.get("/youtubedl/info", this.youtubeDlGetInfo);
    this.router.post("/youtubedl/thumbnails", this.youtubeDlGetThumbnail);
    this.router.get("/music-dl", this.musicDlSearch);
    this.router.post("/music-dl", this.musicDlDownload);

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

  /**
   * Download video via youtube-dl 
   * POST /youtubedl/video
   * url=URL_TO_VIDEO
   * &overwrite=1 (optional)
   * &filename=LOCAL_FILENAME (optional)
   */
  public youtubeDlVideo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.body.url;
      if (!url) res.status(400).json({ status: 400, error: "`url` is required." });
      let filename = req.body.filename;
      const params = [];
      if (req.body.overwrite !== "1") {
        params.push("--no-overwrites");
      }
      const video = youtubedl(url, [], {});

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
        res.json({
          sessionId: sessionId,
          filename: info._filename,
          size: info.size,
          metadata: info,
        });
      });

      // Will be called if download was already completed and there is nothing more to download.
      video.on("complete", info => {
        // console.log("filename: " + info._filename + " already downloaded.");
        res.send("Already downloaded");
        this.publishDownloadSuccess(sessionId);
      });

      video.on("end", () => {
        // console.log("finished downloading!");
        res.send("Finished.");
        this.publishDownloadSuccess(sessionId);
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
        res.status(500).send(err);
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * Download video via youtube-dl
   * POST /youtubedl/video
   * url=URL_TO_VIDEO
   * &overwrite=1 (optional)
   * &filename=LOCAL_FILENAME (optional)
   */
  public youtubeDlAudio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.body.url;
      if (!url) res.status(400).json({ status: 400, error: "`url` is required." });
      let filename = req.body.filename;
      const params = [
        "--extract-audio",
        "--audio-format", "mp3",
        "-f", "best",
        "--embed-thumbnail",
        "--add-metadata",
      ];
      if (req.body.overwrite !== "1") {
        params.push("--no-overwrites");
      }
      const video = youtubedl(url, [], {});

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
        res.json({
          sessionId: sessionId,
          filename: info._filename,
          size: info.size,
          metadata: info,
        });
      });

      // Will be called if download was already completed and there is nothing more to download.
      video.on("complete", info => {
        // console.log("filename: " + info._filename + " already downloaded.");
        res.send("Already downloaded");
        this.publishDownloadSuccess(sessionId);
      });

      video.on("end", () => {
        // console.log("finished downloading!");
        res.send("Finished.");
        this.publishDownloadSuccess(sessionId);
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
        res.status(500).send(err);
      });
    } catch (e) {
      next(e);
    }
  }

  /**
   * Get video info via youtube-dl.
   * GET .../youtubedl/info?url=URL_TO_VIDEO
   */
  public youtubeDlGetInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.body.url;
      if (!url) res.status(400).json({ status: 400, error: "`url` is required." });
      const info = await promisify(youtubedl.getInfo)(url);
      res.json(info);
    } catch (e) {
      next(e);
    }
  }

  /**
   * Get video thumbnail via youtube-dl.
   * POST .../youtubedl/thumbnails
   * url=URL_TO_VIDEO
   */
  public youtubeDlGetThumbnail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.body.url;
      if (!url) res.status(400).json({ status: 400, error: "`url` is required." });
      const getThumb = promisify(youtubedl.getThumbs as (url: string, options: Options, callback: (err: unknown, output: string[]) => void) => void);
      const thumbInfo = await getThumb(url, { all: true });
      res.json(thumbInfo);
    } catch (e) {
      next(e);
    }
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
  public musicDlSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.query;
      if (!query) res.status(400).json({ status: 400, error: "`query` is required." });
      const python = await this.prepareMusicDlPythonSession();
      const outcome: { pickle: string }[] = await python`search(${query})`;
      outcome.forEach(v => { v.pickle = encrypt(v.pickle); });
      res.json(outcome);
      await python.end();
    } catch (e) {
      next(e);
    }
  }

  /**
   * Download song via music-dl
   * POST .../music-dl
   * <Encrypted pickle data>
   */
  public musicDlDownload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const encrypted = req.body;
      if (!encrypted) res.status(400).json({ status: 400, error: "payload is required." });
      const payload = decrypt(encrypted);
      const python = await this.prepareMusicDlPythonSession();
      python.stdin.write(payload);
      python.stdin.end();
      const outcome = await python`download()`;
      // TODO: move file to right place
      res.json({ status: 200, path: outcome });
      await python.end();
    } catch (e) {
      next(e);
    }
  }
}