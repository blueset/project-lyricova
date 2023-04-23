import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { GetStaticProps } from "next";
import Head from "next/head";
import React, { Fragment } from "react";
import { Divider } from "../components/public/Divider";
import { Footer } from "../components/public/Footer";
import { IndexHeader } from "../components/public/IndexHeader";
import { Paginator } from "../components/public/listing/Paginator";
import { SingleEntry } from "../components/public/listing/SingleEntry";
import { TopEntry } from "../components/public/listing/TopEntry";
import {
  entriesPerPage,
  host,
  siteName,
  tagLine1,
  tagLine2,
} from "../utils/consts";

interface IndexProps {
  entries: Entry[];
  totalPages: number;
}

export const getStaticProps: GetStaticProps<IndexProps> = async (context) => {
  let entries = (await sequelize.models.Entry.findAll({
    attributes: {
      exclude: ["updatedAt"],
    },
    include: [
      {
        association: "verses",
        attributes: ["text", "isMain", "language", "typingSequence"],
      },
      {
        association: "tags",
        attributes: ["name", "slug", "color"],
        through: {
          attributes: [],
        },
      },
      {
        association: "pulses",
        attributes: ["creationDate"],
      },
    ],
    order: [["recentActionDate", "DESC"]],
    limit: entriesPerPage,
  })) as Entry[];
  entries = entries.map((entry) => entry.toJSON() as Entry);
  const totalEntries = await sequelize.models.Entry.count();
  return {
    props: {
      entries,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
    },
    revalidate: 10,
  };
};

export default function Index({ entries, totalPages }: IndexProps) {
  return (
    <>
      <Head>
        <title>{siteName}</title>
        <meta name="description" content={`${tagLine1} ${tagLine2}`} />
        <meta name="og:title" content={siteName} />
        <meta name="og:description" content={`${tagLine1} ${tagLine2}`} />
        <meta name="og:image" content={`${host}/images/og-cover.png`} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`RSS Feed for ${siteName}`}
          href="/feed/"
        />
      </Head>
      <IndexHeader />
      <Divider />
      {entries?.map((entry, idx) => (
        <Fragment key={idx}>
          {idx === 0 ? (
            <TopEntry entry={entry} />
          ) : (
            <SingleEntry entry={entry} />
          )}
          <Divider />
        </Fragment>
      ))}
      <Paginator currentPage={1} totalPages={totalPages} prefix="/" />
      <Footer />
    </>
  );
}
