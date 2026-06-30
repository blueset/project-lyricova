import { eq, sql } from "drizzle-orm";
import { builder } from "../builder";
import { AlbumRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Albums } from "../../../drizzle/schema";
import { Album } from "../../../models/Album";
import { Artist } from "../../../models/Artist";
import { Song } from "../../../models/Song";
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
      ((await db.query.Albums.findFirst({ where: eq(Albums.id, id) })) ?? null) as any,
  })
);

builder.queryField("albums", (t) =>
  t.field({
    type: [AlbumRef],
    resolve: async () =>
      db.query.Albums.findMany({
        orderBy: (a, { asc }) => [asc(a.sortOrder)],
      }) as any,
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
      }) as any,
  })
);

builder.queryField("searchAlbums", (t) =>
  t.field({
    type: [AlbumRef],
    args: { keywords: t.arg.string() },
    resolve: async (_root, { keywords }) =>
      db.query.Albums.findMany({
        where: sql`match (name, sortOrder) against (${keywords} in boolean mode)`,
      }) as any,
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
      const album = await Album.create({
        id,
        name,
        sortOrder,
        coverUrl,
        incomplete: false,
      } as any);

      await Promise.all(
        artistsOfAlbum.map((v) =>
          album.$add("artist", v.artistId, {
            through: {
              categories: v.categories,
              roles: v.roles,
              effectiveRoles: v.effectiveRoles,
            },
          })
        )
      );
      await Promise.all(
        songsInAlbum.map((v) =>
          album.$add("song", v.songId, {
            through: {
              name: v.name,
              diskNumber: v.diskNumber,
              trackNumber: v.trackNumber,
            },
          })
        )
      );

      return album as any;
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
      const album = await Album.findByPk(id);
      if (album === null) {
        throw new Error(`Album entity with id ${id} is not found.`);
      }

      await album.update({ id, name, sortOrder, coverUrl } as any);

      await album.$set(
        "artists",
        artistsOfAlbum.map((v) => {
          const inst = Artist.build({ id: v.artistId }, { isNewRecord: false });
          inst.ArtistOfAlbum = {
            categories: v.categories,
            roles: v.roles,
            effectiveRoles: v.effectiveRoles,
          } as any;
          return inst;
        })
      );

      await album.$set(
        "songs",
        songsInAlbum.map((v) => {
          const inst = Song.build({ id: v.songId }, { isNewRecord: false });
          inst.SongInAlbum = {
            name: v.name,
            diskNumber: v.diskNumber,
            trackNumber: v.trackNumber,
          } as any;
          return inst;
        })
      );

      return album as any;
    },
  })
);
