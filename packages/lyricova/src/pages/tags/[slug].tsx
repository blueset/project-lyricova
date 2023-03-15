import sequelize from "lyricova-common/db";
import { Entry } from "lyricova-common/models/Entry";
import { Tag } from "lyricova-common/models/Tag";
import { TagOfEntry } from "lyricova-common/models/TagOfEntry";
import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { Fragment } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { Paginator } from "../../components/public/listing/Paginator";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import { SubArchiveHeader } from "../../components/public/listing/SubArchiveHeader";
import {
  entriesPerPage,
  siteName,
  tagLine1,
  tagLine2,
} from "../../utils/consts";
import { entryListingCondition } from "../../utils/queries";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = 1;
  const tagSlug = context.params.slug as string;
  const tag = (await sequelize.models.Tag.findByPk(tagSlug)) as Tag;
  const totalEntries = await TagOfEntry.count({
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

  return {
    props: {
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
      tag: tag.toJSON() as Tag,
    },
    revalidate: 10,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const tags = (await sequelize.models.Tag.findAll()) as Tag[];
  const paths = tags.map((tag) => ({
    params: { slug: tag.slug },
  }));
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
      <Head>
        <title>{`Tag Archive of ${tag.name} – Page ${page} – ${siteName}`}</title>
        <meta
          name="description"
          content={`Tag Archive of ${tag.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta
          name="og:title"
          content={`Tag Archive of ${tag.name} – Page ${page} – ${siteName}`}
        />
        <meta
          name="og:description"
          content={`Tag Archive of ${tag.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:image" content="/images/og-cover.png" />
      </Head>
      <SubArchiveHeader
        page={page}
        type="Tag archive"
        keywords={
          <span
            style={{
              color: tag.color,
              border: "1px solid currentColor",
              borderRadius: "0.25rem",
              padding: "0.1rem 0.3rem 0",
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
