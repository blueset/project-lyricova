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

  private async getTag(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const tag = (await sequelize.models.Tag.findByPk(req.params.slug)) as Tag;

    const totalEntries = await TagOfEntry.count({
      where: {
        tagId: tag.slug,
      },
    });

    if (!tag) return res.status(404).send("Tag not found");

    const entries = await tag.$get("entries", {
      ...entryListingCondition,
      order: [["recentActionDate", "DESC"]],
      limit: entriesPerPage,
      offset: (page - 1) * entriesPerPage,
    });

    res.json({ tag: tag.toJSON(), entries, totalEntries, page });
  }
}
