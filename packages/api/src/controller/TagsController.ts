import { Router, Request, Response } from "express";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../drizzle/client";
import { Tags, TagOfEntries, Entries } from "../drizzle/schema";
import { entryHasMainVerse, fetchEntriesListing } from "../utils/queries";
import { entriesPerPage } from "../utils/consts";

export class TagsController {
  public router: Router;
  constructor() {
    this.router = Router();
    this.router.get("/", this.getTags);
    this.router.get("/:slug", this.getTag);
  }

  /**
   * @openapi
   * /tags:
   *   get:
   *     summary: Get all tags with entry counts
   *     tags:
   *       - Tags
   *     responses:
   *       200:
   *         description: List of all tags with their entry counts
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 allOf:
   *                   - $ref: '#/components/schemas/Tag'
   *                   - type: object
   *                     properties:
   *                       entryCount:
   *                         type: integer
   *                         description: Number of entries associated with this tag
   *                         example: 42
   */
  private async getTags(req: Request, res: Response) {
    const rows = await db
      .select({
        slug: Tags.slug,
        name: Tags.name,
        color: Tags.color,
        createdAt: Tags.createdAt,
        updatedAt: Tags.updatedAt,
        entryCount: sql<number>`(SELECT COUNT(*) FROM TagOfEntries WHERE TagOfEntries.tagId = Tags.slug)`,
      })
      .from(Tags);

    res.json(rows.map((r) => ({ ...r, entryCount: Number(r.entryCount) })));
  }

  /**
   * @openapi
   * /tags/{slug}:
   *   get:
   *     summary: Get a tag by slug with its associated entries
   *     tags:
   *       - Tags
   *     parameters:
   *       - in: path
   *         name: slug
   *         schema:
   *           type: string
   *         required: true
   *         description: URL-friendly slug identifier of the tag
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         required: false
   *         description: Page number for pagination
   *     responses:
   *       200:
   *         description: Tag details with paginated entries
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tag:
   *                   $ref: '#/components/schemas/Tag'
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
   *                 totalEntries:
   *                   type: integer
   *                   description: Total number of entries for this tag
   *                 page:
   *                   type: integer
   *                   description: Current page number
   *                 totalPages:
   *                   type: integer
   *                   description: Total number of pages
   *       404:
   *         description: Tag not found
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *               example: "Tag not found"
   */
  private async getTag(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const tag = await db.query.Tags.findFirst({
      where: eq(Tags.slug, req.params.slug as string),
    });

    if (!tag) return res.status(404).send("Tag not found");

    const totalEntries = await db.$count(
      TagOfEntries,
      eq(TagOfEntries.tagId, tag.slug),
    );

    const junctionRows = await db
      .select({
        entryId: Entries.id,
        toeId: TagOfEntries.id,
        toeTagId: TagOfEntries.tagId,
        toeEntryId: TagOfEntries.entryId,
        toeCreationDate: TagOfEntries.creationDate,
        toeUpdatedOn: TagOfEntries.updatedOn,
      })
      .from(TagOfEntries)
      .innerJoin(Entries, eq(Entries.id, TagOfEntries.entryId))
      .where(
        and(
          eq(TagOfEntries.tagId, tag.slug),
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
          id: r.toeId,
          tagId: r.toeTagId,
          entryId: r.toeEntryId,
          creationDate: r.toeCreationDate,
          updatedOn: r.toeUpdatedOn,
        },
      ]),
    );
    const entries = listing.map((e) => ({
      ...e,
      TagOfEntry: throughByEntry.get(e.id),
    }));

    res.json({
      tag,
      entries,
      totalEntries,
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    });
  }
}
