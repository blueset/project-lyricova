import { eq, sql } from "drizzle-orm";
import { builder } from "../builder";
import { SongRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Songs } from "../../../drizzle/schema";
import { Song } from "../../../models/Song";
import { Album } from "../../../models/Album";
import { Artist } from "../../../models/Artist";
import _ from "lodash";

const ArtistOfSongInput = builder.inputType("ArtistOfSongInput", {
  fields: (t) => ({
    artistId: t.int(),
    categories: t.stringList(),
    artistRoles: t.stringList(),
    customName: t.string({ required: false }),
    isSupport: t.boolean({ defaultValue: false }),
  }),
});

const SongInAlbumOnSongInput = builder.inputType("SongInAlbumOnSongInput", {
  fields: (t) => ({
    albumId: t.int(),
    diskNumber: t.int({ required: false }),
    trackNumber: t.int({ required: false }),
    name: t.string({ required: false }),
  }),
});

const SongInput = builder.inputType("SongInput", {
  fields: (t) => ({
    name: t.string(),
    sortOrder: t.string(),
    coverUrl: t.string(),
    originalId: t.int({ required: false }),
    artistsOfSong: t.field({ type: [ArtistOfSongInput] }),
    songInAlbums: t.field({ type: [SongInAlbumOnSongInput] }),
  }),
});

builder.queryField("song", (t) =>
  t.field({
    type: SongRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) =>
      ((await db.query.Songs.findFirst({ where: eq(Songs.id, id) })) ?? null) as any,
  })
);

builder.queryField("searchSongs", (t) =>
  t.field({
    type: [SongRef],
    args: { keywords: t.arg.string() },
    resolve: async (_root, { keywords }) => {
      const numericKeywords = Number(keywords);
      const whereClause = isNaN(numericKeywords)
        ? sql`match (name, sortOrder) against (${keywords} in boolean mode)`
        : sql`match (name, sortOrder) against (${keywords} in boolean mode) OR id = ${numericKeywords}`;
      return db.query.Songs.findMany({ where: whereClause }) as any;
    },
  })
);

builder.queryField("songs", (t) =>
  t.field({
    type: [SongRef],
    resolve: async () =>
      db.query.Songs.findMany({
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      }) as any,
  })
);

builder.mutationField("newSong", (t) =>
  t.field({
    type: SongRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: SongInput }) },
    resolve: async (_root, { data }) => {
      const { name, sortOrder, coverUrl, originalId, artistsOfSong, songInAlbums } =
        data;
      const id = _.random(-2147483648, -1, false);
      const song = await Song.create({
        id,
        name,
        sortOrder,
        coverUrl,
        originalId,
        incomplete: false,
      } as any);
      await Promise.all(
        artistsOfSong.map((v) =>
          song.$add("artist", v.artistId, {
            through: {
              categories: v.categories,
              artistRoles: v.artistRoles,
              customName: v.customName,
              isSupport: v.isSupport,
            },
          })
        )
      );
      await Promise.all(
        songInAlbums.map((v) =>
          song.$add("albums", v.albumId, {
            through: {
              name: v.name,
              diskNumber: v.diskNumber,
              trackNumber: v.trackNumber,
            },
          })
        )
      );
      return song as any;
    },
  })
);

builder.mutationField("updateSong", (t) =>
  t.field({
    type: SongRef,
    authScopes: { admin: true },
    args: { id: t.arg.int(), data: t.arg({ type: SongInput }) },
    resolve: async (_root, { id, data }) => {
      const { name, sortOrder, coverUrl, originalId, artistsOfSong, songInAlbums } =
        data;
      const song = await Song.findByPk(id);
      if (song === null) {
        throw new Error(`Song entity with id ${id} is not found.`);
      }

      await song.update({ id, name, sortOrder, coverUrl, originalId } as any);

      await song.$set(
        "artists",
        artistsOfSong.map((v) => {
          const inst = Artist.build({ id: v.artistId }, { isNewRecord: false });
          inst.ArtistOfSong = {
            categories: v.categories,
            artistRoles: v.artistRoles,
            customName: v.customName,
            isSupport: v.isSupport,
          } as any;
          return inst;
        })
      );

      await song.$set(
        "albums",
        songInAlbums.map((v) => {
          const inst = Album.build({ id: v.albumId }, { isNewRecord: false });
          inst.SongInAlbum = {
            name: v.name,
            diskNumber: v.diskNumber,
            trackNumber: v.trackNumber,
          } as any;
          return inst;
        })
      );

      return song as any;
    },
  })
);
