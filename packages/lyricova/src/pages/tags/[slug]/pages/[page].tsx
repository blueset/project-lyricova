import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Tag } from "lyricova-common/models/Tag";
import { GetStaticProps, GetStaticPaths } from "next";
import { Fragment } from "react";
import { Divider } from "../../../../components/public/Divider";
import { Footer } from "../../../../components/public/Footer";
import { Paginator } from "../../../../components/public/listing/Paginator";
import { SingleEntry } from "../../../../components/public/listing/SingleEntry";
import { SubArchiveHeader } from "../../../../components/public/listing/SubArchiveHeader";
import { entriesPerPage } from "../../../../utils/consts";

export const getStaticProps: GetStaticProps = async (context) => {
  console.time("getStaticProps");
  const page = parseInt(context.params.page as string);
  const tagSlug = context.params.slug as string;
  const tag = (await sequelize.models.Tag.findByPk(tagSlug)) as Tag;
  const totalEntries = await sequelize.models.TagOfEntry.count({
    where: {
      tagId: tag.slug,
    },
  });
  const entries = (await tag.$get("entries", {
    include: [
      "verses",
      "tags",
      {
        association: "pulses",
        attributes: ["creationDate"],
      },
    ],
    order: [["recentActionDate", "DESC"]],
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
  })) as Entry[];
  const result = {
    props: {
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
      tag: tag.toJSON() as Tag,
    },
  };
  console.timeEnd("getStaticProps");
  return result;
};

export const getStaticPaths: GetStaticPaths = async () => {
  console.time("getStaticPaths");
  const tags = (await sequelize.models.Tag.findAll()) as Tag[];
  const totalEntries = await Promise.all(
    tags.map((t) =>
    sequelize.models.TagOfEntry.count({
        where: {
          tagId: t.slug,
        },
      })
    )
  );
  const paths = [];
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const totalPages = Math.ceil(totalEntries[i] / entriesPerPage);
    for (let page = 1; page <= totalPages; page++) {
      paths.push({
        params: {
          slug: tag.slug,
          page: page.toString(),
        },
      });
    }
  }
  console.timeEnd("getStaticPaths");
  return {
    paths,
    fallback: "blocking",
  };
};

interface TagArchivePageProps {
  entries: Entry[];
  tag: Tag;
  page: number;
  totalPages: number;
}

export default function TagArchivePage({
  entries,
  page,
  totalPages,
  tag,
}: TagArchivePageProps) {
  return (
    <>
      <SubArchiveHeader
        page={page}
        type="Tag archive"
        keywords={
          <span
            style={{
              color: tag.color,
              border: "1px solid currentColor",
              borderRadius: "0.25rem",
              padding: "0.1rem 0.3rem",
            }}
          >
            {tag.name}
          </span>
        }
      />
      <Divider />
      {entries?.map((entry, idx) => (
        <Fragment key={idx}>
          <SingleEntry entry={entry} />
          <Divider />
        </Fragment>
      ))}
      <Paginator
        currentPage={page}
        totalPages={totalPages}
        prefix={`/tags/${tag.slug}/`}
      />
      <Footer />
    </>
  );
}
