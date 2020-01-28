
import { MusicFile } from "../models/MusicFile";
import { Song } from "../models/Song";
import { Album } from "../models/Album";
import { Artist } from "../models/Artist";
import { Request, Response } from "express";
import { SongForApiContract } from "vocadb";
import axios, { AxiosInstance, AxiosResponse } from "axios";

export class VocaDBImportController {
  private musicFileRepository: Repository<MusicFile>;
  private songRepository: Repository<Song>;
  private albumRepository: Repository<Album>;
  private artistRepository: Repository<Artist>;
  private axios: AxiosInstance;

  constructor() {
    this.musicFileRepository = getRepository(MusicFile);
    this.songRepository = getRepository(Song);
    this.axios = axios.create({ responseType: "json" });
  }

  private async getSong(songId: string | number): Promise<SongForApiContract> {
    const song = await this.axios.get<SongForApiContract>(`https://vocadb.net/api/songs/${songId}`, {
      params: {
        fields: "Albums,Artists,Names,ThumbUrl,PVs"
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

  public enrolSong = async (req: Request, res: Response) => {
    const songId = req.params.id;
    // Fetch song data
    const song = await this.getSong(songId);
    const songEntity = Song.fromVocaDBEntity(song);

    // Recursively get original song
    const originalSong = await this.getOriginalSong(song);
    songEntity.original = Song.fromVocaDBEntity(originalSong);

    await this.songRepository.save(songEntity);

    res.json({ status: "OK", data: songEntity });
  }
}