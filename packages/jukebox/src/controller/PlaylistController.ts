import { Playlist } from "../models/Playlist";
import { Router, Request, Response, NextFunction } from "express";

export class PlaylistController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/:id(\\d+).m3u8", this.buildPlaylist);
  }

  public buildPlaylist = async (req: Request, res: Response, next: NextFunction) => {
    const playlist = await Playlist.findByPk(parseInt(req.params.id));
    if (playlist === null) {
      return res.status(404).json({ status: 404, message: "Playlist not found." });
    }

    let text = `#EXTM3U\n#EXTENC:UTF-8\n#PLAYLIST:${playlist.name}\n`;
    (await playlist.$get("files")).forEach((file) => {
      text += `#EXTINF:${file.duration},${file.artistName} - ${file.trackName}\n${file.path}\n`;
    });

    res
      .contentType("audio/mpegurl")
      .attachment(`${playlist.slug}.m3u8`)
      .send(text);
  }
}