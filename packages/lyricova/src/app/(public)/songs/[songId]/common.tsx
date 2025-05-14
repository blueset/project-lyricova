import { Fragment } from "react";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import { Paginator } from "@/components/public/listing/Paginator";
import { SingleEntry } from "@/components/public/listing/SingleEntry";
import { SubArchiveHeader } from "@/components/public/listing/SubArchiveHeader";
import { apiBaseUrl, host, siteName, tagLine1, tagLine2 } from "@/utils/consts";
import { Artist, Entry, Song } from "@lyricova/api/graphql/types";
import { Metadata } from "next";
import classes from "./SongListings.module.scss";

export async function generateMetadataData(
  songId: string,
  page: string
): Promise<Metadata> {
  const response = await fetch(`${apiBaseUrl}/songs/${songId}`, {
    cache: "no-store",
  });
  const artist: Artist = await response.json();

  return {
    title: `Song Archive of ${artist.name} – Page ${page}`,
    description: `Song Archive of ${artist.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
    openGraph: {
      title: `Song Archive of ${artist.name} – Page ${page} – ${siteName}`,
      description: `Song Archive of ${artist.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
      images: [`${host}/images/og-cover.png`],
    },
  };
}

interface SongArchivePageProps {
  entries: Entry[];
  song: Song;
  page: number;
  totalPages: number;
}

export async function SongArchivePageComponent({
  songId,
  page,
}: {
  songId: string;
  page: string;
}) {
  const response = await fetch(
    `${apiBaseUrl}/songs/${songId}/entries?page=${page}`,
    { cache: "no-store" }
  );
  const { entries, song, totalPages }: SongArchivePageProps =
    await response.json();
  const pageNumber = parseInt(page);

  return (
    <>
      <SubArchiveHeader
        page={pageNumber}
        type="Song archive"
        keywords={
          song.id <= 0 ? (
            song.name
          ) : (
            <a
              href={`https://vocadb.net/S/${song.id}`}
              className={classes.link}
              target="_blank"
              rel="noreferrer"
            >
              {song.name}
            </a>
          )
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
        prefix={`/songs/${song.id}/`}
      />
      <Footer />
    </>
  );
}
