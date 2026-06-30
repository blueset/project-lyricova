import { builder } from "../builder";
import { parseEnumArray } from "../../../drizzle/enumArray";
import {
  VerseRef,
  PulseRef,
  VideoFileRef,
  FileInPlaylistRef,
  ArtistOfSongRef,
  ArtistOfAlbumRef,
  SongInAlbumRef,
} from "./refs";

// --- Blog leaves (Sequelize-backed for now) ---

VerseRef.implement({
  fields: (t) => ({
    html: t.exposeString("html", { nullable: true }),
    id: t.exposeFloat("id"),
    isMain: t.exposeBoolean("isMain"),
    isOriginal: t.exposeBoolean("isOriginal"),
    language: t.exposeString("language"),
    stylizedText: t.exposeString("stylizedText", { nullable: true }),
    text: t.exposeString("text"),
    translator: t.exposeString("translator", { nullable: true }),
    typingSequence: t.field({
      type: [[["String"]]] as any,
      resolve: (v) => v.typingSequence,
    }),
  }),
});

PulseRef.implement({
  fields: (t) => ({
    creationDate: t.field({
      type: "Timestamp",
      resolve: (p) => p.creationDate,
    }),
    id: t.exposeInt("id"),
  }),
});

// --- Music leaves (Drizzle-backed) ---

builder.drizzleObjectFields("VideoFiles", (t) => ({
  id: t.exposeInt("id"),
}));

FileInPlaylistRef.implement({
  fields: (t) => ({
    creationDate: t.field({
      type: "Timestamp",
      resolve: (f) => f.creationDate,
    }),
    id: t.exposeInt("id"),
    sortOrder: t.exposeInt("sortOrder"),
    updatedOn: t.field({ type: "Timestamp", resolve: (f) => f.updatedOn }),
  }),
});

ArtistOfSongRef.implement({
  fields: (t) => ({
    artistOfSongId: t.exposeInt("artistOfSongId"),
    artistRoles: t.field({
      type: ["String"],
      resolve: (a) => parseEnumArray(a.artistRoles),
    }),
    categories: t.field({
      type: ["String"],
      resolve: (a) => parseEnumArray(a.categories),
    }),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (a) => a.creationDate,
    }),
    customName: t.exposeString("customName", { nullable: true }),
    isSupport: t.exposeBoolean("isSupport"),
    updatedOn: t.field({ type: "Timestamp", resolve: (a) => a.updatedOn }),
    vocaDbId: t.exposeInt("vocaDbId", { nullable: true }),
  }),
});

ArtistOfAlbumRef.implement({
  fields: (t) => ({
    artistOfAlbumId: t.exposeInt("artistOfAlbumId"),
    categories: t.exposeString("categories"),
    effectiveRoles: t.field({
      type: ["String"],
      resolve: (a) => parseEnumArray(a.effectiveRoles),
    }),
    roles: t.field({
      type: ["String"],
      resolve: (a) => parseEnumArray(a.roles),
    }),
  }),
});

SongInAlbumRef.implement({
  fields: (t) => ({
    creationDate: t.field({
      type: "Timestamp",
      resolve: (s) => s.creationDate,
    }),
    diskNumber: t.exposeInt("diskNumber", { nullable: true }),
    name: t.exposeString("name", { nullable: true }),
    trackNumber: t.exposeInt("trackNumber", { nullable: true }),
    updatedOn: t.field({ type: "Timestamp", resolve: (s) => s.updatedOn }),
    vocaDbId: t.exposeInt("vocaDbId", { nullable: true }),
  }),
});
