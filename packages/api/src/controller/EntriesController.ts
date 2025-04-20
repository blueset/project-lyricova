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

    res.json({
      entries: entries.map((entry) => entry.toJSON()),
      count: await sequelize.models.Entry.count(),
    });
  }

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
