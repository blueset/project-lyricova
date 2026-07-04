import { eq, sql } from "drizzle-orm";
import { builder } from "../builder";
import { AlbumRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import {
  Albums,
  ArtistOfAlbums,
  SongInAlbums,
} from "../../../drizzle/schema";
import { serializeEnumArray } from "../../../drizzle/enumArray";
import _ from "lodash";

const ArtistOfAlbumInput = builder.inputType("ArtistOfAlbumInput", {
  fields: (t) => ({
    artistId: t.int(),
    categories: t.string(),
    roles: t.stringList(),
    effectiveRoles: t.stringList(),
  }),
});

const SongInAlbumOnAlbumInput = builder.inputType("SongInAlbumOnAlbumInput", {
  fields: (t) => ({
    songId: t.int(),
    diskNumber: t.int({ required: false }),
    trackNumber: t.int({ required: false }),
    name: t.string({ required: false }),
  }),
});

const AlbumInput = builder.inputType("AlbumInput", {
  fields: (t) => ({
    name: t.string(),
    sortOrder: t.string(),
    coverUrl: t.string({ required: false }),
    songsInAlbum: t.field({ type: [SongInAlbumOnAlbumInput] }),
    artistsOfAlbum: t.field({ type: [ArtistOfAlbumInput] }),
  }),
});

builder.queryField("album", (t) =>
  t.field({
    type: AlbumRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) =>
      ((await db.query.Albums.findFirst({ where: eq(Albums.id, id) })) ?? null),
  })
);

builder.queryField("albums", (t) =>
  t.field({
    type: [AlbumRef],
    resolve: async () =>
      db.query.Albums.findMany({
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
      }),
  })
);

builder.queryField("albumsHasFiles", (t) =>
  t.field({
    type: [AlbumRef],
    resolve: async () =>
      db.query.Albums.findMany({
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
        where: sql`(
        SELECT
          COUNT(MusicFiles.id) 
        FROM SongInAlbums 
        INNER JOIN 
          MusicFiles 
        ON
          SongInAlbums.songId = MusicFiles.songId
        WHERE 
          SongInAlbums.albumId = Albums.id and MusicFiles.albumId = Albums.id 
      ) > 0`,
      }),
  })
);

builder.queryField("searchAlbums", (t) =>
  t.field({
    type: [AlbumRef],
    args: { keywords: t.arg.string() },
    resolve: async (_root, { keywords }) =>
      db.query.Albums.findMany({
        where: sql`match (name, sortOrder) against (${keywords} in boolean mode)`,
      }),
  })
);

builder.mutationField("newAlbum", (t) =>
  t.field({
    type: AlbumRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: AlbumInput }) },
    resolve: async (_root, { data }) => {
      const { name, sortOrder, coverUrl, artistsOfAlbum, songsInAlbum } = data;
      const id = _.random(-2147483648, -1, false);
      const now = new Date();
      await db.insert(Albums).values({
        id,
        name,
        sortOrder,
        coverUrl: coverUrl ?? null,
        incomplete: false,
        creationDate: now,
        updatedOn: now,
      });

      for (const v of artistsOfAlbum) {
        await db.insert(ArtistOfAlbums).values({
          albumId: id,
          artistId: v.artistId,
          categories: v.categories as (typeof ArtistOfAlbums.$inferInsert)["categories"],
          roles: serializeEnumArray(v.roles),
          effectiveRoles: serializeEnumArray(v.effectiveRoles),
          creationDate: now,
          updatedOn: now,
        });
      }
      for (const v of songsInAlbum) {
        await db.insert(SongInAlbums).values({
          albumId: id,
          songId: v.songId,
          name: v.name ?? null,
          diskNumber: v.diskNumber ?? null,
          trackNumber: v.trackNumber ?? null,
          creationDate: now,
          updatedOn: now,
        });
      }

      return (await db.query.Albums.findFirst({
        where: eq(Albums.id, id),
      }))!;
    },
  })
);

builder.mutationField("updateAlbum", (t) =>
  t.field({
    type: AlbumRef,
    authScopes: { admin: true },
    args: { id: t.arg.int(), data: t.arg({ type: AlbumInput }) },
    resolve: async (_root, { id, data }) => {
      const { name, sortOrder, coverUrl, artistsOfAlbum, songsInAlbum } = data;
      const existing = await db.query.Albums.findFirst({
        where: eq(Albums.id, id),
      });
      if (!existing) {
        throw new Error(`Album entity with id ${id} is not found.`);
      }
      const now = new Date();

      await db
        .update(Albums)
        .set({ name, sortOrder, coverUrl: coverUrl ?? null, updatedOn: now })
        .where(eq(Albums.id, id));

      // Replace artist associations (mirrors Sequelize $set).
      await db.delete(ArtistOfAlbums).where(eq(ArtistOfAlbums.albumId, id));
      for (const v of artistsOfAlbum) {
        await db.insert(ArtistOfAlbums).values({
          albumId: id,
          artistId: v.artistId,
          categories: v.categories as (typeof ArtistOfAlbums.$inferInsert)["categories"],
          roles: serializeEnumArray(v.roles),
          effectiveRoles: serializeEnumArray(v.effectiveRoles),
          creationDate: now,
          updatedOn: now,
        });
      }

      // Replace song associations.
      await db.delete(SongInAlbums).where(eq(SongInAlbums.albumId, id));
      for (const v of songsInAlbum) {
        await db.insert(SongInAlbums).values({
          albumId: id,
          songId: v.songId,
          name: v.name ?? null,
          diskNumber: v.diskNumber ?? null,
          trackNumber: v.trackNumber ?? null,
          creationDate: now,
          updatedOn: now,
        });
      }

      return (await db.query.Albums.findFirst({
        where: eq(Albums.id, id),
      }))!;
    },
  })
);
