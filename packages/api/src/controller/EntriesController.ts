import { Router, Request, Response } from "express";
import sequelize from "../db";
import { Entry } from "../models/Entry";
import { entriesPerPage } from "../utils/consts";
import { Song } from "../models/Song";
import { PVContract } from "../types/vocadb";
import shuffle from "lodash/shuffle";
import { Op } from "sequelize";

type ExpandedSong = Song & { videoUrl?: string };
type ExpandedEntry = Entry & { songs: ExpandedSong[] };

export class EntriesController {
  public router: Router;
  constructor() {
    this.router = Router();
    this.router.get("/", this.getEntries);
    this.router.get("/screensaver", this.getScreensaver);
    this.router.get("/:entryId(\\d+)", this.getEntry);
  }

  /**
   * @openapi
   * /entries:
   *   get:
   *     summary: Get a paginated list of entries
   *     tags:
   *       - Entries
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         required: false
   *         description: Page number for pagination (1-indexed)
   *     responses:
   *       200:
   *         description: A paginated list of entries with verses, tags, and pulses
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
   *                               $ref: '#/components/schemas/Verse'
   *                           tags:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/Tag'
   *                           pulses:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/Pulse'
   *                 count:
   *                   type: integer
   *                   description: Total number of entries
   *                 totalPages:
   *                   type: integer
   *                   description: Total number of pages
   */
  private async getEntries(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const entries = (await sequelize.models.Entry.findAll({
      attributes: {
        exclude: ["updatedAt"],
      },
      include: [
        {
          association: "verses",
          attributes: ["id", "text", "isMain", "language", "typingSequence"],
        },
        {
          association: "tags",
          attributes: ["name", "slug", "color"],
          through: {
            attributes: [],
          },
        },
        {
          association: "pulses",
          attributes: ["creationDate"],
        },
      ],
      order: [["recentActionDate", "DESC"]],
      limit: entriesPerPage,
      offset: (page - 1) * entriesPerPage,
    })) as Entry[];

    const totalEntries = await sequelize.models.Entry.count();

    res.json({
      entries: entries.map((entry) => entry.toJSON()),
      count: totalEntries,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    });
  }

  /**
   * @openapi
   * /entries/{entryId}:
   *   get:
   *     summary: Get a single entry by ID with full details
   *     tags:
   *       - Entries
   *     parameters:
   *       - in: path
   *         name: entryId
   *         schema:
   *           type: integer
   *         required: true
   *         description: ID of the entry to retrieve
   *     responses:
   *       200:
   *         description: Entry with verses, tags, songs, and pulses
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/Entry'
   *                 - type: object
   *                   properties:
   *                     verses:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Verse'
   *                     tags:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Tag'
   *                     pulses:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Pulse'
   *                     songs:
   *                       type: array
   *                       items:
   *                         allOf:
   *                           - type: object
   *                             properties:
   *                               id:
   *                                 $ref: '#/components/schemas/Song/properties/id'
   *                               name:
   *                                 $ref: '#/components/schemas/Song/properties/name'
   *                               coverUrl:
   *                                 $ref: '#/components/schemas/Song/properties/coverUrl'
   *                               videoUrl:
   *                                 type: string
   *                                 nullable: true
   *                                 description: Video URL from PV
   *                               artists:
   *                                 type: array
   *                                 items:
   *                                   allOf:
   *                                     - $ref: '#/components/schemas/Artist'
   *                                     - type: object
   *                                       properties:
   *                                         ArtistOfSong:
   *                                           $ref: '#/components/schemas/ArtistOfSong'
   *       404:
   *         description: Entry not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   const: "Entry not found"
   */
  private async getEntry(req: Request, res: Response) {
    const entryId = parseInt(req.params.entryId);
    const entry = (await sequelize.models.Entry.findByPk(entryId, {
      include: [
        {
          association: "verses",
          attributes: {
            exclude: ["creationDate", "updatedOn"],
          },
        },
        {
          association: "tags",
          attributes: ["name", "slug", "color"],
          through: {
            attributes: [],
          },
        },
        {
          association: "songs",
          attributes: ["id", "name", "coverUrl", "vocaDbJson"],
          include: [
            {
              association: "artists",
              attributes: ["id", "name"],
              through: {
                attributes: ["artistRoles", "categories", "isSupport"],
              },
            },
          ],
          through: {
            attributes: [],
          },
        },
        {
          association: "pulses",
          attributes: ["creationDate"],
        },
      ],
    })) as Entry;

    if (!entry) return res.status(404).json({ message: "Entry not found" });

    const entryObj = entry.toJSON() as ExpandedEntry;
    entryObj.songs.forEach((song: ExpandedSong) => {
      if (song.vocaDbJson?.pvs) {
        const pvs = song.vocaDbJson.pvs as PVContract[];
        let url: string | undefined = undefined;
        url =
          pvs.find((pv) => pv.service === "Youtube" && pv.pvType === "Original")
            ?.url ??
          pvs.find(
            (pv) => pv.service === "NicoNicoDouga" && pv.pvType === "Original"
          )?.url ??
          pvs.find((pv) => pv.pvType === "Original")?.url ??
          pvs.find((pv) => pv.service === "Youtube")?.url ??
          pvs.find((pv) => pv.service === "NicoNicoDouga")?.url ??
          pvs[0]?.url ??
          undefined;
        song.videoUrl = url;
      }
      delete song.vocaDbJson;
    });

    res.json(entryObj);
  }

