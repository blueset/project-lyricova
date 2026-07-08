import { builder } from "../builder";
import type {
  FuriganaMappings,
  ArtistOfSongs,
  ArtistOfAlbums,
  SongInAlbums,
  FileInPlaylists,
} from "../../../drizzle/schema";

/**
 * Central object references for every model-backed GraphQL type.
 *
 * The interconnected **music entity cluster**
 * (Song/Album/Artist/MusicFile/VideoFile/Playlist) is backed by
 * `builder.drizzleObject(table, { name })`, which creates + names the GraphQL type
 * here and returns the cached `DrizzleObjectRef`; their fields are attached in the
 * type modules via `builder.drizzleObjectFields(ref, ...)`. `t.relation` fields are
 * auto-dataloaded by the plugin (parents resolve by primary key).
 *
 * Junction leaf types (ArtistOfSong/ArtistOfAlbum/SongInAlbum/FileInPlaylist) are
 * plain `objectRef` typed to their Drizzle row shape (they expose only scalars +
 * SIMPLE_ENUM_ARRAY columns; populated as reflected fields off mapped M2M results).
 *
 * Blog types (Entry/Verse/Pulse/Tag/User/...) are plain `objectRef`s backed by
 * explicit Drizzle queries.
 */

// --- Music entity cluster (Drizzle-backed) ---
export const AlbumRef = builder.drizzleObject("Albums", { name: "Album" });
export const ArtistRef = builder.drizzleObject("Artists", { name: "Artist" });
export const SongRef = builder.drizzleObject("Songs", { name: "Song" });
export const MusicFileRef = builder.drizzleObject("MusicFiles", {
  name: "MusicFile",
  description: "A music file in the jukebox.",
});
builder.drizzleObject("VideoFiles", {
  name: "VideoFile",
});
export const PlaylistRef = builder.drizzleObject("Playlists", {
  name: "Playlist",
  description: "A playlist of music files.",
});

// --- Junction leaf types (Drizzle row shape) ---
export const ArtistOfAlbumRef =
  builder.objectRef<typeof ArtistOfAlbums.$inferSelect>("ArtistOfAlbum");
export const ArtistOfSongRef =
  builder.objectRef<typeof ArtistOfSongs.$inferSelect>("ArtistOfSong");
export const SongInAlbumRef =
  builder.objectRef<typeof SongInAlbums.$inferSelect>("SongInAlbum");
export const FileInPlaylistRef =
  builder.objectRef<typeof FileInPlaylists.$inferSelect>("FileInPlaylist");

// --- Blog entity cluster (Drizzle-backed) ---
export const EntryRef = builder.drizzleObject("Entries", {
  name: "Entry",
  description: "A Lyricova entry.",
});
builder.drizzleObject("Pulses", { name: "Pulse" });
export const TagRef = builder.drizzleObject("Tags", { name: "Tag" });
builder.drizzleObject("Verses", { name: "Verse" });
export const UserRef = builder.drizzleObject("Users", { name: "User" });
export const UserPublicKeyCredentialRef = builder.drizzleObject(
  "UserPublicKeyCredentials",
  { name: "UserPublicKeyCredential" },
);

// --- Misc (Sequelize/Drizzle-row backed) ---
export const FuriganaMappingRef =
  builder.objectRef<typeof FuriganaMappings.$inferSelect>("FuriganaMapping");
