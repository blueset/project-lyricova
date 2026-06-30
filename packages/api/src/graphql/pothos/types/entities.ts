import { builder } from "../builder";
import {
  SongRef,
  AlbumRef,
  ArtistRef,
  MusicFileRef,
  VideoFileRef,
  SongInAlbumRef,
  ArtistOfAlbumRef,
  ArtistOfSongRef,
} from "./refs";

SongRef.implement({
  fields: (t) => ({
    SongInAlbum: t.field({
      type: SongInAlbumRef,
      nullable: true,
      resolve: (s) => s.SongInAlbum as any,
    }),
    albums: t.field({
      type: [AlbumRef],
      nullable: true,
      resolve: (s) => s.$get("albums"),
    }),
    artists: t.field({
      type: [ArtistRef],
      nullable: true,
      resolve: (s) => s.$get("artists"),
    }),
    coverUrl: t.exposeString("coverUrl", { nullable: true }),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (s) => s.creationDate,
    }),
    derivedSongs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: (s) => s.$get("derivedSongs"),
    }),
    files: t.field({
      type: [MusicFileRef],
      nullable: true,
      resolve: (s) => s.$get("files"),
    }),
    id: t.exposeInt("id"),
    incomplete: t.exposeBoolean("incomplete"),
    name: t.exposeString("name"),
    original: t.field({
      type: SongRef,
      nullable: true,
      resolve: (s) => s.$get("original"),
    }),
    originalId: t.exposeInt("originalId", { nullable: true }),
    sortOrder: t.exposeString("sortOrder"),
    updatedOn: t.field({ type: "Timestamp", resolve: (s) => s.updatedOn }),
    utaiteDbId: t.exposeFloat("utaiteDbId", { nullable: true }),
    videos: t.field({
      type: [VideoFileRef],
      nullable: true,
      resolve: (s) => s.$get("videos"),
    }),
    vocaDbJson: t.field({ type: "JSONObject", resolve: (s) => s.vocaDbJson }),
  }),
});

AlbumRef.implement({
  fields: (t) => ({
    SongInAlbum: t.field({
      type: SongInAlbumRef,
      nullable: true,
      resolve: (a) => a.SongInAlbum as any,
    }),
    artists: t.field({
      type: [ArtistRef],
      nullable: true,
      resolve: (a) => a.$get("artists"),
    }),
    coverUrl: t.exposeString("coverUrl", { nullable: true }),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (a) => a.creationDate,
    }),
    deletionDate: t.field({
      type: "Timestamp",
      resolve: (a) => a.deletionDate,
    }),
    files: t.field({
      type: [MusicFileRef],
      nullable: true,
      resolve: (a) => a.$get("files"),
    }),
    id: t.exposeInt("id"),
    incomplete: t.exposeBoolean("incomplete"),
    name: t.exposeString("name"),
    songs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: (a) => a.$get("songs"),
    }),
    sortOrder: t.exposeString("sortOrder"),
    updatedOn: t.field({ type: "Timestamp", resolve: (a) => a.updatedOn }),
    utaiteDbId: t.exposeFloat("utaiteDbId", { nullable: true }),
  }),
});

ArtistRef.implement({
  fields: (t) => ({
    ArtistOfAlbum: t.field({
      type: ArtistOfAlbumRef,
      nullable: true,
      resolve: (a) => a.ArtistOfAlbum as any,
    }),
    ArtistOfSong: t.field({
      type: ArtistOfSongRef,
      nullable: true,
      resolve: (a) => a.ArtistOfSong as any,
    }),
    albums: t.field({
      type: [AlbumRef],
      nullable: true,
      resolve: (a) => a.$get("albums"),
    }),
    baseVoiceBank: t.field({
      type: ArtistRef,
      nullable: true,
      resolve: (a) => a.$get("baseVoiceBank"),
    }),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (a) => a.creationDate,
    }),
    derivedVoiceBanks: t.field({
      type: [ArtistRef],
      nullable: true,
      resolve: (a) => a.$get("derivedVoiceBanks"),
    }),
    id: t.exposeInt("id"),
    incomplete: t.exposeBoolean("incomplete"),
    mainPictureUrl: t.exposeString("mainPictureUrl", { nullable: true }),
    name: t.exposeString("name"),
    songs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: (a) => a.$get("songs"),
    }),
    sortOrder: t.exposeString("sortOrder"),
    type: t.exposeString("type"),
    updatedOn: t.field({ type: "Timestamp", resolve: (a) => a.updatedOn }),
    utaiteDbId: t.exposeFloat("utaiteDbId", { nullable: true }),
    vocaDbJson: t.field({ type: "JSONObject", resolve: (a) => a.vocaDbJson }),
  }),
});
