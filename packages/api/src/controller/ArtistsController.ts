import { Router, Request, Response } from "express";
import sequelize from "../db";
import type { Artist } from "../models/Artist";
import { QueryTypes } from "sequelize";
import { entriesPerPage } from "../utils/consts";
import { Entry } from "../models/Entry";

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
    const artist = (await sequelize.models.Artist.findByPk(artistId, {
      attributes: ["id", "name", "type"],
    })) as Artist;
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }
    res.json(artist.toJSON() as Artist);
  };

  private entryListingCondition = {
    attributes: {
      exclude: ["updatedOn"],
    },
    include: [
      {
        association: "verses",
        attributes: ["text", "isMain", "isOriginal", "language"],
        where: {
          isMain: true,
        },
      },
      {
        association: "tags",
        attributes: ["name", "slug", "color"],
        through: {
          attributes: [] as string[],
        },
      },
      {
        association: "pulses",
        attributes: ["creationDate"],
      },
    ],
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
    const artist = (await sequelize.models.Artist.findByPk(artistId, {
      attributes: ["id", "name", "type"],
    })) as Artist;
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }
    const entryIds = await sequelize.query<{ entryId: number }>(
      `
      SELECT
        SongOfEntries.entryId as entryId
      FROM
        SongOfEntries
        LEFT JOIN ArtistOfSongs ON SongOfEntries.songId = ArtistOfSongs.songId
      WHERE artistId = :artistId
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { artistId },
      }
    );

    const totalEntries = entryIds.length;
    if (totalEntries < 1) return { notFound: true };
    const entries = (await sequelize.models.Entry.findAll({
      ...this.entryListingCondition,
      where: { id: entryIds.map((e) => e.entryId) },
      order: [["recentActionDate", "DESC"]],
      limit: entriesPerPage,
      offset: (page - 1) * entriesPerPage,
    })) as Entry[];

    res.json({
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
      artist: artist.toJSON() as Artist,
    });
  };
}
