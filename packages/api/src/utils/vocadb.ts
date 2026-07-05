import { getJson } from "./httpFetch";
import {
  SongForApiContract,
  ArtistForApiContract,
  AlbumForApiContract,
} from "../types/vocadb";

export async function getSong(
  songId: string | number,
): Promise<SongForApiContract> {
  try {
    const song = await getJson<SongForApiContract>(
      `https://vocadb.net/api/songs/${songId}`,
      {
        fields:
          "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
      },
    );
    return song;
  } catch (error) {
    console.error(`Error fetching song with ID ${songId}:`, error);
    throw error;
  }
}

export async function getArtist(
  artistId: string | number,
): Promise<ArtistForApiContract> {
  try {
    const artist = await getJson<ArtistForApiContract>(
      `https://vocadb.net/api/artists/${artistId}`,
      {
        fields:
          "AdditionalNames,ArtistLinks,ArtistLinksReverse,BaseVoicebank,Description,MainPicture,Names,Tags,WebLinks",
      },
    );
    return artist;
  } catch (error) {
    console.error(`Error fetching artist with ID ${artistId}:`, error);
    throw error;
  }
}

export async function getAlbum(
  albumId: string | number,
): Promise<AlbumForApiContract> {
  try {
    const album = await getJson<AlbumForApiContract>(
      `https://vocadb.net/api/albums/${albumId}`,
      {
        fields:
          "AdditionalNames,Artists,Description,Discs,Identifiers,MainPicture,Names,PVs,ReleaseEvent,Tags,Tracks,WebLinks",
        songFields:
          "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags,WebLinks",
      },
    );
    return album;
  } catch (error) {
    console.error(`Error fetching album with ID ${albumId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbSong(
  songId: string | number,
): Promise<SongForApiContract> {
  try {
    const song = await getJson<SongForApiContract>(
      `https://utaitedb.net/api/songs/${songId}`,
      {
        fields:
          "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags,WebLinks",
      },
    );
    return song;
  } catch (error) {
    console.error(`Error fetching UtaiteDB song with ID ${songId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbArtist(
  artistId: string | number,
): Promise<ArtistForApiContract> {
  try {
    const artist = await getJson<ArtistForApiContract>(
      `https://utaitedb.net/api/artists/${artistId}`,
      {
        fields:
          "AdditionalNames,ArtistLinks,ArtistLinksReverse,BaseVoicebank,Description,MainPicture,Names,Tags,WebLinks",
      },
    );
    return artist;
  } catch (error) {
    console.error(`Error fetching UtaiteDB artist with ID ${artistId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbArtistLite(
  artistId: string | number,
): Promise<ArtistForApiContract> {
  try {
    const artist = await getJson<ArtistForApiContract>(
      `https://utaitedb.net/api/artists/${artistId}`,
      {
        fields: "WebLinks",
      },
    );
    return artist;
  } catch (error) {
    console.error(
      `Error fetching UtaiteDB artist (lite) with ID ${artistId}:`,
      error,
    );
    throw error;
  }
}

export async function getUtaiteDbAlbum(
  albumId: string | number,
): Promise<AlbumForApiContract> {
  try {
    const album = await getJson<AlbumForApiContract>(
      `https://utaitedb.net/api/albums/${albumId}`,
      {
        fields:
          "AdditionalNames,Artists,Description,Discs,Identifiers,MainPicture,Names,PVs,ReleaseEvent,Tags,Tracks,WebLinks",
        songFields:
          "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags,WebLinks",
      },
    );
    return album;
  } catch (error) {
    console.error(`Error fetching UtaiteDB album with ID ${albumId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbAlbumLite(
  albumId: string | number,
): Promise<AlbumForApiContract> {
  try {
    const album = await getJson<AlbumForApiContract>(
      `https://utaitedb.net/api/albums/${albumId}`,
      {
        fields: "WebLinks",
      },
    );
    return album;
  } catch (error) {
    console.error(
      `Error fetching UtaiteDB album (lite) with ID ${albumId}:`,
      error,
    );
    throw error;
  }
}

export function getVocaDbId(
  entity: SongForApiContract | ArtistForApiContract | AlbumForApiContract,
): number | undefined {
  for (const link of entity.webLinks ?? []) {
    const match = link.url.match(/https?:\/\/vocadb\.net\/(?:S|Ar|Al)\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
}

/**
 * Recursively get songs until the root original song is found.
 * @param song Leaf song to retrieve from
 */
export async function getOriginalSong(
  song: SongForApiContract,
): Promise<SongForApiContract | null> {
  if (!(song.songType !== "Original" && song.originalVersionId)) return null;
  do {
    song = await getSong(song.originalVersionId);
  } while (song.songType !== "Original" && song.originalVersionId);
  return song;
}

export async function getUtaiteDbOriginalSong(
  song: SongForApiContract,
): Promise<SongForApiContract | null> {
  if (!(song.songType !== "Original" && song.originalVersionId)) return null;
  do {
    song = await getUtaiteDbSong(song.originalVersionId);
  } while (song.songType !== "Original" && song.originalVersionId);
  return song;
}

/**
 * Recursively get voicebanks until the root original voicebank is found.
 * @param voicebank Leaf voicebank to retrieve from
 */
export async function getBaseVoiceBank(
  voicebank: ArtistForApiContract,
): Promise<ArtistForApiContract | null> {
  if (!voicebank.baseVoicebank) return null;
  do {
    voicebank = await getArtist(voicebank.baseVoicebank.id);
  } while (voicebank.baseVoicebank);
  return voicebank;
}

/**
 * Recursively get voicebanks until the root original voicebank is found.
 * @param voicebank Leaf voicebank to retrieve from
 */
export async function getUtaiteDbBaseVoiceBank(
  voicebank: ArtistForApiContract,
): Promise<ArtistForApiContract | null> {
  if (!voicebank.baseVoicebank) return null;
  do {
    voicebank = await getUtaiteDbArtist(voicebank.baseVoicebank.id);
  } while (voicebank.baseVoicebank);
  return voicebank;
}
