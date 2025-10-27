import { MusicFile } from "../models/MusicFile";
import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
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
import type * as Stream from "stream";
import { downloadFromStream } from "../utils/download";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import tempy from "tempy";
import pLimit from "p-limit";

function setDifference<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter((val) => !other.has(val)));
}

function setIntersect<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter((val) => other.has(val)));
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

const SONG_ID_TAG = "LyricovaSongID",
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
        destination: (req, file, callback) =>
          callback(null, this.uploadDirectory),
        filename: (req, file, callback) => {
          callback(
            null,
            MusicFileController.randomName() + Path.extname(file.originalname)
          );
        },
      }),
      fileFilter: (req, file, callback) => {
        callback(
          null,
          file.originalname.match(/\.(gif|jpg|png|webp|bmp|tif|jpeg)$/gi) !==
            null
        );
      },
    });
    this.router = Router();
    this.router.get("/scan", this.scan);
    this.router.get("/", this.getSongs);
    this.router.get("/:id(\\d+)/file", this.getSongFile);
    this.router.get("/:id(\\d+)/lrc", this.getSongLRC);
    this.router.get("/:id(\\d+)/lrcx", this.getSongLRCX);
    this.router.get("/:id(\\d+)/cover", this.getCoverArt);
    this.router.patch(
      "/:id(\\d+)/cover",
      adminOnlyMiddleware,
      coverUpload.single("cover"),
      this.uploadCoverArt
    );
    this.router.get("/:id(\\d+)", this.getSong);
    this.router.patch("/:id(\\d+)", adminOnlyMiddleware, this.writeToSong);
  }

  /**
   * @openapi
   * /files/scan:
   *   get:
   *     summary: Scan music files directory and sync with database
   *     description: Scans the music files directory, adds new files, updates existing ones, and removes records for deleted files
   *     tags:
   *       - Music Files
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Scan completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: "ok"
   *                 data:
   *                   type: object
   *                   properties:
   *                     added:
   *                       type: integer
   *                       description: Number of new files added to database
   *                       example: 5
   *                     deleted:
   *                       type: integer
   *                       description: Number of database records removed
   *                       example: 2
   *                     updated:
   *                       type: integer
   *                       description: Number of files with updated metadata
   *                       example: 3
   *                     unchanged:
   *                       type: integer
   *                       description: Number of files without changes
   *                       example: 100
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  /** Get metadata of a song via ffprobe */
  private async getSongMetadata(path: string): Promise<GenericMetadata> {
    const metadata = await ffprobe(path);
    const tags = metadata.format.tags;
    const duration = parseFloat(metadata.format.duration);
    return {
      trackName: tags.title || tags.TITLE || undefined,
      trackSortOrder: tags["title-sort"] || tags.TITLESORT || undefined,
      artistName: tags.artist || tags.ARTIST || undefined,
      artistSortOrder: tags["artist-sort"] || tags.ARTISTSORT || undefined,
      albumName: tags.album || tags.ALBUM || undefined,
      albumSortOrder: tags["album-sort"] || tags.ALBUMSORT || undefined,
      hasCover: metadata.streams.some((val) => val.codec_type === "video"),
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
      ...metadata,
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
      ...metadata,
    });
    return entry;
  }

  /** Write metadata to file partially */
  private async writeToFile(file: MusicFile, data: Partial<MusicFile>) {
    let mapping;
    if (file.path.toLowerCase().endsWith(".flac")) {
      mapping = {
        trackSortOrder: "TITLESORT",
        artistSortOrder: "ARTISTSORT",
        albumSortOrder: "ALBUMSORT",
      };
    } else {
      // FFMPEG default
      mapping = {
        trackSortOrder: "title-sort",
        artistSortOrder: "artist-sort",
        albumSortOrder: "album-sort",
      };
    }
    const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
    await ffmetadata.writeAsync(
      file.fullPath,
      {
        title: data.trackName,
        [mapping.trackSortOrder]: data.trackSortOrder,
        album: data.albumName,
        [mapping.albumSortOrder]: data.albumSortOrder,
        artist: data.artistName,
        [mapping.artistSortOrder]: data.artistSortOrder,
        [SONG_ID_TAG]: `${data.songId}`,
        [ALBUM_ID_TAG]: `${data.albumId}`,
      },
      { preserveStreams: true, forceId3v2: forceId3v2 }
    );
  }

  /**
   * @openapi
   * /files/scan:
   *   get:
   *     summary: Scan music files directory and sync with database
   *     description: Scans the music files directory, adds new files, updates existing ones, and removes records for deleted files
   *     tags:
   *       - Music Files
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Scan completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: "ok"
   *                 data:
   *                   type: object
   *                   properties:
   *                     added:
   *                       type: integer
   *                       description: Number of new files added to database
   *                       example: 5
   *                     deleted:
   *                       type: integer
   *                       description: Number of database records removed
   *                       example: 2
   *                     updated:
   *                       type: integer
   *                       description: Number of files with updated metadata
   *                       example: 3
   *                     unchanged:
   *                       type: integer
   *                       description: Number of files without changes
   *                       example: 100
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public scan = async (req: Request, res: Response, next: NextFunction) => {
    const dryRun = false;
    try {
      // Load
      const databaseEntries = await MusicFile.findAll({
        attributes: ["id", "path", "fileSize", "hash", "hasLyrics"],
      });
      const filePaths = glob.sync(`${MUSIC_FILES_PATH}/**/*.{mp3,flac,aiff}`, {
        nosort: true,
        nocase: true,
      });
      const knownPathsSet: Set<string> = new Set(
        databaseEntries.map((entry) => entry.path)
      );
      const filePathsSet: Set<string> = new Set(filePaths);

      const toAdd = setDifference(filePathsSet, knownPathsSet);
      const toUpdate = setIntersect(knownPathsSet, filePathsSet);
      const toDelete = setDifference(knownPathsSet, filePathsSet);

      console.log(
        `toAdd: ${toAdd.size}, toUpdate: ${toUpdate.size}, toDelete: ${toDelete.size}`
      );

      // Remove records from database for removed files
      if (toDelete.size && !dryRun) {
        await MusicFile.destroy({
          where: { path: { [Op.in]: [...toDelete] } },
        });
      }

      console.log("entries deleted.");

      // Add new files to database
      const limit = pLimit(10);

      if (!dryRun) {
        const entriesToAdd = await Promise.all(
          [...toAdd].map((path) =>
            limit(
              async () =>
                (await this.buildSongEntry(path)) as Promise<MusicFile>
            )
          )
        );

        console.log("entries_to_add done.");

        for (const chunk of chunkArray(entriesToAdd)) {
          await MusicFile.bulkCreate(chunk);
        }
      }

      console.log("entries added.");

      // update songs into database
      console.log("entries updated.");

      const toUpdateEntries = databaseEntries.filter((entry) =>
        toUpdate.has(entry.path)
      );
      let updateResults: MusicFile[] = [];
      if (!dryRun) {
        updateResults = await Promise.all(
          toUpdateEntries.map((entry) =>
            limit(async () => this.updateSongEntry(entry))
          )
        );
      }

      const updatedCount = updateResults.reduce(
        (prev: number, curr) => prev + (curr === null ? 0 : 1),
        0
      );
      res.send({
        status: "ok",
        data: {
          added: toAdd.size,
          deleted: toDelete.size,
          updated: updatedCount,
          unchanged: toUpdate.size - updatedCount,
        },
      });
    } catch (e) {
      next(e);
    }
  };

  /**
   * @openapi
   * /files:
   *   get:
   *     summary: Get all music files
   *     tags:
   *       - Music Files
   *     responses:
   *       200:
   *         description: List of all music files
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/MusicFile'
   */
  public getSongs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const songs = await MusicFile.findAll();
      return res.json(songs);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @openapi
   * /files/{id}:
   *   get:
   *     summary: Get a music file by ID
   *     tags:
   *       - Music Files
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *     responses:
   *       200:
   *         description: Music file details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MusicFile'
   *       404:
   *         description: Music file not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Not found"
   */
  public getSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Not found" });
      }
      return res.json(song);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @openapi
   * /files/{id}/file:
   *   get:
   *     summary: Download music file
   *     description: Streams the actual music file (audio file)
   *     tags:
   *       - Music Files
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *       - in: query
   *         name: download
   *         required: false
   *         schema:
   *           type: boolean
   *         description: If present, triggers download with Content-Disposition header
   *     responses:
   *       200:
   *         description: The music file
   *         content:
   *           audio/mpeg: {}
   *           audio/flac: {}
   *           audio/aiff: {}
   *       404:
   *         description: Music file entry or physical file not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: 404
   *                 message:
   *                   type: string
   *                   enum: ["Entry not found", "File not found"]
   */
  public getSongFile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res
          .status(404)
          .json({ status: 404, message: "Entry not found" });
      }
      const path = song.fullPath;
      if (!fs.existsSync(path)) {
        return res.status(404).json({ status: 404, message: "File not found" });
      }
      res.header("Cache-Control", "public, max-age=604800");
      if (req.query.download !== undefined) {
        res.attachment(Path.basename(path));
      }
      res.sendFile(path);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @openapi
   * /files/{id}/lrc:
   *   get:
   *     summary: Download LRC lyrics file
   *     description: Retrieves the LRC lyrics file associated with the music file
   *     tags:
   *       - Music Files
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *       - in: query
   *         name: download
   *         required: false
   *         schema:
   *           type: boolean
   *         description: If present, triggers download with Content-Disposition header
   *     responses:
   *       200:
   *         description: The LRC lyrics file
   *         content:
   *           text/lrc: {}
   *       404:
   *         description: Music file entry or lyrics file not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: 404
   *                 message:
   *                   type: string
   *                   enum: ["Entry not found", "File not found"]
   */
  public getSongLRC = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res
          .status(404)
          .json({ status: 404, message: "Entry not found" });
      }
      const path = swapExt(song.fullPath, "lrc");
      if (!fs.existsSync(path)) {
        return res.status(404).json({ status: 404, message: "File not found" });
      }

      if (req.query.download !== undefined) {
        res.attachment(Path.basename(path));
      }
      res.contentType("text/lrc").sendFile(path);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @openapi
   * /files/{id}/lrcx:
   *   get:
   *     summary: Download LRCX lyrics file
   *     description: Retrieves the LRCX lyrics file associated with the music file
   *     tags:
   *       - Music Files
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *       - in: query
   *         name: download
   *         required: false
   *         schema:
   *           type: boolean
   *         description: If present, triggers download with Content-Disposition header
   *     responses:
   *       200:
   *         description: The LRCX lyrics file
   *         content:
   *           text/lrcx: {}
   *       404:
   *         description: Music file entry or lyrics file not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: 404
   *                 message:
   *                   type: string
   *                   enum: ["Entry not found", "File not found"]
   */
  public getSongLRCX = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res
          .status(404)
          .json({ status: 404, message: "Entry not found" });
      }
      const path = swapExt(song.fullPath, "lrcx");
      if (!fs.existsSync(path)) {
        return res.status(404).json({ status: 404, message: "File not found" });
      }

      if (req.query.download !== undefined) {
        res.attachment(Path.basename(path));
      }
      res.contentType("text/lrcx").sendFile(path);
    } catch (e) {
      next(e);
    }
  };

  /**
   * @openapi
   * /files/{id}:
   *   patch:
   *     summary: Update music file metadata
   *     description: Updates metadata for a music file and writes changes to the physical file
   *     tags:
   *       - Music Files
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               songId:
   *                 $ref: '#/components/schemas/MusicFile/properties/songId'
   *               albumId:
   *                 $ref: '#/components/schemas/MusicFile/properties/albumId'
   *               trackName:
   *                 $ref: '#/components/schemas/MusicFile/properties/trackName'
   *               trackSortOrder:
   *                 $ref: '#/components/schemas/MusicFile/properties/trackSortOrder'
   *               albumName:
   *                 $ref: '#/components/schemas/MusicFile/properties/albumName'
   *               albumSortOrder:
   *                 $ref: '#/components/schemas/MusicFile/properties/albumSortOrder'
   *               artistName:
   *                 $ref: '#/components/schemas/MusicFile/properties/artistName'
   *               artistSortOrder:
   *                 $ref: '#/components/schemas/MusicFile/properties/artistSortOrder'
   *     responses:
   *       200:
   *         description: Updated music file
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MusicFile'
   *       404:
   *         description: Music file not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Not found"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public writeToSong = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, message: "Not found" });
      }

      const data = _.pick(req.body, [
        "songId",
        "albumId",
        "trackName",
        "trackSortOrder",
        "albumName",
        "albumSortOrder",
        "artistName",
        "artistSortOrder",
      ]);

      // write song file
      await this.writeToFile(song, data);

      _.assign(song, data);
      await song.save();
      return res.json(song);
    } catch (e) {
      next(e);
    }
  };

  /**
   * Retrieve cover art of a music file. Should return a file or nothing.
   *
   * Not in GraphQL.
   *
   * @openapi
   * /files/{id}/cover:
   *   get:
   *     summary: Get cover art for music file
   *     description: Extracts and returns the embedded cover art from the music file
   *     tags:
   *       - Music Files
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *     responses:
   *       200:
   *         description: Cover art image
   *         content:
   *           image/png: {}
   *       404:
   *         description: Music file not found or has no cover art
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: 404
   *                 message:
   *                   type: string
   *                   enum:
   *                     - "Music file entry not found."
   *                     - "Music file has no cover (via database)."
   *                     - "Music file has no cover (via file)."
   *       500:
   *         description: Error extracting cover art
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   const: 500
   *                 message:
   *                   type: string
   *                   description: Error message
   */
  public getCoverArt = async (req: Request, res: Response) => {
    const musicFile = await MusicFile.findByPk(parseInt(req.params.id));
    if (musicFile === null) {
      return res
        .status(404)
        .json({ status: 404, message: "Music file entry not found." });
    }

    if (!musicFile.hasCover) {
      return res.status(404).json({
        status: 404,
        message: "Music file has no cover (via database).",
      });
    }

    const coverUrl = tempy.file({ extension: "png" });
    try {
      await ffmetadata.readAsync(musicFile.fullPath, { coverUrl: coverUrl });
    } catch (e) {
      console.log("Error while extracting cover art from file", e);
      return res.status(500).json({ status: 404, message: e });
    }

    if (!fs.existsSync(coverUrl)) {
      return res
        .status(404)
        .json({ status: 404, message: "Music file has no cover (via file)." });
    }

    res.header("Cache-Control", "public, max-age=604800");
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
   *
   * @openapi
   * /files/{id}/cover:
   *   patch:
   *     summary: Upload cover art for music file
   *     description: Uploads and embeds cover art into a music file from either a file upload or a remote URL
   *     tags:
   *       - Music Files
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the music file
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             oneOf:
   *               - type: object
   *                 title: Cover art file
   *                 description: Image file to use as cover art
   *                 required: [cover]
   *                 properties:
   *                   cover:
   *                     type: string
   *                     format: binary
   *               - type: object
   *                 title: URL
   *                 description: URL to download cover art from
   *                 required: [url]
   *                 properties:
   *                   url:
   *                     type: string
   *                     format: uri
   *     responses:
   *       200:
   *         description: Cover art uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 200
   *                 message: "Done."
   *       404:
   *         description: Music file entry not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Music file entry not found."
   *       415:
   *         description: Unsupported media type
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                   example: 415
   *                 message:
   *                   type: string
   *                   example: "image/svg+xml is not an acceptable MIME type."
   *       422:
   *         description: Neither cover nor url was provided
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 422
   *                 message: "Either `cover` or `url` must be provided."
   *       500:
   *         description: Error saving cover art to file
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                   example: 500
   *                 message:
   *                   type: string
   *                   example: "Error saving cover art to file"
   *       504:
   *         description: Error downloading cover from remote URL
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                   example: 504
   *                 message:
   *                   type: string
   *                   example: "Request to download the cover has returned a 404 error."
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public uploadCoverArt = async (req: Request, res: Response) => {
    let coverPath = "";

    try {
      const musicFile = await MusicFile.findByPk(parseInt(req.params.id));
      if (musicFile === null) {
        return res
          .status(404)
          .json({ status: 404, message: "Music file entry not found." });
      }

      try {
        if (req.body.url) {
          const response = await axios.get<Stream>(req.body.url, {
            responseType: "stream",
          });
          if (response.status !== 200) {
            return res.status(504).json({
              status: 504,
              message: `Request to download the cover has returned a ${response.status} error.`,
            });
          }
          const contentType = response.headers?.["content-type"] ?? "";
          if (!contentType.startsWith("image/")) {
            return res.status(415).json({
              status: 415,
              message: `${contentType} is not an acceptable MIME type.`,
            });
          }
          coverPath = Path.join(
            this.uploadDirectory,
            `${MusicFileController.randomName()}.${mime.getExtension(
              contentType
            )}`
          );
          await downloadFromStream(response.data, coverPath);
        } else if (req.file) {
          coverPath = req.file.path;
        } else {
          return res.status(422).json({
            status: 422,
            message: "Either `cover` or `url` must be provided.",
          });
        }

        await ffmetadata.writeAsync(
          musicFile.fullPath,
          {},
          {
            forceId3v2: musicFile.path.toLowerCase().endsWith(".aiff"),
            attachments: [coverPath],
          }
        );
      } catch (e) {
        console.log("Error while saving cover art to file", e);
        return res.status(500).json({ status: 500, message: e });
      }

      // Update file hash
      const md5 = await hasha.fromFile(musicFile.fullPath, {
        algorithm: "md5",
      });
      await musicFile.update({ hash: md5, hasCover: true });

      res.status(200).json({ status: 200, message: "Done." });
    } finally {
      if (coverPath && fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
  };
}
