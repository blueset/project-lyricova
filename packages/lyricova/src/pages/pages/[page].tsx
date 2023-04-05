import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { Fragment } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { ArchiveHeader } from "../../components/public/listing/ArchiveHeader";
import { Paginator } from "../../components/public/listing/Paginator";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import {
  entriesPerPage,
  host,
  siteName,
  tagLine1,
  tagLine2,
} from "../../utils/consts";
import { entryListingCondition } from "../../utils/queries";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = parseInt(context.params.page as string);

  if (page === 1) return { redirect: { statusCode: 302, destination: "/" } };

  const totalEntries = await sequelize.models.Entry.count();
  const entries = (await sequelize.models.Entry.findAll({
    ...entryListingCondition,
    order: [["recentActionDate", "DESC"]],
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
  })) as Entry[];

  if (entries.length < 1) return { notFound: true };

  return {
    props: {
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    },
    revalidate: 10,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const totalEntries = await sequelize.models.Entry.count();
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const paths = [...Array(totalPages - 1)].map((_, idx) => ({
    params: { page: (idx + 2).toString() },
  }));
  return {
    paths,
    fallback: "blocking",
  };
};

interface ArchivePageProps {
  entries: Entry[];
  page: number;
  totalPages: number;
}

export default function ArchivePage({
  entries,
  page,
  totalPages,
}: ArchivePageProps) {
  return (
    <>
      <Head>
        <title>{`Archive Page ${page} – ${siteName}`}</title>
        <meta
          name="description"
          content={`Archive Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:title" content={`Archive Page ${page} – ${siteName}`} />
        <meta
          name="og:description"
          content={`Archive Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:image" content={`${host}/images/og-cover.png`} />
      </Head>
      <ArchiveHeader page={page} />
      <Divider />
      {entries?.map((entry, idx) => (
        <Fragment key={idx}>
          <SingleEntry entry={entry} />
          <Divider />
        </Fragment>
      ))}
      <Paginator currentPage={page} totalPages={totalPages} prefix="/" />
      <Footer />
    </>
  );
}
