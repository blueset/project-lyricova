import { NextFunction, Router, Request, Response } from "express";
import { MusicFile } from "../models/MusicFile";
import { Song } from "../models/Song";
import { swapExt } from "../utils/path";
import { promises as fs } from "node:fs";
import { Lyrics } from "lyrics-kit/core";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";
import { SongOfEntry } from "../models/SongOfEntry";
import { entryListingCondition } from "../utils/queries";
import { Entry } from "../models/Entry";
import { entriesPerPage } from "../utils/consts";

export class SongController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/:songId(\\d+)", this.getSong);
    this.router.get("/:songId(\\d+)/lyrics", this.getSongLyrics);
    this.router.get("/:songId(\\d+)/entries", this.getSongEntries);
  }

  public getSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await Song.findByPk(parseInt(req.params.songId), {
        include: [
          {
            model: Artist,
            as: "artists",
            attributes: { exclude: ["vocaDbJson"] },
          },
          {
            model: Album,
            as: "albums",
            attributes: { exclude: ["vocaDbJson"] },
          },
          {
            model: MusicFile,
            as: "files",
            attributes: { exclude: ["fullPath", "path"] },
          },
        ],
        attributes: { exclude: ["vocaDbJson"] },
      });
      if (!song) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }
      res.json(song);
    } catch (e) {
      console.error(e);
      next(e);
    }
  };

  public getSongLyrics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const song = await Song.findByPk(parseInt(req.params.songId), {
        include: ["files"],
      });
      if (!song) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }
      const lyrics = (
        await Promise.all(
          song.files.map(async (f) => {
            const lrcxPath = swapExt(f.fullPath, "lrcx");
            if (await fs.stat(lrcxPath)) {
              return fs.readFile(lrcxPath, "utf8");
            }
            const lrcPath = swapExt(f.fullPath, "lrc");
            if (await fs.stat(lrcPath)) {
              return fs.readFile(lrcPath, "utf8");
            }
            return null;
          })
        )
      )
        .filter((l): l is string => l !== null)
        .map((l) => ({ text: l, parsed: new LyricsKitLyrics(new Lyrics(l)) }));
      res.json(lyrics);
    } catch (e) {
      console.error(e);
      next(e);
    }
  };

  public getSongEntries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const songId = parseInt(req.params.songId);
      const page = parseInt(req.query.page as string) || 1;
      const song = (await Song.findByPk(songId, {
        attributes: ["id", "name"],
      })) as Song;
      if (!song) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }
      const totalEntries = await SongOfEntry.count({
        where: { songId: songId },
      });
      if (totalEntries < 1) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }
      const entries = (await song.$get("lyricovaEntries", {
        ...entryListingCondition,
        order: [["recentActionDate", "DESC"]],
        limit: entriesPerPage,
        offset: (page - 1) * entriesPerPage,
      })) as Entry[];

      res.json({ totalEntries, entries, song, page });
    } catch (e) {
      console.error(e);
      next(e);
    }
  };
}
