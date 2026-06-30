import { builder } from "../builder";
import { AlbumRef } from "../types/refs";
import { Album } from "../../../models/Album";
import { Artist } from "../../../models/Artist";
import { Song } from "../../../models/Song";
import { literal } from "sequelize";
import sequelize from "sequelize";
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
    resolve: (_root, { id }) => Album.findByPk(id),
  })
);

builder.queryField("albums", (t) =>
  t.field({
    type: [AlbumRef],
    resolve: () =>
      Album.findAll({
        order: ["sortOrder"],
        attributes: { exclude: ["vocaDbJson"] },
      }),
  })
);

builder.queryField("albumsHasFiles", (t) =>
  t.field({
    type: [AlbumRef],
    resolve: () =>
      Album.findAll({
        order: ["sortOrder"],
        attributes: [
          "id",
          "name",
          "sortOrder",
          "coverUrl",
          "incomplete",
          "creationDate",
          "updatedOn",
          "deletionDate",
        ],
        where: sequelize.literal(`(
        SELECT
          COUNT(MusicFiles.id) 
        FROM SongInAlbums 
        INNER JOIN 
          MusicFiles 
        ON
          SongInAlbums.songId = MusicFiles.songId
        WHERE 
          SongInAlbums.albumId = Album.id and MusicFiles.albumId = Album.id 
      ) > 0`),
      }),
  })
);

builder.queryField("searchAlbums", (t) =>
  t.field({
    type: [AlbumRef],
    args: { keywords: t.arg.string() },
    resolve: (_root, { keywords }) =>
      Album.findAll({
        where: literal(
          "match (name, sortOrder) against (:keywords in boolean mode)"
        ),
        attributes: { exclude: ["vocaDbJson"] },
        replacements: { keywords },
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

      return album;
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

      return album;
    },
  })
);
