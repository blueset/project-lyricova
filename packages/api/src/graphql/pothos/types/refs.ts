import { builder } from "../builder";
import type { Entry } from "../../../models/Entry";
import type { Pulse } from "../../../models/Pulse";
import type { Tag } from "../../../models/Tag";
import type { User } from "../../../models/User";
import type { UserPublicKeyCredential } from "../../../models/UserPublicKeyCredential";
import type { Verse } from "../../../models/Verse";
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
 * Phase 4 migrates the data layer to Drizzle. The interconnected **music entity
 * cluster** (Song/Album/Artist/MusicFile/VideoFile/Playlist) is backed by
 * `builder.drizzleObject(table, { name })`, which creates + names the GraphQL type
 * here and returns the cached `DrizzleObjectRef`; their fields are attached in the
 * type modules via `builder.drizzleObjectFields(ref, ...)`. `t.relation` fields are
 * auto-dataloaded by the plugin (parents resolve by primary key even when fed from
 * a non-Drizzle source, so the cluster interoperates during the strangler).
 *
 * Junction leaf types (ArtistOfSong/ArtistOfAlbum/SongInAlbum/FileInPlaylist) are
 * plain `objectRef` typed to their Drizzle row shape (they expose only scalars +
 * SIMPLE_ENUM_ARRAY columns; populated as reflected fields off mapped M2M results).
 *
 * Blog types (Entry/Verse/Pulse/Tag/User/...) remain Sequelize-backed objectRefs
 * until their own migration commit.
 */

// --- Music entity cluster (Drizzle-backed) ---
export const AlbumRef = builder.drizzleObject("Albums", { name: "Album" });
export const ArtistRef = builder.drizzleObject("Artists", { name: "Artist" });
export const SongRef = builder.drizzleObject("Songs", { name: "Song" });
export const MusicFileRef = builder.drizzleObject("MusicFiles", {
  name: "MusicFile",
  description: "A music file in the jukebox.",
});
export const VideoFileRef = builder.drizzleObject("VideoFiles", {
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

// --- Blog cluster + misc (Sequelize-backed for now) ---
export const EntryRef = builder.objectRef<Entry>("Entry");
export const FuriganaMappingRef =
  builder.objectRef<typeof FuriganaMappings.$inferSelect>("FuriganaMapping");
export const PulseRef = builder.objectRef<Pulse>("Pulse");
export const TagRef = builder.objectRef<Tag>("Tag");
export const UserRef = builder.objectRef<User>("User");
export const UserPublicKeyCredentialRef =
  builder.objectRef<UserPublicKeyCredential>("UserPublicKeyCredential");
export const VerseRef = builder.objectRef<Verse>("Verse");
