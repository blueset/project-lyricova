import fs from "fs";
import { builder } from "../builder";
import { swapExt } from "../../../utils/path";
import { Lyrics } from "lyrics-kit/core";
import { LyricsKitLyrics } from "../../LyricsKitObjects";
import { LyricsKitLyricsRef } from "./lyricsKit";
import {
  MusicFileRef,
  AlbumRef,
  SongRef,
  PlaylistRef,
  FileInPlaylistRef,
} from "./refs";

MusicFileRef.implement({
  description: "A music file in the jukebox.",
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
    lyricsText: t.string({
      nullable: true,
      args: { ext: t.arg.string({ defaultValue: "lrc" }) },
      resolve: (m, { ext }) => {
        const lyricsPath = swapExt(m.fullPath, ext);
        try {
          return fs.readFileSync(lyricsPath).toString();
        } catch (e) {
          console.error("Error while reading lyrics file:", e);
          return null;
        }
      },
    }),
    lyrics: t.field({
      type: LyricsKitLyricsRef,
      nullable: true,
      resolve: (m) => {
        const filePath = m.fullPath;
        const lrcPath = swapExt(filePath, "lrc");
        const lrcxPath = swapExt(filePath, "lrcx");
        let path: string | null = null;
        let usedType: "lrc" | "lrcx";
        if (fs.existsSync(lrcxPath)) {
          path = lrcxPath;
          usedType = "lrcx";
        } else if (fs.existsSync(lrcPath)) {
          path = lrcPath;
          usedType = "lrc";
        } else {
          console.log("no file is found");
          return null;
        }
        try {
          const buffer = fs.readFileSync(path);
          let content = buffer.toString();

          if (usedType === "lrc") {
            content = content.replace(
              /^((?:\[[0-9:.-]+])+)(.+?) \/ (.+)$/gm,
              "$1$2\n$1[tr]$3"
            );
            content = content.replace(
              /^((?:\[[0-9:.-]+])+)(.+?)[\/／](.+)$/gm,
              "$1$2\n$1[tr]〝$3〟"
            );
          }

          const lrcs = new LyricsKitLyrics(new Lyrics(content));
          lrcs.lines = lrcs.lines.filter((l) => isFinite(l.position));
          return lrcs;
        } catch (e) {
          console.error("Error while reading lyrics file:", e);
          return null;
        }
      },
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
