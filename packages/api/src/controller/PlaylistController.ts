import { Playlist } from "../models/Playlist";
import type { Request, Response } from "express";
import { Router } from "express";

export class PlaylistController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/:slug.m3u8", this.buildPlaylist);
  }

  /**
   * @openapi
   * /playlists/{slug}.m3u8:
   *   get:
   *     summary: Generate an M3U8 playlist file
   *     description: Retrieves a playlist by its slug and generates an M3U8 format playlist file containing the music files in the playlist
   *     tags:
   *       - Playlists
   *     parameters:
   *       - in: path
   *         name: slug
   *         schema:
   *           type: string
   *         required: true
   *         description: The slug identifier of the playlist
   *         example: core
   *     responses:
   *       200:
   *         description: M3U8 playlist file
   *         content:
   *           audio/mpegurl:
   *             schema:
   *               type: string
   *               description: M3U8 playlist content in plain text format
   *               example: |
   *                 #EXTM3U
   *                 #EXTENC:UTF-8
   *                 #PLAYLIST:Core
   *                 #EXTINF:301,初音ミクの激唱 - cosMo@暴走P feat. 初音ミク
   *                 shoshitsu/gekishou.mp3
   *         headers:
   *           Content-Disposition:
   *             schema:
   *               type: string
   *               example: "attachment; filename=\"favorites.m3u8\""
   *             description: Suggests the browser to download the file with the playlist slug as filename
   *       404:
   *         description: Playlist not found
   *         content:
   *           application/json:
   *             schema:
   *               const:
   *                 status: 404
   *                 message: "Playlist not found."
   */
  public buildPlaylist = async (req: Request, res: Response) => {
    const playlist = await Playlist.findByPk(req.params.slug);
    if (playlist === null) {
      return res
        .status(404)
        .json({ status: 404, message: "Playlist not found." });
    }

    let text = `#EXTM3U\n#EXTENC:UTF-8\n#PLAYLIST:${playlist.name}\n`;
    (await playlist.$get("files")).forEach((file) => {
      text += `#EXTINF:${Math.round(file.duration)},${file.trackName} - ${
        file.artistName || "Various artists"
      }\n${file.path}\n`;
    });

    res.type("audio/mpegurl").attachment(`${playlist.slug}.m3u8`).send(text);
  };
}
