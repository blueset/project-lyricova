import { builder } from "../builder";
import { parseEnumArray } from "../../../drizzle/enumArray";
import {
  FileInPlaylistRef,
  ArtistOfSongRef,
  ArtistOfAlbumRef,
  SongInAlbumRef,
} from "./refs";

// --- Blog leaves (Drizzle-backed) ---

builder.drizzleObjectFields("Verses", (t) => ({
  html: t.field({ type: "String", nullable: true, resolve: (v: any) => v.html }),
  id: t.field({ type: "Float", resolve: (v: any) => v.id }),
  isMain: t.field({ type: "Boolean", resolve: (v: any) => v.isMain }),
  isOriginal: t.field({ type: "Boolean", resolve: (v: any) => v.isOriginal }),
  language: t.field({ type: "String", resolve: (v: any) => v.language }),
  stylizedText: t.field({
    type: "String",
    nullable: true,
    resolve: (v: any) => v.stylizedText,
  }),
  text: t.field({ type: "String", resolve: (v: any) => v.text }),
  translator: t.field({
    type: "String",
    nullable: true,
    resolve: (v: any) => v.translator,
  }),
  typingSequence: t.field({
    type: t.listRef(t.listRef(t.listRef("String"))),
    resolve: (v: any) => v.typingSequence,
  }),
}));

builder.drizzleObjectFields("Pulses", (t) => ({
  creationDate: t.field({
    type: "Timestamp",
    resolve: (p: any) => p.creationDate,
  }),
  id: t.field({ type: "Int", resolve: (p: any) => p.id }),
}));

// --- Music leaves (Drizzle-backed) ---

builder.drizzleObjectFields("VideoFiles", (t) => ({
  id: t.field({ type: "Int", resolve: (v: any) => v.id }),
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
