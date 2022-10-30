import { MusicFile } from "../models/MusicFile";
import { Request, Response, NextFunction, Router } from "express";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";
import ffprobe from "ffprobe-client";
import ffmetadata from "../utils/ffmetadata";
import fs from "fs";
import hasha from "hasha";
import { Op } from "sequelize";
import Path from "path";
import chunkArray from "../utils/chunkArray";
import _ from "lodash";
import crypto from "crypto";
import multer from "multer";
import { swapExt } from "../utils/path";
import axios from "axios";
import mime from "mime";
import * as Stream from "stream";
import { downloadFromStream } from "../utils/download";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import tempy from "tempy";
import pLimit from "p-limit";

function setDifference<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter(val => !other.has(val)));
}

function setIntersect<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter(val => other.has(val)));
}

interface GenericMetadata {
  trackName?: string;
  trackSortOrder?: string;
  artistName?: string;
  artistSortOrder?: string;
  albumName?: string;
  albumSortOrder?: string;
  hasCover: boolean;
  duration: number;
  fileSize: number;
  // formatName?: string;
  songId: number;
  albumId: number;
  // playlists: string[];
}

const
  SONG_ID_TAG = "LyricovaSongID",
  ALBUM_ID_TAG = "LyricovaAlbumID";

export class MusicFileController {

  public router: Router;
  private readonly uploadDirectory: string;

