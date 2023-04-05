import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Tag } from "lyricova-common/models/Tag";
import type { TagOfEntry } from "lyricova-common/models/TagOfEntry";
import type { GetStaticProps, GetStaticPaths } from "next";
import { entriesPerPage } from "../../../../utils/consts";
import { entryListingCondition } from "../../../../utils/queries";
import TagArchivePage from "../../[slug]";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = parseInt(context.params.page as string);
  const tagSlug = context.params.slug as string;
  if (page === 1)
    return { redirect: { statusCode: 302, destination: `/tags/${tagSlug}` } };

  const tag = (await sequelize.models.Tag.findByPk(tagSlug)) as Tag;
  if (!tag) return { notFound: true };
  const totalEntries = await sequelize.models.TagOfEntry.count({
    where: {
      tagId: tag.slug,
    },
  });

  const entries = (await tag.$get("entries", {
    ...entryListingCondition,
    order: [["recentActionDate", "DESC"]],
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
  })) as Entry[];
  if (entries.length < 1) return { notFound: true };

  const result = {
    props: {
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
      tag: tag.toJSON() as Tag,
    },
    revalidate: 10,
  };
  return result;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const tags = (await sequelize.models.TagOfEntry.findAll({
    attributes: [
      "tagId",
      [sequelize.fn("COUNT", sequelize.col("entryId")), "count"],
    ],
    group: ["tagId"],
  })) as (TagOfEntry & { count: number })[];
  const paths = [];
  for (const i of tags) {
    const totalPages = Math.ceil(i.count / entriesPerPage);
    for (let page = 2; page <= totalPages; page++) {
      paths.push({
        params: {
          slug: i.tagId,
          page: page.toString(),
        },
      });
    }
  }
  return {
    paths,
    fallback: "blocking",
  };
};

export default TagArchivePage;
