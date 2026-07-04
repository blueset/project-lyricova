import fs from "fs";
import Path from "path";
import hasha from "hasha";
import ffprobe from "ffprobe-client";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { MusicFiles, FileInPlaylists } from "../drizzle/schema";
import { MUSIC_FILES_PATH } from "./secret";
import { writeAsync as ffMetadataWrite } from "./ffmetadata";

/**
 * Drizzle port of the filesystem/audio-coupled `MusicFile` model methods
 * (getSongMetadata / buildSongEntry / updateSongEntry / writeToFile / updateMD5).
 * Audio parsing (ffprobe), hashing (hasha) and ID3 writing (ffMetadataWrite) are
 * unchanged; all persistence goes through the Drizzle client.
 */

export const ID3_LYRICS_LANGUAGE = "eng";
const SONG_ID_TAG = "LyricovaSongID";
const ALBUM_ID_TAG = "LyricovaAlbumID";
const PLAYLIST_IDS_TAG = "LyricovaPlaylistIDs";

export interface GenericMetadata {
  trackName?: string;
  trackSortOrder?: string;
  artistName?: string;
  artistSortOrder?: string;
  albumName?: string;
  albumSortOrder?: string;
  hasCover: boolean;
  duration: number;
  fileSize?: number;
  songId?: string;
  albumId?: string;
  playlists: string[];
  lyrics?: string;
}

type MusicFileRow = typeof MusicFiles.$inferSelect;

export function fullPathOf(relPath: string): string {
  return Path.resolve(MUSIC_FILES_PATH!, relPath);
}

export async function getSongMetadata(
  fullPath: string
): Promise<GenericMetadata> {
  const metadata = await ffprobe(fullPath);
  const tags = metadata.format?.tags ?? {};
  const duration = parseFloat(metadata.format?.duration ?? "");
  let playlists: string[] = [];

  if (tags[PLAYLIST_IDS_TAG]) {
    playlists = tags[PLAYLIST_IDS_TAG].split(",");
  }

  const columns: GenericMetadata = {
    trackName: tags.title || tags.TITLE || undefined,
    trackSortOrder: tags["title-sort"] || tags.TITLESORT || undefined,
    artistName: tags.artist || tags.ARTIST || undefined,
    artistSortOrder: tags["artist-sort"] || tags.ARTISTSORT || undefined,
    albumName: tags.album || tags.ALBUM || undefined,
    albumSortOrder: tags["album-sort"] || tags.ALBUMSORT || undefined,
    hasCover: metadata.streams.some((val) => val.codec_type === "video"),
    duration: isNaN(duration) ? -1 : duration,
    fileSize: parseInt(metadata.format?.size ?? ""),
    playlists,
  };

  const songId = tags[SONG_ID_TAG] || undefined;
  if (songId !== undefined) columns.songId = songId;
  const albumId = tags[ALBUM_ID_TAG] || undefined;
  if (albumId !== undefined) columns.albumId = albumId;
  const lyrics =
    tags[`lyrics-${ID3_LYRICS_LANGUAGE}`] || tags.LYRICS || undefined;
  if (lyrics !== undefined) columns.lyrics = lyrics;

  return columns;
}

export interface BuiltSongEntry {
  values: Record<string, unknown>;
  playlistSlugs: string[];
}

/** Build the insert values for a new music file at `fullPath`. */
export async function buildSongEntry(
  fullPath: string
): Promise<BuiltSongEntry> {
  const md5Promise = hasha.fromFile(fullPath, { algorithm: "md5" });
  const metadataPromise = getSongMetadata(fullPath);
  const md5 = await md5Promise;
  const { songId, albumId, playlists, lyrics: _lyrics, ...metadata } =
    await metadataPromise;
  const lrcPath = fullPath.substr(0, fullPath.lastIndexOf(".")) + ".lrc";
  const hasLyrics = fs.existsSync(lrcPath);

  const values: Record<string, unknown> = {
    path: Path.relative(MUSIC_FILES_PATH!, fullPath),
    hasLyrics,
    hash: md5,
    needReview: true,
    ...metadata,
  };
  if (songId && parseInt(songId)) values.songId = parseInt(songId);
  // NOTE: preserves the original model behaviour (writes albumId into songId).
  if (albumId && parseInt(albumId)) values.songId = parseInt(albumId);

  return { values, playlistSlugs: playlists };
}

