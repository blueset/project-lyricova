import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Song } from "lyricova-common/models/Song";
import type { SongOfEntry } from "lyricova-common/models/SongOfEntry";
import { GetStaticProps, GetStaticPaths } from "next";
import { Fragment } from "react";
import { Divider } from "../../../../components/public/Divider";
import { Footer } from "../../../../components/public/Footer";
import { Paginator } from "../../../../components/public/listing/Paginator";
import { SingleEntry } from "../../../../components/public/listing/SingleEntry";
import { SubArchiveHeader } from "../../../../components/public/listing/SubArchiveHeader";
import { entriesPerPage } from "../../../../utils/consts";
import { entryListingCondition } from "../../../../utils/queries";
import classes from "../../SongListings.module.scss";
import SongArchivePage from "../../[songId]";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = parseInt(context.params.page as string);
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
    attributes: [
      "songId",
      [sequelize.fn("COUNT", sequelize.col("entryId")), "count"],
    ],
    group: ["songId"],
  })) as (SongOfEntry & { count: number })[];
  const paths = [];
  for (const i of soe) {
    const totalPages = Math.ceil(i.count / entriesPerPage);
    for (let page = 1; page <= totalPages; page++) {
      paths.push({
        params: {
          songId: String(i.songId),
          page: page.toString(),
        },
      });
    }
  }
  return {
    paths,
    fallback: "blocking",
  };
};

export default SongArchivePage;
