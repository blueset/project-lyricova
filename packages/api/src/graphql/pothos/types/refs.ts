import { builder } from "../builder";
import type { Album } from "../../../models/Album";
import type { Artist } from "../../../models/Artist";
import type { ArtistOfAlbum } from "../../../models/ArtistOfAlbum";
import type { ArtistOfSong } from "../../../models/ArtistOfSong";
import type { Entry } from "../../../models/Entry";
import type { FileInPlaylist } from "../../../models/FileInPlaylist";
import type { FuriganaMappings } from "../../../drizzle/schema";
import type { MusicFile } from "../../../models/MusicFile";
import type { Playlist } from "../../../models/Playlist";
import type { Pulse } from "../../../models/Pulse";
import type { Song } from "../../../models/Song";
import type { SongInAlbum } from "../../../models/SongInAlbum";
import type { Tag } from "../../../models/Tag";
import type { User } from "../../../models/User";
import type { UserPublicKeyCredential } from "../../../models/UserPublicKeyCredential";
import type { Verse } from "../../../models/Verse";
import type { VideoFile } from "../../../models/VideoFile";

/**
 * Central object references for every model-backed GraphQL type, typed by the
 * Sequelize model instance. Declared here (with type-only model imports, so no
 * TypeGraphQL decorators run) so domains can cross-reference each other's types
 * regardless of implementation order. Each domain module calls `.implement()`
 * on its ref(s).
 */
export const AlbumRef = builder.objectRef<Album>("Album");
export const ArtistRef = builder.objectRef<Artist>("Artist");
export const ArtistOfAlbumRef = builder.objectRef<ArtistOfAlbum>("ArtistOfAlbum");
export const ArtistOfSongRef = builder.objectRef<ArtistOfSong>("ArtistOfSong");
export const EntryRef = builder.objectRef<Entry>("Entry");
export const FileInPlaylistRef = builder.objectRef<FileInPlaylist>("FileInPlaylist");
export const FuriganaMappingRef = builder.objectRef<typeof FuriganaMappings.$inferSelect>("FuriganaMapping");
export const MusicFileRef = builder.objectRef<MusicFile>("MusicFile");
export const PlaylistRef = builder.objectRef<Playlist>("Playlist");
export const PulseRef = builder.objectRef<Pulse>("Pulse");
export const SongRef = builder.objectRef<Song>("Song");
export const SongInAlbumRef = builder.objectRef<SongInAlbum>("SongInAlbum");
export const TagRef = builder.objectRef<Tag>("Tag");
export const UserRef = builder.objectRef<User>("User");
export const UserPublicKeyCredentialRef =
  builder.objectRef<UserPublicKeyCredential>("UserPublicKeyCredential");
export const VerseRef = builder.objectRef<Verse>("Verse");
export const VideoFileRef = builder.objectRef<VideoFile>("VideoFile");
