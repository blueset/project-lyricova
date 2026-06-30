import { eq } from "drizzle-orm";
import { builder } from "../builder";
import { db } from "../../../drizzle/client";
import {
  ArtistOfSongs,
  SongInAlbums,
  ArtistOfAlbums,
} from "../../../drizzle/schema";
import {
  SongRef,
  AlbumRef,
  ArtistRef,
  SongInAlbumRef,
  ArtistOfAlbumRef,
  ArtistOfSongRef,
} from "./refs";

/**
 * Music entity types (Song/Album/Artist) backed by Drizzle via the plugin.
 *
 * Scalar fields use `t.field` with a direct column resolver (NOT the plugin's
 * `t.expose*`): expose triggers the plugin's per-field ModelLoader re-fetch by
 * primary key, which is both unnecessary (the parent row already carries the
 * column) and unreliable when the parent is a *mapped* M2M result rather than a
 * plugin-loaded row. Direct reads work uniformly for query rows, mapped M2M
 * targets, and (transitionally) Sequelize instances.
 *
 * FK / self-ref associations use `t.relation` (auto-dataloaded by primary key).
 *
 * The schema's many-to-many fields carry the junction row on the *target* entity
 * (a Sequelize `belongsToMany` idiom: e.g. `Song.artists` returns Artists each
 * exposing `ArtistOfSong`). drizzle-orm has no through-relations, so these are
 * resolved with an explicit junction query, attaching the junction row to each
 * mapped target (read back by the target's reflected junction field).
 */

builder.drizzleObjectFields("Songs", (t) => {
  const col = (type: any, name: string, nullable = false) =>
    t.field({ type, nullable, resolve: (s: any) => s[name] });
  return {
    id: col("Int", "id"),
    name: col("String", "name"),
    sortOrder: col("String", "sortOrder"),
    coverUrl: col("String", "coverUrl", true),
    originalId: col("Int", "originalId", true),
    incomplete: col("Boolean", "incomplete"),
    utaiteDbId: col("Float", "utaiteDbId", true),
    vocaDbJson: t.field({ type: "JSONObject", resolve: (s: any) => s.vocaDbJson }),
    creationDate: t.field({ type: "Timestamp", resolve: (s: any) => s.creationDate }),
    updatedOn: t.field({ type: "Timestamp", resolve: (s: any) => s.updatedOn }),
    original: t.relation("original", { nullable: true }),
    derivedSongs: t.relation("derivedSongs", { nullable: true }),
    files: t.relation("files", { nullable: true }),
    videos: t.relation("videos", { nullable: true }),
    artists: t.field({
      type: [ArtistRef],
      nullable: true,
      resolve: async (song: any) => {
        const rows = await db.query.ArtistOfSongs.findMany({
          where: eq(ArtistOfSongs.songId, song.id),
          with: { artist: true },
        });
        return rows.map((r) => ({ ...r.artist, ArtistOfSong: r })) as any;
      },
    }),
    albums: t.field({
      type: [AlbumRef],
      nullable: true,
      resolve: async (song: any) => {
        const rows = await db.query.SongInAlbums.findMany({
          where: eq(SongInAlbums.songId, song.id),
          with: { album: true },
        });
        return rows.map((r) => ({ ...r.album, SongInAlbum: r })) as any;
      },
    }),
    SongInAlbum: t.field({
      type: SongInAlbumRef,
      nullable: true,
      resolve: (s: any) => s.SongInAlbum ?? null,
    }),
  };
});

builder.drizzleObjectFields("Albums", (t) => {
  const col = (type: any, name: string, nullable = false) =>
    t.field({ type, nullable, resolve: (a: any) => a[name] });
  return {
    id: col("Int", "id"),
    name: col("String", "name"),
    sortOrder: col("String", "sortOrder"),
    coverUrl: col("String", "coverUrl", true),
    incomplete: col("Boolean", "incomplete"),
    utaiteDbId: col("Float", "utaiteDbId", true),
    creationDate: t.field({ type: "Timestamp", resolve: (a: any) => a.creationDate }),
    updatedOn: t.field({ type: "Timestamp", resolve: (a: any) => a.updatedOn }),
    deletionDate: t.field({ type: "Timestamp", resolve: (a: any) => a.deletionDate }),
    files: t.relation("files", { nullable: true }),
    songs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: async (album: any) => {
        const rows = await db.query.SongInAlbums.findMany({
          where: eq(SongInAlbums.albumId, album.id),
          with: { song: true },
        });
        return rows.map((r) => ({ ...r.song, SongInAlbum: r })) as any;
      },
    }),
    artists: t.field({
      type: [ArtistRef],
      nullable: true,
      resolve: async (album: any) => {
        const rows = await db.query.ArtistOfAlbums.findMany({
          where: eq(ArtistOfAlbums.albumId, album.id),
          with: { artist: true },
        });
        return rows.map((r) => ({ ...r.artist, ArtistOfAlbum: r })) as any;
      },
    }),
    SongInAlbum: t.field({
      type: SongInAlbumRef,
      nullable: true,
      resolve: (a: any) => a.SongInAlbum ?? null,
    }),
  };
});

builder.drizzleObjectFields("Artists", (t) => {
  const col = (type: any, name: string, nullable = false) =>
    t.field({ type, nullable, resolve: (a: any) => a[name] });
  return {
    id: col("Int", "id"),
    name: col("String", "name"),
    sortOrder: col("String", "sortOrder"),
    mainPictureUrl: col("String", "mainPictureUrl", true),
    type: col("String", "type"),
    incomplete: col("Boolean", "incomplete"),
    utaiteDbId: col("Float", "utaiteDbId", true),
    vocaDbJson: t.field({ type: "JSONObject", resolve: (a: any) => a.vocaDbJson }),
    creationDate: t.field({ type: "Timestamp", resolve: (a: any) => a.creationDate }),
    updatedOn: t.field({ type: "Timestamp", resolve: (a: any) => a.updatedOn }),
    baseVoiceBank: t.relation("baseVoiceBank", { nullable: true }),
    derivedVoiceBanks: t.relation("derivedVoiceBanks", { nullable: true }),
    songs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: async (artist: any) => {
        const rows = await db.query.ArtistOfSongs.findMany({
          where: eq(ArtistOfSongs.artistId, artist.id),
          with: { song: true },
        });
        return rows.map((r) => ({ ...r.song, ArtistOfSong: r })) as any;
      },
    }),
    albums: t.field({
      type: [AlbumRef],
      nullable: true,
      resolve: async (artist: any) => {
        const rows = await db.query.ArtistOfAlbums.findMany({
          where: eq(ArtistOfAlbums.artistId, artist.id),
          with: { album: true },
        });
        return rows.map((r) => ({ ...r.album, ArtistOfAlbum: r })) as any;
      },
    }),
    ArtistOfSong: t.field({
      type: ArtistOfSongRef,
      nullable: true,
      resolve: (a: any) => a.ArtistOfSong ?? null,
    }),
    ArtistOfAlbum: t.field({
      type: ArtistOfAlbumRef,
      nullable: true,
      resolve: (a: any) => a.ArtistOfAlbum ?? null,
    }),
  };
});
