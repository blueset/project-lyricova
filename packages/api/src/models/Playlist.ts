import type { MusicFile } from "./MusicFile";

/**
 * @openapi
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       description: A playlist of music files.
 *       properties:
 *         slug:
 *           type: string
 *           maxLength: 512
 *           example: "favorites"
 *           description: URL-friendly identifier for the playlist
 *         name:
 *           type: string
 *           maxLength: 1024
 *           example: "My Favorites"
 *           description: Display name of the playlist
 *         filesCount:
 *           type: integer
 *           description: Number of files in the playlist
 *           readOnly: true
 *       required:
 *         - slug
 *         - name
 */
export class Playlist {
  slug: string;

  name: string;

  files: MusicFile[];

  filesCount?: number;
}
