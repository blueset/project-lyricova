import { getRepository, Repository, In } from "typeorm";
import { MusicFile } from "../entity/MusicFile";
import { Request, Response, NextFunction } from "express";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";
import ffprobe, { Metadata } from "ffprobe-client";
import { get, filter } from "lodash";
import fs from "fs";
import hasha from "hasha";
import pLimit from "p-limit";
import { setFlagsFromString } from "v8";

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
}

export class MusicFileController {
  private musicFileRepository: Repository<MusicFile>;

  constructor() {
    this.musicFileRepository = getRepository(MusicFile);
  }

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
      fileSize: parseInt(metadata.format.size)
      // formatName: get(metadata, "format.format_name", "")
    };
  }

  private async addSong(path: string) {
    const md5Promise = hasha.fromFile(path, { algorithm: "md5" });
    const metadataPromise = this.getSongMetadata(path);
    const md5 = await md5Promise,
      metadata = await metadataPromise;
    const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
    const hasLyrics = fs.existsSync(lrcPath);
    const newFile = this.musicFileRepository.create({
      path: path,
      hasLyrics: hasLyrics,
      hash: md5,
      needReview: true,
      ...metadata
    });
    await this.musicFileRepository.insert(newFile);
  }

  private async updateSong(entry: MusicFile): Promise<MusicFile | null> {
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
    entry = this.musicFileRepository.merge(entry, {
      path: path,
      hasLyrics: hasLyrics,
      fileSize: fileSize,
      hash: md5,
      needReview: true,
      ...metadata
    });
    await this.musicFileRepository.save(entry);
    return entry;
  }

  public scan = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    /**
     * Workflow:
     * - Scan path
     * - Load database
     * - For each file
     *    - if file not in database -> enrol
     *    - else:
     *      - check file size: same -> pass
     *      - check md5: same -> pass
     *      - update
     *      - mark as need to verify
     */
    console.log("this", this);
    console.dir(this);
    // Load
    const databaseEntries = await this.musicFileRepository.find({
      select: ["id", "path", "fileSize", "hash", "hasLyrics"]
    });
    const filePaths = glob.sync(
      `${MUSIC_FILES_PATH}/**/*.{mp3,flac,aiff}`,
      {
        nosort: true,
        nocase: true
      }
    );
    const lrcPaths = glob.sync(`${MUSIC_FILES_PATH}/**/*.lrc`, {
      nosort: true,
      nocase: true
    });
    const knownPathsSet: Set<string> = new Set(
      databaseEntries.map(entry => entry.path)
    );
    const filePathsSet: Set<string> = new Set(filePaths);

    const toAdd = setDifference(filePathsSet, knownPathsSet);
    const toUpdate = setUnion(knownPathsSet, filePathsSet);
    const toDelete = setDifference(knownPathsSet, filePathsSet);

    // Remove records from database for removed files
    if (toDelete.size) {
      await this.musicFileRepository.delete({
        path: In([...toDelete])
      });
    }

    // Add new files to database
    const limit = pLimit(10);

    await Promise.all(
      [...toAdd].map(path => limit(async () => this.addSong(path)))
    );

    // update songs into database
    const toUpdateEntries = databaseEntries.filter(entry =>
      toUpdate.has(entry.path)
    );
    const updateResults = await Promise.all(
      toUpdateEntries.map(entry =>
        limit(async () => this.updateSong(entry))
      )
    );

    const updatedCount = updateResults.reduce(
      (prev, curr) => prev + (curr === null ? 0 : 1),
      0
    );
    res.send({
      status: "ok",
      data: {
        added: toAdd.size,
        deleted: toDelete.size,
        updated: updatedCount,
        unchanged: toUpdate.size - updatedCount
      }
    });
  };
}
