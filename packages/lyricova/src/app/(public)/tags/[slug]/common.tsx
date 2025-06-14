import { Fragment } from "react";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import { Paginator } from "@/components/public/listing/Paginator";
import { SingleEntry } from "@/components/public/listing/SingleEntry";
import { SubArchiveHeader } from "@/components/public/listing/SubArchiveHeader";
import { apiBaseUrl, host, siteName, tagLine1, tagLine2 } from "@/utils/consts";
import { Entry, Tag } from "@lyricova/api/graphql/types";
import { Metadata } from "next";

export async function generateMetadataData(
  tagSlug: string,
  page: string
): Promise<Metadata> {
  const response = await fetch(`${apiBaseUrl}/tags/${tagSlug}`, {
    cache: "no-store",
  });
  const { tag }: { tag: Tag } = await response.json();

  return {
    title: `Tag Archive of ${tag.name} – Page ${page}`,
    description: `Tag Archive of ${tag.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
    openGraph: {
      title: `Tag Archive of ${tag.name} – Page ${page} – ${siteName}`,
      description: `Tag Archive of ${tag.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
      images: [`${host}/images/og-cover.png`],
    },
  };
}

interface TagArchivePageProps {
  entries: Entry[];
  tag: Tag;
  page: number;
  totalPages: number;
}

export async function TagArchivePageComponent({
  tagSlug,
  page,
}: {
  tagSlug: string;
  page: string;
}) {
  const response = await fetch(`${apiBaseUrl}/tags/${tagSlug}?page=${page}`, {
    cache: "no-store",
  });
  const { entries, tag, totalPages }: TagArchivePageProps =
    await response.json();
  const pageNumber = parseInt(page);

  return (
    <>
      <SubArchiveHeader
        page={pageNumber}
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
        currentPage={pageNumber}
        totalPages={totalPages}
        prefix={`/tags/${tag.slug}/`}
      />
      <Footer />
    </>
  );
}