/** Replace the FileInPlaylist rows for a file with the given playlist slugs. */
export async function replaceFilePlaylists(
  fileId: number,
  slugs: string[]
): Promise<void> {
  await db.delete(FileInPlaylists).where(eq(FileInPlaylists.fileId, fileId));
  const now = new Date();
  let sortOrder = 0;
  for (const slug of [...new Set(slugs)]) {
    await db.insert(FileInPlaylists).values({
      fileId,
      playlistId: slug,
      sortOrder: sortOrder++,
      creationDate: now,
      updatedOn: now,
    });
  }
}

/**
 * Update an existing music file row from its file on disk. Returns true if the
 * row was updated, false if unchanged (mirrors the model's null return).
 */
export async function updateSongEntry(file: MusicFileRow): Promise<boolean> {
  try {
    if (file.path === null) return false;
    const fullPath = fullPathOf(file.path);
    const lrcPath = fullPath.substr(0, fullPath.lastIndexOf(".")) + ".lrc";
    const hasLyrics = fs.existsSync(lrcPath);
    let needUpdate = hasLyrics !== file.hasLyrics;
    const fileSize = fs.statSync(fullPath).size;
    const md5 = await hasha.fromFile(fullPath, { algorithm: "md5" });
    needUpdate = needUpdate || md5 !== file.hash;
    if (!needUpdate) return false;

    const { songId, albumId, playlists, lyrics: _lyrics, ...metadata } =
      await getSongMetadata(fullPath);
    const set: Record<string, unknown> = {
      path: Path.relative(MUSIC_FILES_PATH!, fullPath),
      hasLyrics,
      fileSize,
      hash: md5,
      needReview: true,
      updatedOn: new Date(),
      ...metadata,
    };
    if (songId !== undefined) set.songId = parseInt(songId);
    if (albumId !== undefined) set.albumId = parseInt(albumId);
    await db.update(MusicFiles).set(set).where(eq(MusicFiles.id, file.id));
    await replaceFilePlaylists(file.id, playlists);
    return true;
  } catch (e) {
    console.error("Error occurred while updating song entry", e);
    return false;
  }
}

/** Write partial metadata (ID3 tags) to the audio file. */
export async function writeMetadataToFile(
  file: Pick<MusicFileRow, "path">,
  data: Partial<MusicFileRow>
): Promise<void> {
  if (file.path === null) {
    throw new Error("Music file path is missing.");
  }
  let mapping: {
    trackSortOrder: string;
    artistSortOrder: string;
    albumSortOrder: string;
  };
  if (file.path.toLowerCase().endsWith(".flac")) {
    mapping = {
      trackSortOrder: "TITLESORT",
      artistSortOrder: "ARTISTSORT",
      albumSortOrder: "ALBUMSORT",
    };
  } else {
    mapping = {
      trackSortOrder: "title-sort",
      artistSortOrder: "artist-sort",
      albumSortOrder: "album-sort",
    };
  }
  const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
  await ffMetadataWrite(
    fullPathOf(file.path),
    {
      title: data.trackName ?? undefined,
      [mapping.trackSortOrder]: data.trackSortOrder ?? undefined,
      album: data.albumName ?? undefined,
      [mapping.albumSortOrder]: data.albumSortOrder ?? undefined,
      artist: data.artistName ?? undefined,
      [mapping.artistSortOrder]: data.artistSortOrder ?? undefined,
      [SONG_ID_TAG]: `${data.songId}`,
      [ALBUM_ID_TAG]: `${data.albumId}`,
    },
    { preserveStreams: true, forceId3v2 }
  );
}

/** Recompute + persist the file's MD5 hash. */
export async function updateMD5(
  fileId: number,
  relPath: string
): Promise<void> {
  const md5 = await hasha.fromFile(fullPathOf(relPath), { algorithm: "md5" });
  await db
    .update(MusicFiles)
    .set({ hash: md5, updatedOn: new Date() })
    .where(eq(MusicFiles.id, fileId));
}
