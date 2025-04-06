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
