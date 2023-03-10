import { Entry } from "lyricova-common/models/Entry";
import sequelize from "lyricova-common/db";
import type { NextApiRequest, NextApiResponse } from "next";
import { Op } from "sequelize";
import { Verse } from "lyricova-common/models/Verse";
import { entryListingCondition } from "../../utils/queries";

type Data = Entry[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const query = Array.isArray(req.query.query) ? req.query.query[0] : req.query.query;

  const entryIds = (await sequelize.models.Entry.findAll({
    attributes: ["id"],
    where: {
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { producersName: { [Op.like]: `%${query}%` } },
        { vocalistsName: { [Op.like]: `%${query}%` } },
      ],
    },
  })) as Entry[];
  const verseEntryIds = (await sequelize.models.Verse.findAll({
    attributes: ["entryId"],
    where: { text: { [Op.like]: `%${query}%` } },
  })) as Verse[];

  const ids = [...entryIds.map((e) => e.id), ...verseEntryIds.map((e) => e.entryId)];

  const result = (await sequelize.models.Entry.findAll({
    ...entryListingCondition,
    where: {
      id: { [Op.in]: ids },
    },
    order: [["recentActionDate", "DESC"]],
  })) as Entry[];

  res.status(200).json(result);
}