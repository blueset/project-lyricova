import { Song } from "../models/Song";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";
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

/**
 * Insert-or-update import logic for songs/artists/albums from VocaDB and
 * UtaiteDB. Extracted from the GraphQL resolver so it is shared between the
 * TypeGraphQL `VocaDBImportResolver` and the Pothos `enrol*` mutations during
 * the migration. The actual persistence lives in the model static methods
 * (`saveFromVocaDBEntity` / `saveFromUtaiteDBEntity`).
 */

export async function enrolSongFromVocaDB(songId: number): Promise<Song> {
  const song = await getSong(songId);
  const originalSong = await getOriginalSong(song);
  let originalSongEntity: Song | null = null;
  if (originalSong !== null) {
    originalSongEntity = await Song.saveFromVocaDBEntity(originalSong, null);
  }
  return await Song.saveFromVocaDBEntity(song, originalSongEntity);
}

export async function enrolArtistFromVocaDB(artistId: number): Promise<Artist> {
  const artist = await getArtist(artistId);
  const baseVoicebank = await getBaseVoiceBank(artist);
  let baseVoicebankEntity: Artist | null = null;
  if (baseVoicebank !== null) {
    baseVoicebankEntity = await Artist.saveFromVocaDBEntity(baseVoicebank, null);
  }
  return await Artist.saveFromVocaDBEntity(artist, baseVoicebankEntity);
}

export async function enrolAlbumFromVocaDB(albumId: number): Promise<Album> {
  const album = await getAlbum(albumId);
  return await Album.saveFromVocaDBEntity(album);
}

export async function enrolSongFromUtaiteDB(songId: number): Promise<Song> {
  const song = await getUtaiteDbSong(songId);

  const vocaDbId = getVocaDbId(song);
  if (vocaDbId !== undefined) {
    const vocaSong = await enrolSongFromVocaDB(vocaDbId);
    await Song.update({ utaiteDbId: songId }, { where: { id: vocaSong.id } });
    vocaSong.utaiteDbId = songId;
    return vocaSong;
  }

  const originalSong = await getUtaiteDbOriginalSong(song);
  let originalSongEntity: Song | null = null;
  if (originalSong !== null) {
    const originalSongVocaDbId = getVocaDbId(originalSong);
    if (originalSongVocaDbId !== undefined) {
      originalSongEntity = await enrolSongFromVocaDB(originalSongVocaDbId);
      await Song.update(
        { utaiteDbId: originalSong.id },
        { where: { id: originalSongEntity.id } }
      );
    } else {
      originalSongEntity = await Song.saveFromUtaiteDBEntity(originalSong, null);
    }
  }
  return await Song.saveFromUtaiteDBEntity(song, originalSongEntity);
}

export async function enrolArtistFromUtaiteDB(
  artistId: number
): Promise<Artist> {
  const artist = await getUtaiteDbArtist(artistId);

  const vocaDbId = getVocaDbId(artist);
  if (vocaDbId !== undefined) {
    const vocaArtist = await enrolArtistFromVocaDB(vocaDbId);
    await Artist.update(
      { utaiteDbId: artistId },
      { where: { id: vocaArtist.id } }
    );
    vocaArtist.utaiteDbId = artistId;
    return vocaArtist;
  }

  const baseVoicebank = await getUtaiteDbBaseVoiceBank(artist);
  let baseVoicebankEntity: Artist | null = null;
  if (baseVoicebank !== null) {
    const baseVoicebankId = getVocaDbId(baseVoicebank);
    if (baseVoicebankId !== undefined) {
      baseVoicebankEntity = await enrolArtistFromVocaDB(baseVoicebankId);
      await Artist.update(
        { utaiteDbId: baseVoicebank.id },
        { where: { id: baseVoicebankEntity.id } }
      );
    } else {
      baseVoicebankEntity = await Artist.saveFromUtaiteDBEntity(
        baseVoicebank,
        null
      );
    }
  }
  return await Artist.saveFromUtaiteDBEntity(artist, baseVoicebankEntity);
}

export async function enrolAlbumFromUtaiteDB(albumId: number): Promise<Album> {
  const album = await getUtaiteDbAlbum(albumId);

  const vocaDbId = getVocaDbId(album);
  if (vocaDbId !== undefined) {
    const vocaAlbum = await enrolAlbumFromVocaDB(vocaDbId);
    await Album.update(
      { utaiteDbId: albumId },
      { where: { id: vocaAlbum.id } }
    );
    vocaAlbum.utaiteDbId = albumId;
    return vocaAlbum;
  }

  const tracks = (
    await Promise.all(
      album.tracks
        ?.filter((track) => !!track?.song?.id)
        ?.map((track) => enrolSongFromUtaiteDB(track.song.id)) ?? []
    )
  ).filter((t): t is Song => !!t);

  return await Album.saveFromUtaiteDBEntity(album, tracks);
}
