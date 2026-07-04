import { Router, Request, Response } from "express";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../drizzle/client";
import { Artists, ArtistOfSongs, SongOfEntries, Entries } from "../drizzle/schema";
import { entryHasMainVerse, fetchEntriesListing } from "../utils/queries";
import { entriesPerPage } from "../utils/consts";

export class ArtistsController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/:artistId(\\d+)", this.getArtist);
    this.router.get("/:artistId(\\d+)/entries", this.getArtistEntries);
  }

  /**
   * @openapi
   * /artists/{artistId}:
   *   get:
   *     summary: Get artist details by ID
   *     tags:
   *       - Artists
   *     parameters:
   *       - in: path
   *         name: artistId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the artist to retrieve
   *     responses:
   *       200:
   *         description: Artist details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   $ref: '#/components/schemas/Artist/properties/id'
   *                 name:
   *                   $ref: '#/components/schemas/Artist/properties/name'
   *                 type:
   *                   $ref: '#/components/schemas/Artist/properties/type'
   *       404:
   *         description: Artist not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 message: "Artist not found"
   */
  private getArtist = async (req: Request, res: Response) => {
    const artistId = parseInt(req.params.artistId);
    const artist = await db.query.Artists.findFirst({
      where: and(eq(Artists.id, artistId), isNull(Artists.deletionDate)),
      columns: { id: true, name: true, type: true },
    });
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }
    res.json(artist);
  };

  /**
   * @openapi
   * /artists/{artistId}/entries:
   *   get:
   *     summary: Get entries associated with an artist
   *     tags:
   *       - Artists
   *     parameters:
   *       - in: path
   *         name: artistId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the artist
   *       - in: query
   *         name: page
   *         required: false
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *     responses:
   *       200:
   *         description: List of entries for the artist with pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 entries:
   *                   type: array
   *                   items:
   *                     allOf:
   *                       - $ref: '#/components/schemas/Entry'
   *                       - type: object
   *                         properties:
   *                           verses:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 text:
   *                                   $ref: '#/components/schemas/Verse/properties/text'
   *                                 isMain:
   *                                   $ref: '#/components/schemas/Verse/properties/isMain'
   *                                 isOriginal:
   *                                   $ref: '#/components/schemas/Verse/properties/isOriginal'
   *                                 language:
   *                                   $ref: '#/components/schemas/Verse/properties/language'
   *                           tags:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 name:
   *                                   $ref: '#/components/schemas/Tag/properties/name'
   *                                 slug:
   *                                   $ref: '#/components/schemas/Tag/properties/slug'
   *                                 color:
   *                                   $ref: '#/components/schemas/Tag/properties/color'
   *                           pulses:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 creationDate:
   *                                   $ref: '#/components/schemas/Pulse/properties/creationDate'
   *                 page:
   *                   type: integer
   *                   description: Current page number
   *                 totalPages:
   *                   type: integer
   *                   description: Total number of pages
   *                 artist:
   *                   type: object
   *                   properties:
   *                     id:
   *                       $ref: '#/components/schemas/Artist/properties/id'
   *                     name:
   *                       $ref: '#/components/schemas/Artist/properties/name'
   *                     type:
   *                       $ref: '#/components/schemas/Artist/properties/type'
   *       404:
   *         description: Artist not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 message: "Artist not found"
   */
  private getArtistEntries = async (req: Request, res: Response) => {
    const artistId = parseInt(req.params.artistId);
    const page = parseInt(req.query.page as string) || 1;
    const artist = await db.query.Artists.findFirst({
      where: and(eq(Artists.id, artistId), isNull(Artists.deletionDate)),
      columns: { id: true, name: true, type: true },
    });
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    const entryIdRows = await db
      .select({ entryId: SongOfEntries.entryId })
      .from(SongOfEntries)
      .leftJoin(ArtistOfSongs, eq(SongOfEntries.songId, ArtistOfSongs.songId))
      .where(eq(ArtistOfSongs.artistId, artistId));

    // Mirrors the legacy raw count: number of matching rows *including*
    // duplicates (the SQL `id IN (...)` de-dupes the entry rows themselves).
    const totalEntries = entryIdRows.length;
    if (totalEntries < 1) return; // preserves the original no-op on no entries

    const distinctIds = [
      ...new Set(entryIdRows.flatMap((r) => (r.entryId === null ? [] : [r.entryId]))),
    ];
    const ordered = await db
      .select({ id: Entries.id })
      .from(Entries)
      .where(
        and(
          inArray(Entries.id, distinctIds),
          isNull(Entries.deletionDate),
          entryHasMainVerse
        )
      )
      .orderBy(desc(Entries.recentActionDate))
      .limit(entriesPerPage)
      .offset((page - 1) * entriesPerPage);

    const entries = await fetchEntriesListing(ordered.map((r) => r.id));

    res.json({
      entries,
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
      artist,
    });
  };
}
