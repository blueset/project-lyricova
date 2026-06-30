import { builder } from "../builder";
import {
  MusicFileRef,
  AlbumRef,
  SongRef,
  PlaylistRef,
  FileInPlaylistRef,
} from "./refs";

// NOTE: the `lyrics: LyricsKitLyrics` and `lyricsText(ext): String` fields are
// added with the LyricsKit domain (they depend on LyricsKitLyrics + file I/O).
MusicFileRef.implement({
  fields: (t) => ({
    FileInPlaylist: t.field({
      type: FileInPlaylistRef,
      nullable: true,
      resolve: (m) => m.FileInPlaylist as any,
    }),
    album: t.field({
      type: AlbumRef,
      nullable: true,
      resolve: (m) => m.$get("album"),
    }),
    albumId: t.exposeInt("albumId", {
      nullable: true,
      description: "ID of corresponding album in database.",
    }),
    albumName: t.exposeString("albumName", {
      nullable: true,
      description: "Album of the track stored in file.",
    }),
    albumSortOrder: t.exposeString("albumSortOrder", {
      nullable: true,
      description: "Sort order key of album of the track stored in file.",
    }),
    artistName: t.exposeString("artistName", {
      nullable: true,
      description: "Artist of the track stored in file.",
    }),
    artistSortOrder: t.exposeString("artistSortOrder", {
      nullable: true,
      description: "Sort order key of artist of the track stored in file.",
    }),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (m) => m.creationDate,
    }),
    duration: t.exposeFloat("duration", {
      description: "Duration of the song in seconds.",
    }),
    fileSize: t.exposeInt("fileSize", {
      description: "Size of file in bytes.",
    }),
    hasCover: t.exposeBoolean("hasCover", {
      description: "If the file has an embedded cover art.",
    }),
    hasLyrics: t.exposeBoolean("hasLyrics", {
      description: "If the file is accompanied with a lyrics file.",
    }),
    hash: t.exposeString("hash", { description: "MD5 of the file." }),
    id: t.exposeInt("id", { description: "File ID in database." }),
    lastPlayed: t.field({
      type: "Timestamp",
      nullable: true,
      description: "Date when the file was last played.",
      resolve: (m) => m.lastPlayed,
    }),
    needReview: t.exposeBoolean("needReview", {
      description: "If this entry needs review.",
    }),
    path: t.exposeString("path", { description: "Local path to the song." }),
    playCount: t.exposeInt("playCount", {
      description: "Number of times the file has been played.",
    }),
    playlists: t.field({
      type: [PlaylistRef],
      resolve: (m) => m.$get("playlists"),
    }),
    song: t.field({
      type: SongRef,
      nullable: true,
      resolve: (m) => m.$get("song"),
    }),
    songId: t.exposeInt("songId", {
      nullable: true,
      description: "ID of corresponding song in database.",
    }),
    trackName: t.exposeString("trackName", {
      nullable: true,
      description: "Name of the track stored in file.",
    }),
    trackSortOrder: t.exposeString("trackSortOrder", {
      nullable: true,
      description: "Sort order key of name of the track stored in file.",
    }),
    updatedOn: t.field({ type: "Timestamp", resolve: (m) => m.updatedOn }),
  }),
});
