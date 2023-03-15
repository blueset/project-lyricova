import { Router, Request, Response } from "express";
import { Entry } from "lyricova-common/models/Entry";
import { Verse } from "lyricova-common/models/Verse";
import { Op } from "sequelize";
import { entryListingCondition } from "../utils/queries";

export class PublicApiController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/search", this.search);
  }

  public search = async (req: Request, res: Response) => {
    const query = Array.isArray(req.query.query)
      ? req.query.query[0]
      : req.query.query;

    const entryIds = (await Entry.findAll({
      attributes: ["id"],
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { producersName: { [Op.like]: `%${query}%` } },
          { vocalistsName: { [Op.like]: `%${query}%` } },
        ],
      },
    })) as Entry[];
    const verseEntryIds = (await Verse.findAll({
      attributes: ["entryId"],
      where: { text: { [Op.like]: `%${query}%` } },
    })) as Verse[];

    const ids = [
      ...entryIds.map((e) => e.id),
      ...verseEntryIds.map((e) => e.entryId),
    ];

    const result = (await Entry.findAll({
      ...entryListingCondition,
      where: {
        id: { [Op.in]: ids },
      },
      order: [["recentActionDate", "DESC"]],
    })) as Entry[];

    res.status(200).json(result);
  };
}
