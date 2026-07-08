import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { builder } from "../builder.js";
import { swapExt } from "../../../utils/path.js";
import { MUSIC_FILES_PATH } from "../../../utils/secret.js";
import { Lyrics } from "lyrics-kit/core";
import { LyricsKitLyrics } from "../../LyricsKitObjects.js";
import { LyricsKitLyricsRef } from "./lyricsKit.js";
import { db } from "../../../drizzle/client.js";
import { FileInPlaylists } from "../../../drizzle/schema.js";
import { PlaylistRef, FileInPlaylistRef } from "./refs.js";

/** Replicates the Sequelize `MusicFile.fullPath` VIRTUAL (not a DB column). */
function fullPathOf(filePath: string): string {
  return path.resolve(MUSIC_FILES_PATH!, filePath);
}

// NOTE: the drizzle plugin's `t.expose*` helpers drop the `description` option,
// so described scalar columns use `t.field` with an explicit column resolver to
// preserve the schema descriptions (parity with schema.graphql).
builder.drizzleObjectFields("MusicFiles", (t) => ({
  id: t.field({
    type: "Int",
    description: "File ID in database.",
    resolve: (m: any) => m.id,
  }),
  path: t.field({
    type: "String",
    description: "Local path to the song.",
    resolve: (m: any) => m.path,
  }),
  fileSize: t.field({
    type: "Int",
    description: "Size of file in bytes.",
    resolve: (m: any) => m.fileSize,
  }),
  songId: t.field({
    type: "Int",
    nullable: true,
    description: "ID of corresponding song in database.",
    resolve: (m: any) => m.songId,
  }),
  albumId: t.field({
    type: "Int",
    nullable: true,
    description: "ID of corresponding album in database.",
    resolve: (m: any) => m.albumId,
  }),
  trackName: t.field({
    type: "String",
    nullable: true,
    description: "Name of the track stored in file.",
    resolve: (m: any) => m.trackName,
  }),
  trackSortOrder: t.field({
    type: "String",
    nullable: true,
    description: "Sort order key of name of the track stored in file.",
    resolve: (m: any) => m.trackSortOrder,
  }),
  albumName: t.field({
    type: "String",
    nullable: true,
    description: "Album of the track stored in file.",
    resolve: (m: any) => m.albumName,
  }),
  albumSortOrder: t.field({
    type: "String",
    nullable: true,
    description: "Sort order key of album of the track stored in file.",
    resolve: (m: any) => m.albumSortOrder,
  }),
  artistName: t.field({
    type: "String",
    nullable: true,
    description: "Artist of the track stored in file.",
    resolve: (m: any) => m.artistName,
  }),
  artistSortOrder: t.field({
    type: "String",
    nullable: true,
    description: "Sort order key of artist of the track stored in file.",
    resolve: (m: any) => m.artistSortOrder,
  }),
  hasLyrics: t.field({
    type: "Boolean",
    description: "If the file is accompanied with a lyrics file.",
    resolve: (m: any) => m.hasLyrics,
  }),
  hasCover: t.field({
    type: "Boolean",
    description: "If the file has an embedded cover art.",
    resolve: (m: any) => m.hasCover,
  }),
  needReview: t.field({
    type: "Boolean",
    description: "If this entry needs review.",
    resolve: (m: any) => m.needReview,
  }),
  duration: t.field({
    type: "Float",
    description: "Duration of the song in seconds.",
    resolve: (m: any) => m.duration,
  }),
  hash: t.field({
    type: "String",
    description: "MD5 of the file.",
    resolve: (m: any) => m.hash,
  }),
  playCount: t.field({
    type: "Int",
    description: "Number of times the file has been played.",
    resolve: (m: any) => m.playCount,
  }),
  lastPlayed: t.field({
    type: "Timestamp",
    nullable: true,
    description: "Date when the file was last played.",
    resolve: (m: any) => m.lastPlayed,
  }),
  creationDate: t.field({
    type: "Timestamp",
    resolve: (m: any) => m.creationDate,
  }),
  updatedOn: t.field({ type: "Timestamp", resolve: (m: any) => m.updatedOn }),
  song: t.relation("song", { nullable: true }),
  album: t.relation("album", { nullable: true }),
  playlists: t.field({
    type: [PlaylistRef],
    resolve: async (m: any) => {
      const rows = await db.query.FileInPlaylists.findMany({
        where: eq(FileInPlaylists.fileId, m.id),
        with: { playlist: true },
      });
      return rows.map((r) => r.playlist!);
    },
  }),
  FileInPlaylist: t.field({
    type: FileInPlaylistRef,
    nullable: true,
    resolve: (m: any) => m.FileInPlaylist ?? null,
  }),
  lyricsText: t.string({
    nullable: true,
    args: { ext: t.arg.string({ defaultValue: "lrc" }) },
    resolve: (m: any, { ext }) => {
      const lyricsPath = swapExt(fullPathOf(m.path), ext);
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
    resolve: (m: any) => {
      const filePath = fullPathOf(m.path);
      const lrcPath = swapExt(filePath, "lrc");
      const lrcxPath = swapExt(filePath, "lrcx");
      let lyricsFile: string | null = null;
      let usedType: "lrc" | "lrcx";
      if (fs.existsSync(lrcxPath)) {
        lyricsFile = lrcxPath;
        usedType = "lrcx";
      } else if (fs.existsSync(lrcPath)) {
        lyricsFile = lrcPath;
        usedType = "lrc";
      } else {
        console.log("no file is found");
        return null;
      }
      try {
        const buffer = fs.readFileSync(lyricsFile);
        let content = buffer.toString();

        if (usedType === "lrc") {
          content = content.replace(
            /^((?:\[[0-9:.-]+])+)(.+?) \/ (.+)$/gm,
            "$1$2\n$1[tr]$3",
          );
          content = content.replace(
            /^((?:\[[0-9:.-]+])+)(.+?)[\/／](.+)$/gm,
            "$1$2\n$1[tr]〝$3〟",
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
}));
