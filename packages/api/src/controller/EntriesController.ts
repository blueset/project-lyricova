import { Router, Request, Response } from "express";
import { desc, eq, isNull } from "drizzle-orm";
import shuffle from "lodash/shuffle";
import { db } from "../drizzle/client";
import { Entries } from "../drizzle/schema";
import { parseEnumArray } from "../drizzle/enumArray";
import { entriesPerPage } from "../utils/consts";
import { PVContract } from "../types/vocadb";

/** Pick the preferred playback URL from a song's VocaDB PV list. */
function deriveVideoUrl(vocaDbJson: any): { has: boolean; url?: string } {
  const pvs = vocaDbJson?.pvs as PVContract[] | undefined;
  if (!pvs) return { has: false };
  const url =
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
  return { has: true, url };
}

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
    const rows = await db.query.Entries.findMany({
      where: isNull(Entries.deletionDate),
      with: {
        verses: {
          columns: {
            id: true,
            text: true,
            isMain: true,
            language: true,
            typingSequence: true,
          },
          where: (v: any, { isNull }: any) => isNull(v.deletionDate),
          orderBy: (v: any, { desc }: any) => desc(v.id),
        },
        tagOfEntries: {
          columns: {},
          with: { tag: { columns: { name: true, slug: true, color: true } } },
        },
        pulses: {
          columns: { creationDate: true },
          orderBy: (p: any, { desc }: any) => desc(p.id),
        },
      },
      orderBy: (e: any, { desc }: any) => desc(e.recentActionDate),
      limit: entriesPerPage,
      offset: (page - 1) * entriesPerPage,
    });

    const entries = rows.map((e) => {
      const { tagOfEntries, verses, pulses, ...cols } = e;
      return {
        ...cols,
        verses,
        tags: (tagOfEntries ?? []).map((t) => t.tag),
        pulses,
      };
    });

    const totalEntries = await db.$count(Entries, isNull(Entries.deletionDate));

    res.json({
      entries,
      count: totalEntries,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    });
  }

  /**
   * @openapi
   * /entries/{entryId}:
   *   get:
   *     summary: Get a single entry by ID
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
   *         description: The requested entry with verses, tags, songs, and pulses
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
   *                         type: object
   *                         properties:
   *                           id:
   *                             $ref: '#/components/schemas/Song/properties/id'
   *                           name:
   *                             $ref: '#/components/schemas/Song/properties/name'
   *                           coverUrl:
   *                             $ref: '#/components/schemas/Song/properties/coverUrl'
   *                           videoUrl:
   *                             type: string
   *                             description: Preferred playback URL derived from VocaDB PVs
   *                           artists:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 id:
   *                                   $ref: '#/components/schemas/Artist/properties/id'
   *                                 name:
   *                                   $ref: '#/components/schemas/Artist/properties/name'
   *                                 ArtistOfSong:
   *                                   $ref: '#/components/schemas/ArtistOfSong'
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
    const entry = await db.query.Entries.findFirst({
      where: eq(Entries.id, entryId),
      with: {
        verses: {
          columns: { creationDate: false, updatedOn: false },
          where: (v: any, { isNull }: any) => isNull(v.deletionDate),
          orderBy: (v: any, { asc }: any) => asc(v.id),
        },
        tagOfEntries: {
          columns: {},
          with: { tag: { columns: { name: true, slug: true, color: true } } },
        },
        songOfEntries: {
          columns: {},
          with: {
            song: {
              columns: {
                id: true,
                name: true,
                coverUrl: true,
                vocaDbJson: true,
                deletionDate: true,
              },
              with: {
                artistOfSongs: {
                  columns: {
                    artistRoles: true,
                    categories: true,
                    isSupport: true,
                  },
                  with: {
                    artist: {
                      columns: { id: true, name: true, deletionDate: true },
                    },
                  },
                },
              },
            },
          },
        },
        pulses: {
          columns: { creationDate: true },
          orderBy: (p: any, { asc }: any) => asc(p.id),
        },
      },
    });

    if (!entry || entry.deletionDate !== null) {
      return res.status(404).json({ message: "Entry not found" });
    }

    const { tagOfEntries, songOfEntries, verses, pulses, ...cols } = entry;
    const songs = (songOfEntries ?? [])
      .filter((soe) => soe.song && !soe.song.deletionDate)
      .map((soe) => {
        const s = soe.song;
        const artists = (s.artistOfSongs ?? [])
          .filter((aos) => aos.artist && !aos.artist.deletionDate)
          .map((aos) => ({
            id: aos.artist.id,
            name: aos.artist.name,
            ArtistOfSong: {
              artistRoles: parseEnumArray(aos.artistRoles),
              categories: parseEnumArray(aos.categories),
              isSupport: aos.isSupport,
            },
          }))
          .sort((a: any, b: any) => a.id - b.id);
        const song: any = {
          id: s.id,
          name: s.name,
          coverUrl: s.coverUrl,
          artists,
        };
        const { has, url } = deriveVideoUrl(s.vocaDbJson);
        if (has) song.videoUrl = url;
        return song;
      });
    songs.sort((a: any, b: any) => a.id - b.id);

    res.json({
      ...cols,
      verses,
      tags: (tagOfEntries ?? []).map((t) => t.tag),
      songs,
      pulses,
    });
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
   *         description: Comma-separated language prefixes to filter verses by
   *       - in: query
   *         name: tags
   *         schema:
   *           type: string
   *         required: false
   *         description: Comma-separated tag slugs to filter entries by
   *     responses:
   *       200:
   *         description: Randomized verses and their entries
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 entries:
   *                   type: object
   *                   additionalProperties:
   *                     $ref: '#/components/schemas/Entry'
   *                 verses:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Verse'
   *       404:
   *         description: No entries found
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
    const verseWhereActive =
      type === "original" || type === "main" || languages.length > 0;

    const rows = await db.query.Entries.findMany({
      where: isNull(Entries.deletionDate),
      columns: {
        id: true,
        title: true,
        producersName: true,
        vocalistsName: true,
      },
      with: {
        verses: {
          columns: {
            id: true,
            text: true,
            typingSequence: true,
            isMain: true,
            isOriginal: true,
            language: true,
            entryId: true,
          },
          where: (v: any, { and, eq, or, like, isNull }: any) => {
            const conds: any[] = [isNull(v.deletionDate)];
            if (type === "original") conds.push(eq(v.isOriginal, true));
            else if (type === "main") conds.push(eq(v.isMain, true));
            if (languages.length)
              conds.push(or(...languages.map((l) => like(v.language, `${l}%`))));
            return and(...conds);
          },
        },
        tagOfEntries: {
          columns: {},
          with: { tag: { columns: { name: true, slug: true, color: true } } },
          ...(tags.length
            ? { where: (toe: any, { inArray }: any) => inArray(toe.tagId, tags) }
            : {}),
        },
      },
    });

    const matched = rows.filter(
      (e) =>
        (!verseWhereActive || e.verses.length > 0) &&
        (tags.length === 0 || e.tagOfEntries.length > 0)
    );

    if (matched.length < 1) {
      return res.status(404).json({ message: "No entries found" });
    }

    const verses = shuffle(
      matched.flatMap((entry) =>
        entry.verses.map((v) => ({
          id: v.id,
          text: v.text,
          typingSequence: v.typingSequence,
          language: v.language,
          entryId: v.entryId,
        }))
      )
    );

    const entriesObj = matched.reduce<{ [id: number]: any }>((acc, entry) => {
      const { verses: _verses, tagOfEntries, ...cols } = entry;
      acc[entry.id] = {
        ...cols,
        tags: (tagOfEntries ?? []).map((t) => t.tag),
      };
      return acc;
    }, {});

    res.json({
      entries: entriesObj,
      verses,
    });
  }
}
