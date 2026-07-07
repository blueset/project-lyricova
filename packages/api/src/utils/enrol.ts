import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { Songs, Artists, Albums } from "../drizzle/schema";
import {
  getAlbum,
  getArtist,
  getOriginalSong,
  getSong,
  getUtaiteDbAlbum,
  getUtaiteDbArtist,
  getUtaiteDbSong,
  getVocaDbId,
  getBaseVoiceBank,
  getUtaiteDbBaseVoiceBank,
  getUtaiteDbOriginalSong,
} from "./vocadb";
import {
  saveSongFromVocaDB,
  saveSongFromUtaiteDB,
  saveArtistFromVocaDB,
  saveArtistFromUtaiteDB,
  saveAlbumFromVocaDB,
  saveAlbumFromUtaiteDB,
} from "./vocadbImport";

type SongRow = typeof Songs.$inferSelect;
type ArtistRow = typeof Artists.$inferSelect;
type AlbumRow = typeof Albums.$inferSelect;

/**
 * Insert-or-update import logic for songs/artists/albums from VocaDB and
 * UtaiteDB. Shared between the Pothos `enrol*` mutations and the REST
 * VocaDBImportController. Persistence lives in utils/vocadbImport.ts (Drizzle).
 */

export async function enrolSongFromVocaDB(songId: number): Promise<SongRow> {
  const song = await getSong(songId);
  const originalSong = await getOriginalSong(song);
  let originalSongEntity: SongRow | null = null;
  if (originalSong !== null) {
    originalSongEntity = await saveSongFromVocaDB(originalSong, null);
  }
  return (await saveSongFromVocaDB(song, originalSongEntity)) as SongRow;
}

export async function enrolArtistFromVocaDB(
  artistId: number,
): Promise<ArtistRow> {
  const artist = await getArtist(artistId);
  const baseVoicebank = await getBaseVoiceBank(artist);
  let baseVoicebankEntity: ArtistRow | null = null;
  if (baseVoicebank !== null) {
    baseVoicebankEntity = await saveArtistFromVocaDB(baseVoicebank, null);
  }
  return (await saveArtistFromVocaDB(artist, baseVoicebankEntity)) as ArtistRow;
}

export async function enrolAlbumFromVocaDB(albumId: number): Promise<AlbumRow> {
  const album = await getAlbum(albumId);
  return (await saveAlbumFromVocaDB(album)) as AlbumRow;
}

export async function enrolSongFromUtaiteDB(songId: number): Promise<SongRow> {
  const song = await getUtaiteDbSong(songId);

  const vocaDbId = getVocaDbId(song);
  if (vocaDbId !== undefined) {
    const vocaSong = await enrolSongFromVocaDB(vocaDbId);
    await db
      .update(Songs)
      .set({ utaiteDbId: songId })
      .where(eq(Songs.id, vocaSong.id));
    vocaSong.utaiteDbId = songId;
    return vocaSong;
  }

  const originalSong = await getUtaiteDbOriginalSong(song);
  let originalSongEntity: SongRow | null = null;
  if (originalSong !== null) {
    const originalSongVocaDbId = getVocaDbId(originalSong);
    if (originalSongVocaDbId !== undefined) {
      originalSongEntity = await enrolSongFromVocaDB(originalSongVocaDbId);
      await db
        .update(Songs)
        .set({ utaiteDbId: originalSong.id })
        .where(eq(Songs.id, originalSongEntity.id));
    } else {
      originalSongEntity = await saveSongFromUtaiteDB(originalSong, null);
    }
  }
  return (await saveSongFromUtaiteDB(song, originalSongEntity)) as SongRow;
}

export async function enrolArtistFromUtaiteDB(
  artistId: number,
): Promise<ArtistRow> {
  const artist = await getUtaiteDbArtist(artistId);

  const vocaDbId = getVocaDbId(artist);
  if (vocaDbId !== undefined) {
    const vocaArtist = await enrolArtistFromVocaDB(vocaDbId);
    await db
      .update(Artists)
      .set({ utaiteDbId: artistId })
      .where(eq(Artists.id, vocaArtist.id));
    vocaArtist.utaiteDbId = artistId;
    return vocaArtist;
  }

  const baseVoicebank = await getUtaiteDbBaseVoiceBank(artist);
  let baseVoicebankEntity: ArtistRow | null = null;
  if (baseVoicebank !== null) {
    const baseVoicebankId = getVocaDbId(baseVoicebank);
    if (baseVoicebankId !== undefined) {
      baseVoicebankEntity = await enrolArtistFromVocaDB(baseVoicebankId);
      await db
        .update(Artists)
        .set({ utaiteDbId: baseVoicebank.id })
        .where(eq(Artists.id, baseVoicebankEntity.id));
    } else {
      baseVoicebankEntity = await saveArtistFromUtaiteDB(baseVoicebank, null);
    }
  }
  return (await saveArtistFromUtaiteDB(
    artist,
    baseVoicebankEntity,
  )) as ArtistRow;
}

export async function enrolAlbumFromUtaiteDB(
  albumId: number,
): Promise<AlbumRow> {
  const album = await getUtaiteDbAlbum(albumId);

  const vocaDbId = getVocaDbId(album);
  if (vocaDbId !== undefined) {
    const vocaAlbum = await enrolAlbumFromVocaDB(vocaDbId);
    await db
      .update(Albums)
      .set({ utaiteDbId: albumId })
      .where(eq(Albums.id, vocaAlbum.id));
    vocaAlbum.utaiteDbId = albumId;
    return vocaAlbum;
  }

  const tracks = (
    await Promise.all(
      album.tracks
        ?.filter((track) => !!track?.song?.id)
        ?.map((track) => enrolSongFromUtaiteDB(track.song.id)) ?? [],
    )
  ).filter((t): t is SongRow => !!t);

  return (await saveAlbumFromUtaiteDB(album, tracks)) as AlbumRow;
}
