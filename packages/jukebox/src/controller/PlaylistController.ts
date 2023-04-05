import { Playlist } from "lyricova-common/models/Playlist";
import type { Request, Response} from "express";
import { Router, NextFunction } from "express";

export class PlaylistController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/:slug.m3u8", this.buildPlaylist);
  }

  public buildPlaylist = async (req: Request, res: Response) => {
    const playlist = await Playlist.findByPk(req.params.slug);
    if (playlist === null) {
      return res
        .status(404)
        .json({ status: 404, message: "Playlist not found." });
    }

    let text = `#EXTM3U\n#EXTENC:UTF-8\n#PLAYLIST:${playlist.name}\n`;
    (await playlist.$get("files")).forEach((file) => {
      text += `#EXTINF:${Math.round(file.duration)},${
        file.trackName
      } - ${file.artistName || "Various artists"}\n${file.path}\n`;
    });

    res
      .type("audio/mpegurl")
      .attachment(`${playlist.slug}.m3u8`)
      .send(text);
  };
}
