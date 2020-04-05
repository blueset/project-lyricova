
import { Song } from "../models/Song";
import { Router } from "express";
import { SongForApiContract } from "vocadb";
import axios, { AxiosInstance } from "axios";
import { Resolver, Mutation, Arg, Int } from "type-graphql";


@Resolver()
export class VocaDBImportResolver {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({ responseType: "json" });
  }

  private async getSong(songId: string | number): Promise<SongForApiContract> {
    const song = await this.axios.get<SongForApiContract>(`https://vocadb.net/api/songs/${songId}`, {
      params: {
        fields: "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags"
      }
    });
    return song.data;
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
    // console.dir(originalSongEntity);
    const songEntity = await Song.saveFromVocaDBEntity(song, originalSongEntity);

    return songEntity;
  }
}