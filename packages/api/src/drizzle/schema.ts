import { sql } from "drizzle-orm";
import {
  mysqlTable,
  int,
  varchar,
  text,
  json,
  float,
  boolean,
  datetime,
  mysqlEnum,
  index,
  uniqueIndex,
  primaryKey,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";

/**
 * Drizzle schema for the Lyricova MySQL database.
 *
 * Hand-authored from the canonical `lyricova-schema.sql` dump (the DB has no live
 * introspection target here) and cross-checked against the plain model types in
 * `src/models/*` (which now also back the OpenAPI schema). This is the sole ORM
 * source of truth; migrations are generated with drizzle-kit (`npm run
 * db:generate` / `db:migrate`).
 *
 * Notes:
 * - **FULLTEXT (ngram) indexes** on Albums/Artists/Songs/MusicFiles are NOT
 *   expressible in Drizzle mysql-core; they remain DB-managed (see
 *   `lyricova-schema.sql`) and are used through raw `sql` MATCH...AGAINST.
 * - **SIMPLE_ENUM_ARRAY** columns (ArtistOf*.roles/effectiveRoles/artistRoles/
 *   categories) are stored as VARCHAR; (de)serialize with the helpers in
 *   `./enumArray`.
 * - `MusicFile.fullPath` was a Sequelize VIRTUAL (not a column) and is
 *   intentionally absent here; compute it in the app/resolver layer.
 */

// --- Core entities -------------------------------------------------------

export const Albums = mysqlTable(
  "Albums",
  {
    id: int("id").primaryKey(),
    name: varchar("name", { length: 4096 }),
    sortOrder: varchar("sortOrder", { length: 4096 }),
    coverUrl: varchar("coverUrl", { length: 4096 }),
    utaiteDbId: int("utaiteDbId"),
    vocaDbJson: json("vocaDbJson"),
    incomplete: boolean("incomplete").default(true),
    deletionDate: datetime("deletionDate", { mode: "date" }),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
  },
  (t) => [index("Album_sortOredr_index").on(t.sortOrder)]
);

export const Artists = mysqlTable(
  "Artists",
  {
    id: int("id").primaryKey(),
    name: varchar("name", { length: 4096 }),
    sortOrder: varchar("sortOrder", { length: 4096 }),
    mainPictureUrl: varchar("mainPictureUrl", { length: 4096 }),
    type: mysqlEnum("type", [
      "Unknown",
      "Circle",
      "Label",
      "Producer",
      "Animator",
      "Illustrator",
      "Lyricist",
      "Vocaloid",
      "UTAU",
      "CeVIO",
      "OtherVoiceSynthesizer",
      "OtherVocalist",
      "OtherGroup",
      "OtherIndividual",
      "Utaite",
      "Band",
      "Vocalist",
      "Character",
      "SynthesizerV",
      "CoverArtist",
      "NEUTRINO",
      "VoiSona",
      "NewType",
      "Voiceroid",
      "Instrumentalist",
      "Designer",
    ]),
    baseVoiceBankId: int("baseVoiceBankId").references((): AnyMySqlColumn => Artists.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    utaiteDbId: int("utaiteDbId"),
    vocaDbJson: json("vocaDbJson"),
    incomplete: boolean("incomplete").default(true),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    deletionDate: datetime("deletionDate", { mode: "date" }),
  },
  (t) => [index("baseVoiceBankId").on(t.baseVoiceBankId)]
);

export const Songs = mysqlTable(
  "Songs",
  {
    id: int("id").primaryKey(),
    name: varchar("name", { length: 4096 }),
    sortOrder: varchar("sortOrder", { length: 4096 }),
    originalId: int("originalId").references((): AnyMySqlColumn => Songs.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    vocaDbJson: json("vocaDbJson"),
    coverUrl: varchar("coverUrl", { length: 4096 }),
    utaiteDbId: int("utaiteDbId"),
    incomplete: boolean("incomplete").default(true),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    deletionDate: datetime("deletionDate", { mode: "date" }),
  },
  (t) => [index("originalId").on(t.originalId)]
);

export const MusicFiles = mysqlTable(
  "MusicFiles",
  {
    id: int("id").primaryKey().autoincrement(),
    path: varchar("path", { length: 768 }),
    fileSize: int("fileSize", { unsigned: true }),
    songId: int("songId").references((): AnyMySqlColumn => Songs.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    albumId: int("albumId").references((): AnyMySqlColumn => Albums.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    trackName: varchar("trackName", { length: 1024 }),
    trackSortOrder: varchar("trackSortOrder", { length: 1024 }),
    albumName: varchar("albumName", { length: 1024 }),
    albumSortOrder: varchar("albumSortOrder", { length: 1024 }),
    artistName: varchar("artistName", { length: 1024 }),
    artistSortOrder: varchar("artistSortOrder", { length: 1024 }),
    hasLyrics: boolean("hasLyrics"),
    hasCover: boolean("hasCover"),
    needReview: boolean("needReview"),
    duration: float("duration").default(-1),
    hash: varchar("hash", { length: 128 }),
    playCount: int("playCount", { unsigned: true }).notNull().default(0),
    lastPlayed: datetime("lastPlayed", { mode: "date" }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("path").on(t.path),
    index("songId").on(t.songId),
    index("albumId").on(t.albumId),
  ]
);

export const VideoFiles = mysqlTable(
  "VideoFiles",
  {
    id: int("id").primaryKey().autoincrement(),
    path: varchar("path", { length: 768 }),
    songId: int("songId").references((): AnyMySqlColumn => Songs.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    title: varchar("title", { length: 1024 }),
    sourceUrl: varchar("sourceUrl", { length: 2048 }),
    type: mysqlEnum("type", [
      "Original",
      "PV",
      "Derived",
      "Subtitled",
      "OnVocal",
      "OffVocal",
      "Other",
    ]).default("Other"),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    deletionDate: datetime("deletionDate", { mode: "date" }),
  },
  (t) => [uniqueIndex("path").on(t.path), index("songId").on(t.songId)]
);

// --- Junctions (with attributes) -----------------------------------------

export const ArtistOfAlbums = mysqlTable(
  "ArtistOfAlbums",
  {
    artistOfAlbumId: int("artistOfAlbumId").primaryKey().autoincrement(),
    // SIMPLE_ENUM_ARRAY stored as VARCHAR (see ./enumArray)
    roles: varchar("roles", { length: 174 }),
    effectiveRoles: varchar("effectiveRoles", { length: 174 }),
    categories: mysqlEnum("categories", [
      "Nothing",
      "Vocalist",
      "Producer",
      "Animator",
      "Label",
      "Circle",
      "Other",
      "Band",
      "Illustrator",
      "Subject",
    ]).default("Nothing"),
    albumId: int("albumId").references((): AnyMySqlColumn => Albums.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    artistId: int("artistId").references((): AnyMySqlColumn => Artists.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("ArtistOfAlbums_artistId_albumId_unique").on(
      t.albumId,
      t.artistId
    ),
    index("artistId").on(t.artistId),
  ]
);

export const ArtistOfSongs = mysqlTable(
  "ArtistOfSongs",
  {
    artistOfSongId: int("artistOfSongId").primaryKey().autoincrement(),
    vocaDbId: int("vocaDbId"),
    // SIMPLE_ENUM_ARRAY stored as VARCHAR (see ./enumArray)
    artistRoles: varchar("artistRoles", { length: 174 }),
    categories: varchar("categories", { length: 174 }),
    customName: varchar("customName", { length: 4096 }),
    isSupport: boolean("isSupport").default(false),
    songId: int("songId").references((): AnyMySqlColumn => Songs.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    artistId: int("artistId").references((): AnyMySqlColumn => Artists.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("vocaDbId").on(t.vocaDbId),
    uniqueIndex("ArtistOfSongs_songId_artistId_unique").on(t.songId, t.artistId),
    index("artistId").on(t.artistId),
  ]
);

export const SongInAlbums = mysqlTable(
  "SongInAlbums",
  {
    songInAlbumId: int("songInAlbumId").primaryKey().autoincrement(),
    vocaDbId: int("vocaDbId"),
    diskNumber: int("diskNumber"),
    trackNumber: int("trackNumber"),
    name: varchar("name", { length: 2048 }),
    songId: int("songId").references((): AnyMySqlColumn => Songs.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    albumId: int("albumId").references((): AnyMySqlColumn => Albums.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("vocaDbId").on(t.vocaDbId),
    uniqueIndex("SongInAlbums_songId_albumId_unique").on(t.songId, t.albumId),
    index("albumId").on(t.albumId),
  ]
);

// --- Blog (Entries/Verses/Pulses/Tags) -----------------------------------

export const Users = mysqlTable(
  "Users",
  {
    id: int("id").primaryKey().autoincrement(),
    username: varchar("username", { length: 256 }),
    displayName: varchar("displayName", { length: 256 }),
    password: varchar("password", { length: 256 }),
    email: varchar("email", { length: 512 }),
    role: mysqlEnum("role", ["admin", "guest"]).default("guest"),
    provider: varchar("provider", { length: 256 }),
    provider_id: varchar("provider_id", { length: 1024 }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    deletionDate: datetime("deletionDate", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("username").on(t.username),
    uniqueIndex("email").on(t.email),
  ]
);

export const UserPublicKeyCredentials = mysqlTable(
  "UserPublicKeyCredentials",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("userId").references((): AnyMySqlColumn => Users.id, {
      onUpdate: "cascade",
    }),
    externalId: varchar("externalId", { length: 512 }),
    publicKey: text("publicKey"),
    remarks: text("remarks"),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("externalId").on(t.externalId),
    index("userId").on(t.userId),
  ]
);

export const Entries = mysqlTable(
  "Entries",
  {
    id: int("id").primaryKey().autoincrement(),
    title: varchar("title", { length: 512 }),
    producersName: varchar("producersName", { length: 1024 }),
    vocalistsName: varchar("vocalistsName", { length: 1024 }),
    authorId: int("authorId").references((): AnyMySqlColumn => Users.id, {
      onUpdate: "cascade",
    }),
    comment: text("comment"),
    recentActionDate: datetime("recentActionDate", { mode: "date" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    deletionDate: datetime("deletionDate", { mode: "date" }),
  },
  (t) => [
    index("authorId").on(t.authorId),
    index("recentActionDateIndex").on(t.recentActionDate),
  ]
);

export const Pulses = mysqlTable(
  "Pulses",
  {
    id: int("id").primaryKey().autoincrement(),
    entryId: int("entryId").references((): AnyMySqlColumn => Entries.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
  },
  (t) => [index("pulses_ibfk_1").on(t.entryId)]
);

export const Verses = mysqlTable(
  "Verses",
  {
    id: int("id").primaryKey().autoincrement(),
    language: varchar("language", { length: 64 }),
    isOriginal: boolean("isOriginal"),
    isMain: boolean("isMain"),
    text: text("text"),
    html: text("html"),
    stylizedText: text("stylizedText"),
    translator: text("translator"),
    typingSequence: json("typingSequence"),
    entryId: int("entryId").references((): AnyMySqlColumn => Entries.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
    deletionDate: datetime("deletionDate", { mode: "date" }),
  },
  (t) => [index("entryId").on(t.entryId)]
);

export const Tags = mysqlTable("Tags", {
  slug: varchar("slug", { length: 512 }).primaryKey(),
  name: varchar("name", { length: 1024 }),
  color: varchar("color", { length: 16 }),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const SongOfEntries = mysqlTable(
  "SongOfEntries",
  {
    id: int("id").primaryKey().autoincrement(),
    songId: int("songId").references((): AnyMySqlColumn => Songs.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    entryId: int("entryId").references((): AnyMySqlColumn => Entries.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("SongOfEntries_songId_entryId_unique").on(t.songId, t.entryId),
    index("entryId").on(t.entryId),
  ]
);

export const TagOfEntries = mysqlTable(
  "TagOfEntries",
  {
    id: int("id").primaryKey().autoincrement(),
    tagId: varchar("tagId", { length: 512 }).references((): AnyMySqlColumn => Tags.slug, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    entryId: int("entryId").references((): AnyMySqlColumn => Entries.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("TagOfEntries_tagId_entryId_unique").on(t.tagId, t.entryId),
    index("entryId").on(t.entryId),
  ]
);

// --- Jukebox playlists ---------------------------------------------------

export const Playlists = mysqlTable("Playlists", {
  slug: varchar("slug", { length: 512 }).primaryKey(),
  name: varchar("name", { length: 1024 }),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const FileInPlaylists = mysqlTable(
  "FileInPlaylists",
  {
    id: int("id").primaryKey().autoincrement(),
    fileId: int("fileId").references((): AnyMySqlColumn => MusicFiles.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    playlistId: varchar("playlistId", { length: 512 }).references(
      (): AnyMySqlColumn => Playlists.slug,
      { onDelete: "cascade", onUpdate: "cascade" }
    ),
    sortOrder: int("sortOrder").notNull().default(0),
    creationDate: datetime("creationDate", { mode: "date" }).notNull(),
    updatedOn: datetime("updatedOn", { mode: "date" }).notNull(),
  },
  (t) => [
    uniqueIndex("FileInPlaylists_playlistId_fileId_unique").on(
      t.fileId,
      t.playlistId
    ),
    index("playlistId").on(t.playlistId),
  ]
);

// --- Misc ----------------------------------------------------------------

export const SiteMeta = mysqlTable("SiteMeta", {
  key: varchar("key", { length: 768 }).primaryKey(),
  value: text("value"),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const FuriganaMappings = mysqlTable(
  "FuriganaMappings",
  {
    text: varchar("text", { length: 128 }).notNull(),
    furigana: varchar("furigana", { length: 128 }).notNull(),
    segmentedText: varchar("segmentedText", { length: 128 }),
    segmentedFurigana: varchar("segmentedFurigana", { length: 128 }),
  },
  (t) => [primaryKey({ columns: [t.text, t.furigana] })]
);
