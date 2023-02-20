import { Song } from "lyricova-common/models/Song";
import { Request, Response, NextFunction, Router } from "express";
import type { SongForApiContract } from "../types/vocadb";
import axios, { AxiosInstance } from "axios";

export class VocaDBImportController {
  private axios: AxiosInstance;
  public router: Router;

  constructor() {
    this.axios = axios.create({ responseType: "json" });
    this.router = Router();
    this.router.get("/enrolSong/:id(\\d+)", this.enrolSong);
  }

  private async getSong(songId: string | number): Promise<SongForApiContract> {
    const song = await this.axios.get<SongForApiContract>(
      `https://vocadb.net/api/songs/${songId}`,
      {
        params: {
          fields:
            "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
        },
      }
    );
    return song.data;
  }

  /**
   * Recursively get songs until the root original song is found.
   * @param song Leaf song to retrieve from
   */
  private async getOriginalSong(
    song: SongForApiContract
  ): Promise<SongForApiContract | null> {
    if (!(song.songType !== "Original" && song.originalVersionId)) return null;
    do {
      song = await this.getSong(song.originalVersionId);
    } while (song.songType !== "Original" && song.originalVersionId);
    return song;
  }

  public enrolSong = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const songId = req.params.id;
      // Fetch song data
      const song = await this.getSong(songId);
      // Recursively get original song
      const originalSong = await this.getOriginalSong(song);
      let originalSongEntity: Song | null = null;

      if (originalSong !== null) {
        originalSongEntity = await Song.saveFromVocaDBEntity(
          originalSong,
          null
        );
      }
      console.dir(originalSongEntity);
      const songEntity = await Song.saveFromVocaDBEntity(
        song,
        originalSongEntity
      );

      res.json({ status: "OK", data: songEntity });
    } catch (e) {
      next(e);
    }
  };
}
