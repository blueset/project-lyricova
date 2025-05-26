import { Song } from "../models/Song";
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
} from "../utils/vocadb";
import { Arg, Authorized, Int, Mutation, Resolver } from "type-graphql";
import { Artist } from "../models/Artist";
import { Album } from "../models/Album";

@Resolver()
export class VocaDBImportResolver {
  @Authorized("ADMIN")
  @Mutation(() => Song, { description: "Insert or update a song from VocaDB." })
  public async enrolSongFromVocaDB(
    @Arg("songId", () => Int, { description: "Song ID in VocaDB" })
    songId: number
  ): Promise<Song> {
    // Fetch data
    const song = await getSong(songId);
    // Recursively get original song
    const originalSong = await getOriginalSong(song);
    let originalSongEntity: Song | null = null;

    if (originalSong !== null) {
      originalSongEntity = await Song.saveFromVocaDBEntity(originalSong, null);
    }
    return await Song.saveFromVocaDBEntity(song, originalSongEntity);
  }

  @Authorized("ADMIN")
  @Mutation(() => Artist, {
    description: "Insert or update an artist from VocaDB.",
  })
  public async enrolArtistFromVocaDB(
    @Arg("artistId", () => Int, { description: "Artist ID in VocaDB" })
    artistId: number
  ): Promise<Artist> {
    // Fetch data
    const artist = await getArtist(artistId);
    // Recursively get base voicebank
    const baseVoicebank = await getBaseVoiceBank(artist);

    let baseVoicebankEntity: Artist | null = null;

    if (baseVoicebank !== null) {
      baseVoicebankEntity = await Artist.saveFromVocaDBEntity(
        baseVoicebank,
        null
      );
    }
    return await Artist.saveFromVocaDBEntity(artist, baseVoicebankEntity);
  }

  @Authorized("ADMIN")
  @Mutation(() => Album, {
    description: "Insert or update an album from VocaDB.",
  })
  public async enrolAlbumFromVocaDB(
    @Arg("albumId", () => Int, { description: "Album ID in VocaDB" })
    albumId: number
  ): Promise<Album> {
    // Fetch data
    const album = await getAlbum(albumId);
    return await Album.saveFromVocaDBEntity(album);
  }

  @Authorized("ADMIN")
  @Mutation(() => Song, {
    description: "Insert or update a song from UtaiteDB.",
  })
  public async enrolSongFromUtaiteDB(
    @Arg("songId", () => Int, { description: "Song ID in UtaiteDB" })
    songId: number
  ): Promise<Song> {
    // Fetch data
    const song = await getUtaiteDbSong(songId);

    const vocaDbId = getVocaDbId(song);
    if (vocaDbId !== undefined) {
      const song = await this.enrolSongFromVocaDB(vocaDbId);
      await Song.update({ utaiteDbId: songId }, { where: { id: song.id } });
      song.utaiteDbId = songId; // Update the utaiteDbId in the returned song
      return song;
    }

    // Recursively get original song
    const originalSong = await getUtaiteDbOriginalSong(song);
    let originalSongEntity: Song | null = null;

    if (originalSong !== null) {
      const originalSongVocaDbId = getVocaDbId(originalSong);
      if (originalSongVocaDbId !== undefined) {
        originalSongEntity = await this.enrolSongFromVocaDB(
          originalSongVocaDbId
        );
        await Song.update(
          { utaiteDbId: originalSong.id },
          { where: { id: originalSongEntity.id } }
        );
      } else {
        // If the original song is not in VocaDB, save it as a new UtaiteDB entity
        originalSongEntity = await Song.saveFromUtaiteDBEntity(
          originalSong,
          null
        );
      }
    }
    return await Song.saveFromUtaiteDBEntity(song, originalSongEntity);
  }

  @Authorized("ADMIN")
  @Mutation(() => Artist, {
    description: "Insert or update an artist from UtaiteDB.",
  })
  public async enrolArtistFromUtaiteDB(
    @Arg("artistId", () => Int, { description: "Artist ID in UtaiteDB" })
    artistId: number
  ): Promise<Artist> {
    // Fetch data
    const artist = await getUtaiteDbArtist(artistId);

    const vocaDbId = getVocaDbId(artist);
    if (vocaDbId !== undefined) {
      const artist = await this.enrolArtistFromVocaDB(vocaDbId);
      await Artist.update(
        { utaiteDbId: artistId },
        { where: { id: artist.id } }
      );
      artist.utaiteDbId = artistId; // Update the utaiteDbId in the returned artist
      return artist;
    }

    // Recursively get base voicebank
    const baseVoicebank = await getUtaiteDbBaseVoiceBank(artist);

    let baseVoicebankEntity: Artist | null = null;

    if (baseVoicebank !== null) {
      const baseVoicebankId = getVocaDbId(baseVoicebank);
      if (baseVoicebankId !== undefined) {
        baseVoicebankEntity = await this.enrolArtistFromVocaDB(baseVoicebankId);
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

  @Authorized("ADMIN")
  @Mutation(() => Album, {
    description: "Insert or update an album from UtaiteDB.",
  })
  public async enrolAlbumFromUtaiteDB(
    @Arg("albumId", () => Int, { description: "Album ID in UtaiteDB" })
    albumId: number
  ): Promise<Album> {
    // Fetch data
    const album = await getUtaiteDbAlbum(albumId);

    const vocaDbId = getVocaDbId(album);
    if (vocaDbId !== undefined) {
      const album = await this.enrolAlbumFromVocaDB(vocaDbId);
      await Album.update({ utaiteDbId: albumId }, { where: { id: album.id } });
      album.utaiteDbId = albumId; // Update the utaiteDbId in the returned album
      return album;
    }

    const tracks = (
      await Promise.all(
        album.tracks
          ?.filter((track) => !!track?.song?.id)
          ?.map((track) => this.enrolSongFromUtaiteDB(track.song.id)) ?? []
      )
    ).filter((t): t is Song => !!t);

    return await Album.saveFromUtaiteDBEntity(album, tracks);
  }
}
