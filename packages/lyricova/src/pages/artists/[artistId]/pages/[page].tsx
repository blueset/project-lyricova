import sequelize from "lyricova-common/db";
import type { Entry } from "lyricova-common/models/Entry";
import type { Artist } from "lyricova-common/models/Artist";
import type { GetStaticProps, GetStaticPaths } from "next";
import { entriesPerPage } from "../../../../utils/consts";
import { entryListingCondition } from "../../../../utils/queries";
import { QueryTypes } from "sequelize";
import ArtistArchivePage from "../../[artistId]";

export const getStaticProps: GetStaticProps = async (context) => {
  const page = parseInt(context.params.page as string);
  const artistId = parseInt(context.params.artistId as string);

  if (page === 1)
    return {
      redirect: { statusCode: 302, destination: `/artists/${artistId}` },
    };

  const artist = (await sequelize.models.Artist.findByPk(artistId, {
    attributes: ["id", "name", "type"],
  })) as Artist;

  if (!artist) return { notFound: true };

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

  if (totalEntries < 1) return { notFound: true };

  const entries = (await sequelize.models.Entry.findAll({
    ...entryListingCondition,
    where: { id: entryIds.map((e) => e.entryId) },
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
    WHERE
      artistId is not NULL
    GROUP BY ArtistOfSongs.artistId;
    `,
    {
      type: QueryTypes.SELECT,
    }
  );
  const paths = [];
  for (const { artistId, count } of result) {
    const totalPages = Math.ceil(count / entriesPerPage);
    for (let page = 2; page <= totalPages; page++) {
      paths.push({
        params: {
          artistId: String(artistId),
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

export default ArtistArchivePage;
