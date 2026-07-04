import { eq, sql } from "drizzle-orm";
import { builder } from "../builder";
import { SongRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Songs, ArtistOfSongs, SongInAlbums } from "../../../drizzle/schema";
import { serializeEnumArray } from "../../../drizzle/enumArray";
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
      ((await db.query.Songs.findFirst({ where: eq(Songs.id, id) })) ?? null),
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
      return db.query.Songs.findMany({ where: whereClause });
    },
  })
);

builder.queryField("songs", (t) =>
  t.field({
    type: [SongRef],
    resolve: async () =>
      db.query.Songs.findMany({
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      }),
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
      const now = new Date();
      await db.insert(Songs).values({
        id,
        name,
        sortOrder,
        coverUrl,
        originalId: originalId ?? null,
        incomplete: false,
        creationDate: now,
        updatedOn: now,
      });
      for (const v of artistsOfSong) {
        await db.insert(ArtistOfSongs).values({
          songId: id,
          artistId: v.artistId,
          categories: serializeEnumArray(v.categories),
          artistRoles: serializeEnumArray(v.artistRoles),
          customName: v.customName ?? null,
          isSupport: v.isSupport,
          creationDate: now,
          updatedOn: now,
        });
      }
      for (const v of songInAlbums) {
        await db.insert(SongInAlbums).values({
          songId: id,
          albumId: v.albumId,
          name: v.name ?? null,
          diskNumber: v.diskNumber ?? null,
          trackNumber: v.trackNumber ?? null,
          creationDate: now,
          updatedOn: now,
        });
      }
      return (await db.query.Songs.findFirst({
        where: eq(Songs.id, id),
      }))!;
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
      const existing = await db.query.Songs.findFirst({
        where: eq(Songs.id, id),
      });
      if (!existing) {
        throw new Error(`Song entity with id ${id} is not found.`);
      }
      const now = new Date();

      await db
        .update(Songs)
        .set({
          name,
          sortOrder,
          coverUrl,
          originalId: originalId ?? null,
          updatedOn: now,
        })
        .where(eq(Songs.id, id));

      // Replace artist associations (mirrors Sequelize $set).
      await db.delete(ArtistOfSongs).where(eq(ArtistOfSongs.songId, id));
      for (const v of artistsOfSong) {
        await db.insert(ArtistOfSongs).values({
          songId: id,
          artistId: v.artistId,
          categories: serializeEnumArray(v.categories),
          artistRoles: serializeEnumArray(v.artistRoles),
          customName: v.customName ?? null,
          isSupport: v.isSupport,
          creationDate: now,
          updatedOn: now,
        });
      }

      // Replace album associations.
      await db.delete(SongInAlbums).where(eq(SongInAlbums.songId, id));
      for (const v of songInAlbums) {
        await db.insert(SongInAlbums).values({
          songId: id,
          albumId: v.albumId,
          name: v.name ?? null,
          diskNumber: v.diskNumber ?? null,
          trackNumber: v.trackNumber ?? null,
          creationDate: now,
          updatedOn: now,
        });
      }

      return (await db.query.Songs.findFirst({
        where: eq(Songs.id, id),
      }))!;
    },
  })
);
