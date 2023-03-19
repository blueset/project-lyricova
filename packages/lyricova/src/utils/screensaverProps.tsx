import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Verse } from "lyricova-common/models/Verse";
import { GetStaticProps, GetStaticPaths, GetServerSideProps } from "next";
import shuffle from "lodash/shuffle";
import { Op } from "sequelize";

export interface ScreensaverProps {
  entries: { [id: number]: Entry };
  verses: Verse[];
}

export const getServerSideProps: GetServerSideProps<ScreensaverProps> = async (
  context
) => {
  const type = context.query.type as string | undefined;
  const languages = (context.query.languages as string | undefined)?.split(",");
  const tags = (context.query.tags as string | undefined)?.split(",");

  const verseCondition: any = { [Op.and]: [] };
  if (type === "original") verseCondition[Op.and].push({ isOriginal: true });
  else if (type === "main") verseCondition[Op.and].push({ isMain: true });
  if (languages)
    verseCondition[Op.and].push({
      [Op.or]: languages.map((l) => ({ language: { [Op.startsWith]: l } })),
    });

  const entries = (
    await sequelize.models.Entry.findAll({
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
          where: verseCondition[Op.and].length > 0 ? verseCondition : undefined,
        },
        {
          association: "tags",
          attributes: ["name", "slug", "color"],
          through: {
            attributes: [] as string[],
          },
          where: tags ? { slug: tags } : undefined,
        },
      ],
    })
  ).map((e) => e.toJSON()) as Entry[];

  if (entries.length < 1) return { notFound: true };

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

  return {
    props: {
      entries: entriesObj,
      verses,
    },
  };
};