  private static randomName(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  constructor() {
    this.uploadDirectory = tempy.directory();
    const coverUpload = multer({
      storage: multer.diskStorage({
        destination: (req, file, callback) => callback(null, this.uploadDirectory),
        filename: (req, file, callback) => {
          callback(null, MusicFileController.randomName() + Path.extname(file.originalname));
        }
      }),
      fileFilter: (req, file, callback) => {
        callback(null, file.originalname.match(/\.(gif|jpg|png|webp|bmp|tif|jpeg)$/gi) !== null);
      }
    });
    this.router = Router();
    this.router.get("/scan", this.scan);
    this.router.get("/", this.getSongs);
    this.router.get("/:id(\\d+)/file", this.getSongFile);
    this.router.get("/:id(\\d+)/lrc", this.getSongLRC);
    this.router.get("/:id(\\d+)/lrcx", this.getSongLRCX);
    this.router.get("/:id(\\d+)/cover", this.getCoverArt);
    this.router.patch("/:id(\\d+)/cover", adminOnlyMiddleware, coverUpload.single("cover"), this.uploadCoverArt);
    this.router.get("/:id(\\d+)", this.getSong);
    this.router.patch("/:id(\\d+)", adminOnlyMiddleware, this.writeToSong);
  }

  /** Get metadata of a song via ffprobe */
  private async getSongMetadata(path: string): Promise<GenericMetadata> {
    const metadata = await ffprobe(path);
    const tags = metadata.format.tags;
    const duration = parseFloat(metadata.format.duration);
    return {
      trackName: tags.title || tags.TITLE || undefined,
      trackSortOrder: tags["title-sort"] || tags.TITLESORT || undefined,
      artistName: tags.artist || tags.ARTIST || undefined,
      artistSortOrder:
        tags["artist-sort"] || tags.ARTISTSORT || undefined,
      albumName: tags.album || tags.ALBUM || undefined,
      albumSortOrder: tags["album-sort"] || tags.ALBUMSORT || undefined,
      hasCover: metadata.streams.some(val => val.codec_type === "video"),
      duration: isNaN(duration) ? -1 : duration,
      fileSize: parseInt(metadata.format.size),
      songId: parseInt(tags[SONG_ID_TAG]) || undefined,
      albumId: parseInt(tags[ALBUM_ID_TAG]) || undefined,
      // formatName: get(metadata, "format.format_name", ""),
      // playlists: tags[PLAYLIST_IDS_TAG] ? tags[PLAYLIST_IDS_TAG].split(",") : undefined,
    };
  }

  /** Make a new MusicFile object from file path. */
  private async buildSongEntry(path: string): Promise<Partial<MusicFile>> {
    const md5Promise = hasha.fromFile(path, { algorithm: "md5" });
    const metadataPromise = this.getSongMetadata(path);
    const md5 = await md5Promise,
      metadata = await metadataPromise;
    const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
    const hasLyrics = fs.existsSync(lrcPath);
    return {
      path: Path.relative(MUSIC_FILES_PATH, path),
      hasLyrics: hasLyrics,
      hash: md5,
      needReview: true,
      ...metadata
    };
  }

  /** Update an existing MusicFile object with data in file. */
  private async updateSongEntry(entry: MusicFile): Promise<MusicFile | null> {
    let needUpdate = false;
    const path = entry.path;
    const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
    const hasLyrics = fs.existsSync(lrcPath);
    needUpdate = needUpdate || hasLyrics !== entry.hasLyrics;
    const fileSize = fs.statSync(path).size;
    const md5 = await hasha.fromFile(path, { algorithm: "md5" });
    needUpdate = needUpdate || md5 !== entry.hash;
    if (!needUpdate) return null;

    const metadata = await this.getSongMetadata(path);
    entry = await entry.update({
      path: Path.relative(MUSIC_FILES_PATH, path),
      hasLyrics: hasLyrics,
      fileSize: fileSize,
      hash: md5,
      needReview: true,
      ...metadata
    });
    return entry;
  }

  /** Write metadata to file partially */
  private async writeToFile(file: MusicFile, data: Partial<MusicFile>) {
    let mapping;
    if (file.path.toLowerCase().endsWith(".flac")) {
      mapping = { trackSortOrder: "TITLESORT", artistSortOrder: "ARTISTSORT", albumSortOrder: "ALBUMSORT" };
    } else { // FFMPEG default
      mapping = { trackSortOrder: "title-sort", artistSortOrder: "artist-sort", albumSortOrder: "album-sort" };
    }
    const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
    await ffmetadata.writeAsync(file.fullPath, {
      title: data.trackName,
      [mapping.trackSortOrder]: data.trackSortOrder,
      album: data.albumName,
      [mapping.albumSortOrder]: data.albumSortOrder,
      artist: data.artistName,
      [mapping.artistSortOrder]: data.artistSortOrder,
      [SONG_ID_TAG]: `${data.songId}`,
      [ALBUM_ID_TAG]: `${data.albumId}`
    }, { preserveStreams: true, forceId3v2: forceId3v2 });
  }

  public scan = async (req: Request, res: Response, next: NextFunction) => {
    const dryRun = false;
    try {
      // Load
      const databaseEntries = await MusicFile.findAll({
        attributes: ["id", "path", "fileSize", "hash", "hasLyrics"]
      });
      const filePaths = glob.sync(
        `${MUSIC_FILES_PATH}/**/*.{mp3,flac,aiff}`,
        {
          nosort: true,
          nocase: true
        }
      );
      const knownPathsSet: Set<string> = new Set(
        databaseEntries.map(entry => entry.path)
      );
      const filePathsSet: Set<string> = new Set(filePaths);

      const toAdd = setDifference(filePathsSet, knownPathsSet);
      const toUpdate = setIntersect(knownPathsSet, filePathsSet);
      const toDelete = setDifference(knownPathsSet, filePathsSet);

      console.log(`toAdd: ${toAdd.size}, toUpdate: ${toUpdate.size}, toDelete: ${toDelete.size}`);

      // Remove records from database for removed files
      if (toDelete.size && !dryRun) {
        await MusicFile.destroy({ where: { path: { [Op.in]: [...toDelete] } } });
      }

      console.log("entries deleted.");

      // Add new files to database
      const limit = pLimit(10);

      if (!dryRun) {
        const entriesToAdd = await Promise.all(
          [...toAdd].map(path => limit(async () => await this.buildSongEntry(path) as Promise<MusicFile>))
        );

        console.log("entries_to_add done.");

        for (const chunk of chunkArray(entriesToAdd)) {
          await MusicFile.bulkCreate(chunk);
        }
      }

      console.log("entries added.");

      // update songs into database
      console.log("entries updated.");

      const toUpdateEntries = databaseEntries.filter(entry =>
        toUpdate.has(entry.path)
      );
      let updateResults = [];
      if (!dryRun) {
        updateResults = await Promise.all(
          toUpdateEntries.map(entry =>
            limit(async () => this.updateSongEntry(entry))
          )
        );
      }

      const updatedCount = updateResults.reduce(
        (prev: number, curr) => prev + (curr === null ? 0 : 1),
        0
      ) as number;
      res.send({
        status: "ok",
        data: {
          added: toAdd.size,
          deleted: toDelete.size,
          updated: updatedCount,
          unchanged: toUpdate.size - updatedCount
        }
      });
    } catch (e) { next(e); }
  };

  public getSongs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const songs = await MusicFile.findAll();
      return res.json(songs);
    } catch (e) { next(e); }
  };

  public getSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Not found" });
      }
      return res.json(song);
    } catch (e) { next(e); }
  };

  public getSongFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Entry not found" });
      }
      const path = song.fullPath;
      if (!fs.existsSync(path)) {
        return res.status(404).json({ status: 404, message: "File not found" });
      }

      if (req.query.download !== undefined) {
        res.attachment(Path.basename(path));
      }
      res
        .sendFile(path);
    } catch (e) { next(e); }
  };

  public getSongLRC = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Entry not found" });
      }
      const path = swapExt(song.fullPath, "lrc");
      if (!fs.existsSync(path)) {
        return res.status(404).json({ status: 404, message: "File not found" });
      }

      if (req.query.download !== undefined) {
        res.attachment(Path.basename(path));
      }
      res
        .contentType("text/lrc")
        .sendFile(path);
    } catch (e) { next(e); }
  };

  public getSongLRCX = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Entry not found" });
      }
      const path = swapExt(song.fullPath, "lrcx");
      if (!fs.existsSync(path)) {
        return res.status(404).json({ status: 404, message: "File not found" });
      }

      if (req.query.download !== undefined) {
        res.attachment(Path.basename(path));
      }
      res
        .contentType("text/lrcx")
        .sendFile(path);
    } catch (e) { next(e); }
  };



  public writeToSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Not found" });
      }

      const data = _.pick(req.body, [
        "songId", "albumId", "trackName", "trackSortOrder", "albumName", "albumSortOrder",
        "artistName", "artistSortOrder"
      ]);

      // write song file
      await this.writeToFile(song, data);

      _.assign(song, data);
      await song.save();
      return res.json(song);
    } catch (e) { next(e); }
  };

  /**
   * Retrieve cover art of a music file. Should return a file or nothing.
   * 
   * Not in GraphQL.
   */
  public getCoverArt = async (req: Request, res: Response, next: NextFunction) => {
    const musicFile = await MusicFile.findByPk(parseInt(req.params.id));
    if (musicFile === null) {
      return res.status(404).json({ status: 404, message: "Music file entry not found." });
    }

    if (!musicFile.hasCover) {
      return res.status(404).json({ status: 404, message: "Music file has no cover (via database)." });
    }

    const coverUrl = tempy.file({ extension: "png" });
    try {
      await ffmetadata.readAsync(musicFile.fullPath, { coverUrl: coverUrl });
    } catch (e) {
      console.log("Error while extracting cover art from file", e);
      return res.status(500).json({ status: 404, message: e });
    }
    console.debug("Cover path", coverUrl);

    if (!fs.existsSync(coverUrl)) {
      return res.status(404).json({ status: 404, message: "Music file has no cover (via file)." });
    }

    res.sendFile(coverUrl, () => {
      fs.unlinkSync(coverUrl);
    });
  };

  /**
   * Upload cover art for a music file.
   *
   * Not in GraphQL.
   *
   * PATCH request of multipart-form
   * Fields:
   * - cover (optional) picture file
   * - url (optional) path to remote picture file
   *
   * Note:
   *   Either cover or url must be supplied.
   */
  public uploadCoverArt = async (req: Request, res: Response, next: NextFunction) => {
    let coverPath = "";

    try {
      const musicFile = await MusicFile.findByPk(parseInt(req.params.id));
      if (musicFile === null) {
        return res.status(404).json({ status: 404, message: "Music file entry not found." });
      }

      try {
        if (req.body.url) {
          const response = await axios.get<Stream>(req.body.url, {responseType: "stream"});
          if (response.status !== 200) {
            return res.status(504).json({ status: 594, message: `Request to download the cover has returned a ${response.status} error.` });
          }
          const contentType = response.headers?.["content-type"] ?? "";
          if (!contentType.startsWith("image/")) {
            return res.status(415).json({ status: 415, message: `${contentType} is not an acceptable MIME type.` });
          }
          coverPath = Path.join(this.uploadDirectory, `${MusicFileController.randomName()}.${mime.getExtension(contentType)}`);
          await downloadFromStream(response.data, coverPath);
        } else if (req.file) {
          coverPath = req.file.path;
        } else {
          return res.status(422).json({ status: 422, message: "Either `cover` or `url` must be provided." });
        }

        await ffmetadata.writeAsync(musicFile.fullPath, {}, {
          forceId3v2: musicFile.path.toLowerCase().endsWith(".aiff"),
          attachments: [coverPath],
        });
      } catch (e) {
        console.log("Error while saving cover art to file", e);
        return res.status(500).json({ status: 500, message: e });
      }
      console.debug("Cover path", coverPath);

      // Update file hash
      const md5 = await hasha.fromFile(musicFile.fullPath, { algorithm: "md5" });
      await musicFile.update({ hash: md5, hasCover: true });

      res.status(200).json({ status: 200, message: "Done." });

    } finally {
      if (coverPath && fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
  };
}
