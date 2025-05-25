import got from "got-cjs";
import {
  SongForApiContract,
  ArtistForApiContract,
  AlbumForApiContract,
  ArtistContract,
  AlbumContract,
} from "../types/vocadb";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";

export async function getSong(
  songId: string | number
): Promise<SongForApiContract> {
  try {
    const song = await got
      .get(`https://vocadb.net/api/songs/${songId}`, {
        searchParams: {
          fields:
            "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
        },
      })
      .json<SongForApiContract>();
    return song;
  } catch (error) {
    console.error(`Error fetching song with ID ${songId}:`, error);
    throw error;
  }
}

export async function getArtist(
  artistId: string | number
): Promise<ArtistForApiContract> {
  try {
    const artist = await got
      .get(`https://vocadb.net/api/artists/${artistId}`, {
        searchParams: {
          fields:
            "AdditionalNames,ArtistLinks,ArtistLinksReverse,BaseVoicebank,Description,MainPicture,Names,Tags,WebLinks",
        },
      })
      .json<ArtistForApiContract>();
    return artist;
  } catch (error) {
    console.error(`Error fetching artist with ID ${artistId}:`, error);
    throw error;
  }
}

export async function getAlbum(
  albumId: string | number
): Promise<AlbumForApiContract> {
  try {
    const album = await got
      .get(`https://vocadb.net/api/albums/${albumId}`, {
        searchParams: {
          fields:
            "AdditionalNames,Artists,Description,Discs,Identifiers,MainPicture,Names,PVs,ReleaseEvent,Tags,Tracks,WebLinks",
          songFields:
            "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags,WebLinks",
        },
      })
      .json<AlbumForApiContract>();
    return album;
  } catch (error) {
    console.error(`Error fetching album with ID ${albumId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbSong(
  songId: string | number
): Promise<SongForApiContract> {
  try {
    const song = await got
      .get(`https://utaitedb.net/api/songs/${songId}`, {
        searchParams: {
          fields:
            "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags,WebLinks",
        },
      })
      .json<SongForApiContract>();
    return song;
  } catch (error) {
    console.error(`Error fetching UtaiteDB song with ID ${songId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbArtist(
  artistId: string | number
): Promise<ArtistForApiContract> {
  try {
    const artist = await got
      .get(`https://utaitedb.net/api/artists/${artistId}`, {
        searchParams: {
          fields:
            "AdditionalNames,ArtistLinks,ArtistLinksReverse,BaseVoicebank,Description,MainPicture,Names,Tags,WebLinks",
        },
      })
      .json<ArtistForApiContract>();
    return artist;
  } catch (error) {
    console.error(`Error fetching UtaiteDB artist with ID ${artistId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbArtistLite(
  artistId: string | number
): Promise<ArtistForApiContract> {
  try {
    const artist = await got
      .get(`https://utaitedb.net/api/artists/${artistId}`, {
        searchParams: {
          fields: "WebLinks",
        },
      })
      .json<ArtistForApiContract>();
    return artist;
  } catch (error) {
    console.error(
      `Error fetching UtaiteDB artist (lite) with ID ${artistId}:`,
      error
    );
    throw error;
  }
}

export async function getUtaiteDbAlbum(
  albumId: string | number
): Promise<AlbumForApiContract> {
  try {
    const album = await got
      .get(`https://utaitedb.net/api/albums/${albumId}`, {
        searchParams: {
          fields:
            "AdditionalNames,Artists,Description,Discs,Identifiers,MainPicture,Names,PVs,ReleaseEvent,Tags,Tracks,WebLinks",
          songFields:
            "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags,WebLinks",
        },
      })
      .json<AlbumForApiContract>();
    return album;
  } catch (error) {
    console.error(`Error fetching UtaiteDB album with ID ${albumId}:`, error);
    throw error;
  }
}

export async function getUtaiteDbAlbumLite(
  albumId: string | number
): Promise<AlbumForApiContract> {
  try {
    const album = await got
      .get(`https://utaitedb.net/api/albums/${albumId}`, {
        searchParams: {
          fields: "WebLinks",
        },
      })
      .json<AlbumForApiContract>();
    return album;
  } catch (error) {
    console.error(
      `Error fetching UtaiteDB album (lite) with ID ${albumId}:`,
      error
    );
    throw error;
  }
}

export function getVocaDbId(
  entity: SongForApiContract | ArtistForApiContract | AlbumForApiContract
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
  song: SongForApiContract
): Promise<SongForApiContract | null> {
  if (!(song.songType !== "Original" && song.originalVersionId)) return null;
  do {
    song = await getSong(song.originalVersionId);
  } while (song.songType !== "Original" && song.originalVersionId);
  return song;
}

export async function getUtaiteDbOriginalSong(
  song: SongForApiContract
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
  voicebank: ArtistForApiContract
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
  voicebank: ArtistForApiContract
): Promise<ArtistForApiContract | null> {
  if (!voicebank.baseVoicebank) return null;
  do {
    voicebank = await getUtaiteDbArtist(voicebank.baseVoicebank.id);
  } while (voicebank.baseVoicebank);
  return voicebank;
}

export async function processUtaiteDbArtist(artist: ArtistContract): Promise<{
  artist: ArtistContract;
  type: "vocaDb" | "utaiteDb";
  isNew: boolean;
}> {
  const existing = await Artist.findOne({ where: { utaiteDbId: artist.id } });
  if (existing) {
    return {
      artist: {
        ...artist,
        id: existing.id,
      },
      type: "vocaDb",
      isNew: false,
    };
  }

  const artistLite = await getUtaiteDbArtistLite(artist.id);
  const vocaDbId = getVocaDbId(artistLite);
  if (vocaDbId) {
    return {
      artist: {
        ...artist,
        id: vocaDbId,
      },
      type: "vocaDb",
      isNew: true,
    };
  }

  return {
    artist,
    type: "utaiteDb",
    isNew: true,
  };
}

export async function processUtaiteDbAlbum(album: AlbumContract): Promise<{
  album: AlbumContract;
  type: "vocaDb" | "utaiteDb";
  isNew: boolean;
}> {
  const existing = await Album.findOne({ where: { utaiteDbId: album.id } });
  if (existing) {
    return {
      album: {
        ...album,
        id: existing.id,
      },
      type: "vocaDb",
      isNew: false,
    };
  }

  const albumLite = await getUtaiteDbAlbumLite(album.id);
  const vocaDbId = getVocaDbId(albumLite);
  if (vocaDbId) {
    return {
      album: {
        ...album,
        id: vocaDbId,
      },
      type: "vocaDb",
      isNew: true,
    };
  }

  return {
    album,
    type: "utaiteDb",
    isNew: true,
  };
}
