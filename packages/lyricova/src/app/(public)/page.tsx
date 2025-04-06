import React, { Fragment } from "react";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import { IndexHeader } from "@/components/public/IndexHeader";
import { Paginator } from "@/components/public/listing/Paginator";
import { SingleEntry } from "@/components/public/listing/SingleEntry";
import { TopEntry } from "@/components/public/listing/TopEntry";
import {
  entriesPerPage,
  host,
  siteName,
  tagLine1,
  tagLine2,
  apiBaseUrl,
} from "@/utils/consts";
import type { Metadata } from "next";
import type { Entry } from "@lyricova/api/graphql/types";

export const metadata: Metadata = {
  title: siteName,
  description: `${tagLine1} ${tagLine2}`,
  openGraph: {
    title: siteName,
    description: `${tagLine1} ${tagLine2}`,
    images: [`${host}/images/og-cover.png`],
  },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed/", title: `RSS Feed for ${siteName}` },
      ],
    },
  },
};

async function getEntries() {
  const response = await fetch(`${apiBaseUrl}/entries`, { cache: "no-store" });
  return (await response.json()) as { entries: Entry[]; count: number };
}

export default async function Page() {
  const { entries, count } = await getEntries();
  const totalPages = Math.ceil(count / entriesPerPage);

  return (
    <>
      <IndexHeader isHome />
      <Divider />
      {entries?.map((entry: Entry, idx: number) => (
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
