import { MusicFile } from "../models/MusicFile";
import { Request, Response, NextFunction, Router } from "express";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";
import ffprobe from "ffprobe-client";
import { writeAsync as ffMetadataWrite } from "../utils/ffmetadata";
import fs from "fs";
import hasha from "hasha";
import pLimit from "p-limit";
import { Op } from "sequelize";
import Path from "path";
import chunkArray from "../utils/chunkArray";
import _ from "lodash";

function setDifference<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter(val => !other.has(val)));
}

function setUnion<T>(self: Set<T>, other: Set<T>): Set<T> {
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
  songId: string;
  albumId: string;
  // playlists: string[];
}

const
  SONG_ID_TAG = "LyricovaSongID",
  ALBUM_ID_TAG = "LyricovaAlbumID",
  PLAYLIST_IDS_TAG = "LyricovaPlaylistIDs";

export class MusicFileController {

  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/scan", this.scan);
    this.router.get("/", this.getSongs);
    this.router.get("/:id(\\d+)", this.getSong);
    this.router.patch("/:id(\\d+)", this.writeToSong);
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
      songId: tags[SONG_ID_TAG] || undefined,
      albumId: tags[ALBUM_ID_TAG] || undefined,
      // formatName: get(metadata, "format.format_name", ""),
      // playlists: tags[PLAYLIST_IDS_TAG] ? tags[PLAYLIST_IDS_TAG].split(",") : undefined,
    };
  }

  /** Make a new MusicFile object from file path. */
  private async buildSongEntry(path: string): Promise<object> {
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
    await ffMetadataWrite(Path.resolve(MUSIC_FILES_PATH, file.path), {
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
      const toUpdate = setUnion(knownPathsSet, filePathsSet);
      const toDelete = setDifference(knownPathsSet, filePathsSet);

      console.log(`toAdd: ${toAdd.size}, toUpdate: ${toUpdate.size}, toDelete: ${toDelete.size}`);

      // Remove records from database for removed files
      if (toDelete.size) {
        await MusicFile.destroy({ where: { path: { [Op.in]: [...toDelete] } } });
      }

      console.log("entries deleted.");

      // Add new files to database
      const limit = pLimit(10);

      const entriesToAdd = await Promise.all(
        [...toAdd].map(path => limit(async () => this.buildSongEntry(path)))
      );

      console.log("entries_to_add done.");

      for (const chunk of chunkArray(entriesToAdd)) {
        await MusicFile.bulkCreate(chunk);
      }

      console.log("entries added.");

      // update songs into database
      const toUpdateEntries = databaseEntries.filter(entry =>
        toUpdate.has(entry.path)
      );
      const updateResults = await Promise.all(
        toUpdateEntries.map(entry =>
          limit(async () => this.updateSongEntry(entry))
        )
      );

      console.log("entries updated.");

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
  }

  public getSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, text: "Not found" });
      }
      return res.json(song);
    } catch (e) { next(e); }
  }

  public writeToSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await MusicFile.findByPk(parseInt(req.params.id));
      if (song === null) {
        return res.status(404).json({ status: 404, text: "Not found" });
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
  }
}
