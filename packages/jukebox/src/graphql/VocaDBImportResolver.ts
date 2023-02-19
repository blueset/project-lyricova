import { Song } from "lyricova-common/models/Song";
import type { AlbumForApiContract, ArtistForApiContract, SongForApiContract } from "lyricova-common/types/vocadb";
import axios, { AxiosInstance } from "axios";
import got from "got";
import { Arg, Authorized, Int, Mutation, Resolver } from "type-graphql";
import { Artist } from "lyricova-common/models/Artist";
import { Album } from "lyricova-common/models/Album";


@Resolver()
export class VocaDBImportResolver {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({ responseType: "json" });
  }

  private async getSong(songId: string | number): Promise<SongForApiContract> {
    // const song = await this.axios.get<SongForApiContract>(`https://vocadb.net/api/songs/${songId}`, {
    //   params: {
    //     fields: "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
    //   }
    // });
    const song = await got.get(`https://vocadb.net/api/songs/${songId}`, {
      searchParams: {
        fields: "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
      }
    }).json<SongForApiContract>();
    return song;
  }

  private async getArtist(artistId: string | number): Promise<ArtistForApiContract> {
    const artist = await got.get(`https://vocadb.net/api/artists/${artistId}`, {
      searchParams: {
        fields: "AdditionalNames,ArtistLinks,ArtistLinksReverse,BaseVoicebank,Description,MainPicture,Names,Tags,WebLinks",
      }
    }).json<ArtistForApiContract>();
    return artist;
  }

  private async getAlbum(albumId: string | number): Promise<AlbumForApiContract> {
    const album = await got.get(`https://vocadb.net/api/albums/${albumId}`, {
      searchParams: {
        fields: "AdditionalNames,Artists,Description,Discs,Identifiers,MainPicture,Names,PVs,ReleaseEvent,Tags,Tracks,WebLinks",
        songFields: "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
      }
    }).json<AlbumForApiContract>();
    return album;
  }

  /**
   * Recursively get songs until the root original song is found.
   * @param song Leaf song to retrieve from
   */
  private async getOriginalSong(song: SongForApiContract): Promise<SongForApiContract | null> {
    if (!(song.songType !== "Original" && song.originalVersionId)) return null;
    do {
      song = await this.getSong(song.originalVersionId);
    } while (song.songType !== "Original" && song.originalVersionId);
    return song;
  }

  /**
   * Recursively get voicebanks until the root original voicebank is found.
   * @param voicebank Leaf voicebank to retrieve from
   */
  private async getBaseVoiceBank(voicebank: ArtistForApiContract): Promise<ArtistForApiContract | null> {
    if (!voicebank.baseVoicebank) return null;
    do {
      voicebank = await this.getArtist(voicebank.baseVoicebank.id);
    } while (voicebank.baseVoicebank);
    return voicebank;
  }

  @Authorized("ADMIN")
  @Mutation(() => Song, { description: "Insert or update a song from VocaDB." })
  public async enrolSongFromVocaDB(@Arg("songId", () => Int, { description: "Song ID in VocaDB" }) songId: number): Promise<Song> {
    // Fetch song data
    const song = await this.getSong(songId);
    // Recursively get original song
    const originalSong = await this.getOriginalSong(song);
    let originalSongEntity: Song | null = null;

    if (originalSong !== null) {
      originalSongEntity = await Song.saveFromVocaDBEntity(originalSong, null);
    }
    return await Song.saveFromVocaDBEntity(song, originalSongEntity);
  }

  @Authorized("ADMIN")
  @Mutation(() => Artist, { description: "Insert or update an artist from VocaDB." })
  public async enrolArtistFromVocaDB(@Arg("artistId", () => Int, { description: "Artist ID in VocaDB" }) artistId: number): Promise<Artist> {
    // Fetch song data
    const artist = await this.getArtist(artistId);
    // Recursively get base voicebank
    const baseVoicebank = await this.getBaseVoiceBank(artist);

    let baseVoicebankEntity: Artist | null = null;

    if (baseVoicebank !== null) {
      baseVoicebankEntity = await Artist.saveFromVocaDBEntity(baseVoicebank, null);
    }
    return await Artist.saveFromVocaDBEntity(artist, baseVoicebankEntity);
  }

  @Authorized("ADMIN")
  @Mutation(() => Album, { description: "Insert or update an album from VocaDB." })
  public async enrolAlbumFromVocaDB(@Arg("albumId", () => Int, { description: "Album ID in VocaDB" }) albumId: number): Promise<Album> {
    // Fetch song data
    const album = await this.getAlbum(albumId);
    return await Album.saveFromVocaDBEntity(album);
  }
}