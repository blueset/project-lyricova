import { relations } from "drizzle-orm";
import {
  Albums,
  Artists,
  Songs,
  MusicFiles,
  VideoFiles,
  ArtistOfAlbums,
  ArtistOfSongs,
  SongInAlbums,
  Users,
  UserPublicKeyCredentials,
  Entries,
  Pulses,
  Verses,
  Tags,
  SongOfEntries,
  TagOfEntries,
  Playlists,
  FileInPlaylists,
} from "./schema.js";

/**
 * Drizzle `relations()` mirroring the Sequelize associations. Many-to-many links
 * are expressed through their junction tables (Drizzle has no implicit M2M).
 * `relationName` disambiguates self-references (Song.original/derivedSongs,
 * Artist.baseVoiceBank) and the two FK paths in junctions.
 */

export const albumsRelations = relations(Albums, ({ many }) => ({
  files: many(MusicFiles),
  songInAlbums: many(SongInAlbums),
  artistOfAlbums: many(ArtistOfAlbums),
}));

export const artistsRelations = relations(Artists, ({ one, many }) => ({
  baseVoiceBank: one(Artists, {
    fields: [Artists.baseVoiceBankId],
    references: [Artists.id],
    relationName: "ArtistBaseVoiceBank",
  }),
  derivedVoiceBanks: many(Artists, { relationName: "ArtistBaseVoiceBank" }),
  artistOfSongs: many(ArtistOfSongs),
  artistOfAlbums: many(ArtistOfAlbums),
}));

export const songsRelations = relations(Songs, ({ one, many }) => ({
  original: one(Songs, {
    fields: [Songs.originalId],
    references: [Songs.id],
    relationName: "SongDerivation",
  }),
  derivedSongs: many(Songs, { relationName: "SongDerivation" }),
  files: many(MusicFiles),
  videos: many(VideoFiles),
  songInAlbums: many(SongInAlbums),
  artistOfSongs: many(ArtistOfSongs),
  songOfEntries: many(SongOfEntries),
}));

export const musicFilesRelations = relations(MusicFiles, ({ one, many }) => ({
  song: one(Songs, {
    fields: [MusicFiles.songId],
    references: [Songs.id],
  }),
  album: one(Albums, {
    fields: [MusicFiles.albumId],
    references: [Albums.id],
  }),
  fileInPlaylists: many(FileInPlaylists),
}));

export const videoFilesRelations = relations(VideoFiles, ({ one }) => ({
  song: one(Songs, {
    fields: [VideoFiles.songId],
    references: [Songs.id],
  }),
}));

export const artistOfAlbumsRelations = relations(ArtistOfAlbums, ({ one }) => ({
  album: one(Albums, {
    fields: [ArtistOfAlbums.albumId],
    references: [Albums.id],
  }),
  artist: one(Artists, {
    fields: [ArtistOfAlbums.artistId],
    references: [Artists.id],
  }),
}));

export const artistOfSongsRelations = relations(ArtistOfSongs, ({ one }) => ({
  song: one(Songs, {
    fields: [ArtistOfSongs.songId],
    references: [Songs.id],
  }),
  artist: one(Artists, {
    fields: [ArtistOfSongs.artistId],
    references: [Artists.id],
  }),
}));

export const songInAlbumsRelations = relations(SongInAlbums, ({ one }) => ({
  song: one(Songs, {
    fields: [SongInAlbums.songId],
    references: [Songs.id],
  }),
  album: one(Albums, {
    fields: [SongInAlbums.albumId],
    references: [Albums.id],
  }),
}));

export const usersRelations = relations(Users, ({ many }) => ({
  entries: many(Entries),
  credentials: many(UserPublicKeyCredentials),
}));

export const userPublicKeyCredentialsRelations = relations(
  UserPublicKeyCredentials,
  ({ one }) => ({
    user: one(Users, {
      fields: [UserPublicKeyCredentials.userId],
      references: [Users.id],
    }),
  }),
);

export const entriesRelations = relations(Entries, ({ one, many }) => ({
  author: one(Users, {
    fields: [Entries.authorId],
    references: [Users.id],
  }),
  verses: many(Verses),
  pulses: many(Pulses),
  songOfEntries: many(SongOfEntries),
  tagOfEntries: many(TagOfEntries),
}));

export const pulsesRelations = relations(Pulses, ({ one }) => ({
  entry: one(Entries, {
    fields: [Pulses.entryId],
    references: [Entries.id],
  }),
}));

export const versesRelations = relations(Verses, ({ one }) => ({
  entry: one(Entries, {
    fields: [Verses.entryId],
    references: [Entries.id],
  }),
}));

export const tagsRelations = relations(Tags, ({ many }) => ({
  tagOfEntries: many(TagOfEntries),
}));

export const songOfEntriesRelations = relations(SongOfEntries, ({ one }) => ({
  song: one(Songs, {
    fields: [SongOfEntries.songId],
    references: [Songs.id],
  }),
  entry: one(Entries, {
    fields: [SongOfEntries.entryId],
    references: [Entries.id],
  }),
}));

export const tagOfEntriesRelations = relations(TagOfEntries, ({ one }) => ({
  tag: one(Tags, {
    fields: [TagOfEntries.tagId],
    references: [Tags.slug],
  }),
  entry: one(Entries, {
    fields: [TagOfEntries.entryId],
    references: [Entries.id],
  }),
}));

export const playlistsRelations = relations(Playlists, ({ many }) => ({
  fileInPlaylists: many(FileInPlaylists),
}));

export const fileInPlaylistsRelations = relations(
  FileInPlaylists,
  ({ one }) => ({
    file: one(MusicFiles, {
      fields: [FileInPlaylists.fileId],
      references: [MusicFiles.id],
    }),
    playlist: one(Playlists, {
      fields: [FileInPlaylists.playlistId],
      references: [Playlists.slug],
    }),
  }),
);
