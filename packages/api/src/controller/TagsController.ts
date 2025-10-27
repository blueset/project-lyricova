import { Router, Request, Response } from "express";
import sequelize from "../db";
import { Tag } from "../models/Tag";
import { entryListingCondition } from "../utils/queries";
import { entriesPerPage } from "../utils/consts";
import { TagOfEntry } from "../models/TagOfEntry";

type TagWithCount = Tag & { entryCount: number };

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
    let tags = (await sequelize.models.Tag.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(
              "(SELECT COUNT(*) FROM TagOfEntries WHERE TagOfEntries.tagId = Tag.slug)"
            ),
            "entryCount",
          ],
        ],
      },
    })) as TagWithCount[];
    tags = tags.map((tag) => tag.toJSON() as TagWithCount);

    res.json(tags);
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
    const tag = (await sequelize.models.Tag.findByPk(req.params.slug)) as Tag;

    if (!tag) return res.status(404).send("Tag not found");

    const totalEntries = await TagOfEntry.count({
      where: {
        tagId: tag.slug,
      },
    });

    const entries = await tag.$get("entries", {
      ...entryListingCondition,
      order: [["recentActionDate", "DESC"]],
      limit: entriesPerPage,
      offset: (page - 1) * entriesPerPage,
    });

    res.json({
      tag: tag.toJSON(),
      entries,
      totalEntries,
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    });
  }
}