  /**
   * @openapi
   * /entries/screensaver:
   *   get:
   *     summary: Get randomized verses and entries for screensaver display
   *     tags:
   *       - Entries
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [original, main]
   *         required: false
   *         description: Filter verses by type (original language or main display verse)
   *       - in: query
   *         name: languages
   *         schema:
   *           type: string
   *         required: false
   *         description: Comma-separated list of language codes to filter verses by
   *         example: "ja,en,zh"
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         required: false
   *         description: Comma-separated list of tag slugs to filter entries by
   *         example: "core,light,soft"
   *     responses:
   *       200:
   *         description: Randomized verses and their associated entries
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 entries:
   *                   type: object
   *                   description: Map of entry IDs to entry objects
   *                   patternProperties:
   *                     '^[0-9]+$':
   *                       type: object
   *                       properties:
   *                         id:
   *                           $ref: '#/components/schemas/Entry/properties/id'
   *                         title:
   *                           $ref: '#/components/schemas/Entry/properties/title'
   *                         producersName:
   *                           $ref: '#/components/schemas/Entry/properties/producersName'
   *                         vocalistsName:
   *                           $ref: '#/components/schemas/Entry/properties/vocalistsName'
   *                         tags:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               name:
   *                                 $ref: '#/components/schemas/Tag/properties/name'
   *                               slug:
   *                                 $ref: '#/components/schemas/Tag/properties/slug'
   *                               color:
   *                                 $ref: '#/components/schemas/Tag/properties/color'
   *                 verses:
   *                   type: array
   *                   description: Shuffled array of verses matching the filter criteria
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         $ref: '#/components/schemas/Verse/properties/id'
   *                       text:
   *                         $ref: '#/components/schemas/Verse/properties/text'
   *                       typingSequence:
   *                         $ref: '#/components/schemas/Verse/properties/typingSequence'
   *                       language:
   *                         $ref: '#/components/schemas/Verse/properties/language'
   *                       entryId:
   *                         $ref: '#/components/schemas/Verse/properties/entryId'
   *       404:
   *         description: No entries found matching the filter criteria
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   const: "No entries found"
   */
  private async getScreensaver(req: Request, res: Response) {
    const type = req.query.type as string;
    const languages = (req.query.languages as string)?.split(",") || [];
    const tags = (req.query.tags as string)?.split(",") || [];

    const verseCondition = { [Op.and]: [] as unknown[] };
    if (type === "original") verseCondition[Op.and].push({ isOriginal: true });
    else if (type === "main") verseCondition[Op.and].push({ isMain: true });
    if (languages.length)
      verseCondition[Op.and].push({
        [Op.or]: languages.map((l) => ({ language: { [Op.startsWith]: l } })),
      });

    const entries = (
      await Entry.findAll({
        attributes: ["id", "title", "producersName", "vocalistsName"],
        include: [
          {
            association: "verses",
            attributes: [
              "id",
              "text",
              "typingSequence",
              "isMain",
              "isOriginal",
              "language",
              "entryId",
            ],
            where:
              verseCondition[Op.and].length > 0 ? verseCondition : undefined,
          },
          {
            association: "tags",
            attributes: ["name", "slug", "color"],
            through: {
              attributes: [] as string[],
            },
            where: tags.length ? { slug: tags } : undefined,
          },
        ],
      })
    ).map((e) => e.toJSON()) as Entry[];

    if (entries.length < 1) {
      return res.status(404).json({ message: "No entries found" });
    }

    const verses = shuffle(
      entries
        .flatMap((entry) => entry.verses)
        .map((v) => {
          delete v.isMain;
          delete v.isOriginal;
          return v;
        })
    );
    entries.forEach((entry) => delete entry.verses);

    const entriesObj = entries.reduce<{ [id: number]: Entry }>((acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    }, {});

    res.json({
      entries: entriesObj,
      verses,
    });
  }
}
