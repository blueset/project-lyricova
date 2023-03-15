import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Song } from "lyricova-common/models/Song";
import type { SongOfEntry } from "lyricova-common/models/SongOfEntry";
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
import classes from "./SongListings.module.scss";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = 1;
  const songid = parseInt(context.params.songId as string);
  const totalEntries = await sequelize.models.SongOfEntry.count({
    where: { songId: songid },
  });
  const song = (await sequelize.models.Song.findByPk(songid, {
    attributes: ["id", "name"],
  })) as Song;
  const entries = (await song.$get("lyricovaEntries", {
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
      song: song.toJSON() as Song,
    },
    revalidate: 10,
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const soe = (await sequelize.models.SongOfEntry.findAll({
    attributes: ["songId"],
    group: ["songId"],
  })) as SongOfEntry[];
  const paths = soe.map((soe) => ({
    params: { songId: String(soe.songId) },
  }));
  return {
    paths,
    fallback: "blocking",
  };
};

interface SongArchivePageProps {
  entries: Entry[];
  song: Song;
  page: number;
  totalPages: number;
}

export default function SongArchivePage({
  entries,
  page,
  totalPages,
  song,
}: SongArchivePageProps) {
  return (
    <>
      <Head>
        <title>
          {`Song Archive of ${song.name} – Page ${page} – ${siteName}`}
        </title>
        <meta
          name="description"
          content={`Song Archive of ${song.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta
          name="og:title"
          content={`Song Archive of ${song.name} – Page ${page} – ${siteName}`}
        />
        <meta
          name="og:description"
          content={`Song Archive of ${song.name} – Page ${page} – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:image" content="/images/og-cover.png" />
      </Head>
      <SubArchiveHeader
        page={page}
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
        currentPage={page}
        totalPages={totalPages}
        prefix={`/songs/${song.id}/`}
      />
      <Footer />
    </>
  );
}
