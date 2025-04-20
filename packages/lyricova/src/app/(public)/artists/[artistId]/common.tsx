import { Fragment } from "react";
import { Divider } from "@/components/public/Divider";
import { Footer } from "@/components/public/Footer";
import { Paginator } from "@/components/public/listing/Paginator";
import { SingleEntry } from "@/components/public/listing/SingleEntry";
import { SubArchiveHeader } from "@/components/public/listing/SubArchiveHeader";
import { apiBaseUrl, host, siteName, tagLine1, tagLine2 } from "@/utils/consts";
import classes from "./SongListings.module.scss";
import Head from "next/head";
import { Artist, Entry } from "@lyricova/api/graphql/types";
import { Metadata } from "next";

export async function generateMetadataData(
  artistId: string,
  page: string
): Promise<Metadata> {
  const response = await fetch(`${apiBaseUrl}/artists/${artistId}`, {
    cache: "no-store",
  });
  const artist: Artist = await response.json();
  const typeName = getTypeName(artist.type);

  return {
    title: `${typeName} Archive of ${artist.name} – Page ${page}`,
    description: `${typeName} Archive of ${artist.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
    openGraph: {
      title: `${typeName} Archive of ${artist.name} – Page ${page} – ${siteName}`,
      description: `${typeName} Archive of ${artist.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`,
      images: [`${host}/images/og-cover.png`],
    },
  };
}

function getTypeName(artistType: string): string {
  return (artistType ?? "Artist")
    .replace("Other", "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace("Synthesizer", "Synth")
    .replace("Ce VIO", "CeVIO")
    .replace("Unknown", "Artist");
}

interface ArtistArchivePageProps {
  entries: Entry[];
  artist: Artist;
  page: number;
  totalPages: number;
}

export async function ArtistArchivePageComponent({
  artistId,
  page,
}: {
  artistId: string;
  page: string;
}) {
  const response = await fetch(
    `${apiBaseUrl}/artists/${artistId}/entries?page=${page}`,
    { cache: "no-store" }
  );
  const { entries, artist, totalPages }: ArtistArchivePageProps =
    await response.json();

  const typeName = getTypeName(artist.type);
  const pageNumber = parseInt(page);

  return (
    <>
      <SubArchiveHeader
        page={pageNumber}
        type={`${typeName} archive`}
        keywords={
          artist.id <= 0 ? (
            artist.name
          ) : (
            <a
              href={`https://vocadb.net/Ar/${artist.id}`}
              className={classes.link}
              target="_blank"
              rel="noreferrer"
            >
              {artist.name}
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
        prefix={`/artists/${artist.id}/`}
      />
      <Footer />
    </>
  );
}
