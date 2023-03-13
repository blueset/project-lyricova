import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Artist } from "lyricova-common/models/Artist";
import { GetStaticProps, GetStaticPaths } from "next";
import { Fragment } from "react";
import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { Paginator } from "../../components/public/listing/Paginator";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import { SubArchiveHeader } from "../../components/public/listing/SubArchiveHeader";
import { entriesPerPage } from "../../utils/consts";
import { entryListingCondition } from "../../utils/queries";
import { QueryTypes } from "sequelize";
import classes from "./SongListings.module.scss";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = 1;
  const artistId = parseInt(context.params.artistId as string);
  const entryIds = await sequelize.query<{ entryId: number }>(
    `
    SELECT
      SongOfEntries.entryId as entryId
    FROM
      SongOfEntries
      LEFT JOIN ArtistOfSongs ON SongOfEntries.songId = ArtistOfSongs.songId
    WHERE artistId = :artistId
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { artistId },
    }
  );
  const totalEntries = entryIds.length;
  const artist = (await sequelize.models.Artist.findByPk(artistId, {
    attributes: ["id", "name", "type"],
  })) as Artist;
  const entries = (await sequelize.models.Entry.findAll({
    ...entryListingCondition,
    where: { id: entryIds.map((e) => e.entryId) },
    order: [["recentActionDate", "DESC"]],
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
  })) as Entry[];

  return {
    props: {
      entries: entries.map((entry) => entry.toJSON() as Entry),
      page,
      totalPages: Math.ceil(totalEntries / entriesPerPage),
      artist: artist.toJSON() as Artist,
    },
    revalidate: 10,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const result = await sequelize.query<{ artistId: number; count: number }>(
    `
    SELECT
      ArtistOfSongs.artistId as artistId,
      COUNT(SongOfEntries.entryId) as count
    FROM
      SongOfEntries
      LEFT JOIN ArtistOfSongs ON SongOfEntries.songId = ArtistOfSongs.songId
    GROUP BY ArtistOfSongs.artistId;
    `,
    {
      type: QueryTypes.SELECT,
    }
  );
  const paths = result.map((r) => ({
    params: { artistId: String(r.artistId) },
  }));
  return {
    paths,
    fallback: "blocking",
  };
};

interface ArtistArchivePageProps {
  entries: Entry[];
  artist: Artist;
  page: number;
  totalPages: number;
}

export default function ArtistArchivePage({
  entries,
  page,
  totalPages,
  artist,
}: ArtistArchivePageProps) {
  const typeName = (artist.type ?? "Artist")
    .replace("Other", "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace("Synthesizer", "Synth")
    .replace("Ce VIO", "CeVIO")
    .replace("Unknown", "Artist");
  return (
    <>
      <SubArchiveHeader
        page={page}
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
        currentPage={page}
        totalPages={totalPages}
        prefix={`/artists/${artist.id}/`}
      />
      <Footer />
    </>
  );
}
