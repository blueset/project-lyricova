import type { Entry } from "@lyricova/api/graphql/types";
import { Fragment } from "react";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import { ArchiveHeader } from "@/components/public/listing/ArchiveHeader";
import { Paginator } from "@/components/public/listing/Paginator";
import { SingleEntry } from "@/components/public/listing/SingleEntry";
import {
  apiBaseUrl,
  entriesPerPage,
  host,
  siteName,
  tagLine1,
  tagLine2,
} from "@/utils/consts";
import { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

interface EntryPageProps {
  params: Promise<{
    page: string;
  }>;
}

export async function generateMetadata({
  params,
}: EntryPageProps): Promise<Metadata> {
  const { page } = await params;

  return {
    title: `Archive Page ${page}`,
    description: `Archive Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
    openGraph: {
      title: `Archive Page ${page} – ${siteName}`,
      description: `Archive Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
      images: [`${host}/images/og-cover.png`],
    },
  };
}

export default async function ArchivePage({ params }: EntryPageProps) {
  const { page } = await params;
  const pageNumber = parseInt(page);

  if (pageNumber === 1) {
    permanentRedirect("/");
  }

  const response = await fetch(`${apiBaseUrl}/entries?page=${page}`, {
    cache: "no-store",
  });
  const { entries, count } = (await response.json()) as {
    entries: Entry[];
    count: number;
  };
  const totalPages = Math.ceil(count / entriesPerPage);

  return (
    <>
      <ArchiveHeader page={pageNumber} />
      <Divider />
      {entries?.map((entry, idx) => (
        <Fragment key={idx}>
          <SingleEntry entry={entry} />
          <Divider />
        </Fragment>
      ))}
      <Paginator currentPage={pageNumber} totalPages={totalPages} prefix="/" />
      <Footer />
    </>
  );
}
