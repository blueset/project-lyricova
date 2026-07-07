import type { Request, Response } from "express";
import { requireNumericParams } from "../utils/numericParam";
import { Router } from "express";
import type { SongForApiContract } from "../types/vocadb";
import { getJson } from "../utils/httpFetch";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import { saveSongFromVocaDB } from "../utils/vocadbImport";
import { Songs } from "../drizzle/schema";

type SongRow = typeof Songs.$inferSelect;

export class VocaDBImportController {
  public router: Router;

  constructor() {
    this.router = Router();
    requireNumericParams(this.router, "id");
    this.router.get("/enrolSong/:id", adminOnlyMiddleware, this.enrolSong);
  }

  private async getSong(songId: string | number): Promise<SongForApiContract> {
    return getJson<SongForApiContract>(
      `https://vocadb.net/api/songs/${songId}`,
      {
        fields:
          "Albums,Artists,Names,ThumbUrl,PVs,Lyrics,MainPicture,AdditionalNames,Tags",
      },
    );
  }

  /**
   * Recursively get songs until the root original song is found.
   * @param song Leaf song to retrieve from
   */
  private async getOriginalSong(
    song: SongForApiContract,
  ): Promise<SongForApiContract | null> {
    if (!(song.songType !== "Original" && song.originalVersionId)) return null;
    do {
      song = await this.getSong(song.originalVersionId);
    } while (song.songType !== "Original" && song.originalVersionId);
    return song;
  }

  public enrolSong = async (req: Request, res: Response) => {
    const songId = req.params.id as string;
    // Fetch song data
    const song = await this.getSong(songId);
    // Recursively get original song
    const originalSong = await this.getOriginalSong(song);
    let originalSongEntity: SongRow | null = null;

    if (originalSong !== null) {
      originalSongEntity = await saveSongFromVocaDB(originalSong, null);
    }
    console.dir(originalSongEntity);
    const songEntity = await saveSongFromVocaDB(song, originalSongEntity);

    res.json({ status: "OK", data: songEntity });
  };
}
