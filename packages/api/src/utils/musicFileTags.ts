import path from "path";
import hasha from "hasha";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { MusicFiles, FileInPlaylists } from "../drizzle/schema";
import { MUSIC_FILES_PATH } from "./secret";
import { writeAsync as ffMetadataWrite } from "./ffmetadata";

const PLAYLIST_IDS_TAG = "LyricovaPlaylistIDs";

/**
 * Drizzle port of the Sequelize `MusicFile.updatePlaylistsOfFileAsTags` instance
 * method: write the file's current playlist slugs as an ID3 tag, then refresh the
 * stored MD5 hash. Filesystem I/O (tag write + hashing) is unchanged; the playlist
 * lookup and hash persistence go through the Drizzle client.
 */
export async function updatePlaylistsOfFileAsTags(
  fileId: number
): Promise<void> {
  const file = await db.query.MusicFiles.findFirst({
    where: eq(MusicFiles.id, fileId),
  });
  if (!file) return;
  const fullPath = path.resolve(MUSIC_FILES_PATH, file.path);
  const rows = await db.query.FileInPlaylists.findMany({
    where: eq(FileInPlaylists.fileId, fileId),
    with: { playlist: true },
  });
  const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
  await ffMetadataWrite(
    fullPath,
    { [PLAYLIST_IDS_TAG]: rows.map((r) => r.playlist.slug).join(",") },
    { preserveStreams: true, forceId3v2 }
  );
  const md5 = await hasha.fromFile(fullPath, { algorithm: "md5" });
  await db.update(MusicFiles).set({ hash: md5 }).where(eq(MusicFiles.id, fileId));
}
