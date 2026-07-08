import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { requireNumericParams } from "../utils/numericParam.js";
import { and, desc, eq, isNull } from "drizzle-orm";
import { promises as fs } from "node:fs";
import { Lyrics } from "lyrics-kit/core";
import { db } from "../drizzle/client.js";
import { Songs, SongOfEntries, Entries } from "../drizzle/schema.js";
import { parseEnumArray } from "../drizzle/enumArray.js";
import { fullPathOf } from "../utils/musicFileScan.js";
import { swapExt } from "../utils/path.js";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects.js";
import { entryHasMainVerse, fetchEntriesListing } from "../utils/queries.js";
import { entriesPerPage } from "../utils/consts.js";

export class SongController {
  public router: Router;

  constructor() {
    this.router = Router();
    requireNumericParams(this.router, "songId");
    this.router.get("/:songId", this.getSong);
    this.router.get("/:songId/lyrics", this.getSongLyrics);
    this.router.get("/:songId/entries", this.getSongEntries);
  }

  /**
   * @openapi
   * /songs/{songId}:
   *   get:
   *     summary: Get a song by ID
   *     tags:
   *       - Songs
   *     parameters:
   *       - in: path
   *         name: songId
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the song to retrieve
   *     responses:
   *       200:
   *         description: Song details
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/Song'
   *                 - type: object
   *                   properties:
   *                     artists:
   *                       type: array
   *                       items:
   *                         allOf:
   *                           - $ref: '#/components/schemas/Artist'
   *                           - type: object
   *                             properties:
   *                               ArtistOfSong:
   *                                 $ref: '#/components/schemas/ArtistOfSong'
   *                     albums:
   *                       type: array
   *                       items:
   *                         allOf:
   *                           - $ref: '#/components/schemas/Album'
   *                           - type: object
   *                             properties:
   *                               SongInAlbum:
   *                                 $ref: '#/components/schemas/SongInAlbum'
   *                     files:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/MusicFile'
   *       404:
   *         description: Song not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Song not found"
   */
  public getSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await db.query.Songs.findFirst({
        where: and(
          eq(Songs.id, parseInt(req.params.songId as string)),
          isNull(Songs.deletionDate),
        ),
        columns: { vocaDbJson: false },
        with: {
          artistOfSongs: {
            with: { artist: { columns: { vocaDbJson: false } } },
          },
          songInAlbums: {
            with: { album: { columns: { vocaDbJson: false } } },
          },
          files: { columns: { path: false } },
        },
      });
      if (!song) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }

      const { artistOfSongs, songInAlbums, files, ...songCols } = song;
      const artists = (artistOfSongs ?? [])
        .filter((a) => a.artist && !a.artist.deletionDate)
        .map((a) => {
          const { artist, ...junction } = a;
          return {
            ...artist!,
            ArtistOfSong: {
              ...junction,
              artistRoles: parseEnumArray(junction.artistRoles),
              categories: parseEnumArray(junction.categories),
            },
          };
        })
        .sort((x, y) => x.id - y.id);
      const albums = (songInAlbums ?? [])
        .filter((a) => a.album && !a.album.deletionDate)
        .map((a) => {
          const { album, ...junction } = a;
          return { ...album!, SongInAlbum: junction };
        })
        .sort((x, y) => x.id - y.id);
      const filesSorted = [...(files ?? [])].sort((x, y) => x.id - y.id);

      res.json({ ...songCols, artists, albums, files: filesSorted });
    } catch (e) {
      console.error(e);
      next(e);
    }
  };

  /**
   * @openapi
   * /songs/{songId}/lyrics:
   *   get:
   *     summary: Get lyrics for a song
   *     tags:
   *       - Songs
   *     parameters:
   *       - in: path
   *         name: songId
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the song to retrieve lyrics for
   *     responses:
   *       200:
   *         description: List of lyrics files for the song
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   text:
   *                     type: string
   *                     description: Raw lyrics text in LRC or LRCX format
   *                     example: "[02:00.082]＜最高速の別れの歌＞\n[02:00.082][fu]\u003Cさい,1,2\u003E\u003Cこう,2,3\u003E\u003Cそく,3,4\u003E\u003Cわか,5,6\u003E\u003Cうた,8,9\u003E\n[02:00.082][dots]0,2,2,2,1,2,1,1,2,-1,0\n[02:00.082][tags],119849/120111,120365/120813,121145/121376,121649,121906/122127,122242,122601,122851/123112,123153,\n[02:00.082][tt]\u003C0,1\u003E\u003C515,2\u003E\u003C1295,3\u003E\u003C1799,4\u003E\u003C2057,5\u003E\u003C2393,6\u003E\u003C2751,7\u003E\u003C3001,8\u003E\u003C3304,9\u003E\n[02:00.082][tr:en]\u003CA farewell song at my highest speed\u003E\n[02:00.082][tr:zh]＜最高速的離別之歌＞"
   *                   parsed:
   *                     $ref: '#/components/schemas/LyricsKitLyrics'
   *                 required:
   *                   - text
   *                   - parsed
   *       404:
   *         description: Song not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Song not found"
   */
  public getSongLyrics = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const song = await db.query.Songs.findFirst({
        where: and(
          eq(Songs.id, parseInt(req.params.songId as string)),
          isNull(Songs.deletionDate),
        ),
        columns: { id: true },
        with: { files: { columns: { path: true } } },
      });
      if (!song) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }
      const lyrics = (
        await Promise.all(
          song.files.map(async (f) => {
            if (f.path === null) return null;
            const fullPath = fullPathOf(f.path);
            const lrcxPath = swapExt(fullPath, "lrcx");
            if (await fs.stat(lrcxPath)) {
              return fs.readFile(lrcxPath, "utf8");
            }
            const lrcPath = swapExt(fullPath, "lrc");
            if (await fs.stat(lrcPath)) {
              return fs.readFile(lrcPath, "utf8");
            }
            return null;
          }),
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

  /**
   * @openapi
   * /songs/{songId}/entries:
   *   get:
   *     summary: Get Lyricova entries that reference a song
   *     tags:
   *       - Songs
   *     parameters:
   *       - in: path
   *         name: songId
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the song
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         required: false
   *         description: Page number for pagination
   *     responses:
   *       200:
   *         description: Paginated list of entries referencing the song
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalEntries:
   *                   type: integer
   *                   description: Total number of entries for this song
   *                 entries:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Entry'
   *                 song:
   *                   type: object
   *                   properties:
   *                     id:
   *                       $ref: '#/components/schemas/Song/properties/id'
   *                     name:
   *                       $ref: '#/components/schemas/Song/properties/name'
   *                 page:
   *                   type: integer
   *                   description: Current page number
   *                 totalPages:
   *                   type: integer
   *                   description: Total number of pages
   *       404:
   *         description: Song not found or song has no entries
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Song not found"
   */
  public getSongEntries = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const songId = parseInt(req.params.songId as string);
      const page = parseInt(req.query.page as string) || 1;
      const song = await db.query.Songs.findFirst({
        where: and(eq(Songs.id, songId), isNull(Songs.deletionDate)),
        columns: { id: true, name: true },
      });
      if (!song) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }
      const totalEntries = await db.$count(
        SongOfEntries,
        eq(SongOfEntries.songId, songId),
      );
      if (totalEntries < 1) {
        return res.status(404).json({ status: 404, message: "Song not found" });
      }

      const junctionRows = await db
        .select({
          entryId: Entries.id,
          soeId: SongOfEntries.id,
          soeSongId: SongOfEntries.songId,
          soeEntryId: SongOfEntries.entryId,
          soeCreationDate: SongOfEntries.creationDate,
          soeUpdatedOn: SongOfEntries.updatedOn,
        })
        .from(SongOfEntries)
        .innerJoin(Entries, eq(Entries.id, SongOfEntries.entryId))
        .where(
          and(
            eq(SongOfEntries.songId, songId),
            isNull(Entries.deletionDate),
            entryHasMainVerse,
          ),
        )
        .orderBy(desc(Entries.recentActionDate))
        .limit(entriesPerPage)
        .offset((page - 1) * entriesPerPage);

      const listing = await fetchEntriesListing(
        junctionRows.map((r) => r.entryId),
      );
      const throughByEntry = new Map(
        junctionRows.map((r) => [
          r.entryId,
          {
            id: r.soeId,
            songId: r.soeSongId,
            entryId: r.soeEntryId,
            creationDate: r.soeCreationDate,
            updatedOn: r.soeUpdatedOn,
          },
        ]),
      );
      const entries = listing.map((e) => ({
        ...e,
        SongOfEntry: throughByEntry.get(e.id),
      }));

      res.json({
        totalEntries,
        entries,
        song,
        page,
        totalPages: Math.ceil(totalEntries / entriesPerPage),
      });
    } catch (e) {
      console.error(e);
      next(e);
    }
  };
}
