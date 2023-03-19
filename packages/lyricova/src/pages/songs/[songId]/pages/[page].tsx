import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Song } from "lyricova-common/models/Song";
import type { SongOfEntry } from "lyricova-common/models/SongOfEntry";
import { GetStaticProps, GetStaticPaths } from "next";
import { entriesPerPage } from "../../../../utils/consts";
import { entryListingCondition } from "../../../../utils/queries";
import SongArchivePage from "../../[songId]";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = parseInt(context.params.page as string);
  const songid = parseInt(context.params.songId as string);

  if (page === 1)
    return { redirect: { statusCode: 302, destination: `/songs/${songid}` } };

  const song = (await sequelize.models.Song.findByPk(songid, {
    attributes: ["id", "name"],
  })) as Song;

  if (!song) return { notFound: true };

  const totalEntries = await sequelize.models.SongOfEntry.count({
    where: { songId: songid },
  });
  if (totalEntries < 1) return { notFound: true };
  const entries = (await song.$get("lyricovaEntries", {
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
