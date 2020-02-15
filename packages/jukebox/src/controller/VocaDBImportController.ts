
import { MusicFile } from "../models/MusicFile";
import { Song } from "../models/Song";
import { Album } from "../models/Album";
import { Artist } from "../models/Artist";
import { Request, Response, NextFunction } from "express";
import { SongForApiContract } from "vocadb";
import axios, { AxiosInstance, AxiosResponse } from "axios";

export class VocaDBImportController {
  private axios: AxiosInstance;

  constructor() {
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

  public enrolSong = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const songId = req.params.id;
      // Fetch song data
      const song = await this.getSong(songId);
      // Recursively get original song
      const originalSong = await this.getOriginalSong(song);
      let originalSongEntity: Song | null = null;

      if (originalSong !== null) {
        originalSongEntity = await Song.saveFromVocaDBEntity(originalSong, null);
      }
      console.dir(originalSongEntity);
      const songEntity = await Song.saveFromVocaDBEntity(song, originalSongEntity);

      res.json({ status: "OK", data: songEntity });
    } catch (e) { next(e); }
  }
}