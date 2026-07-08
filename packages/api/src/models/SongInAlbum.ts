import type { Song } from "./Song.js";
import type { Album } from "./Album.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     SongInAlbum:
 *       type: object
 *       description: Junction table linking songs to albums with track information.
 *       properties:
 *         songInAlbumId:
 *           type: integer
 *           format: int64
 *         vocaDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: VocaDB ID for this song-album relationship
 *         diskNumber:
 *           oneOf:
 *             - type: integer
 *             - type: 'null'
 *           description: Disk/disc number in multi-disc albums
 *         trackNumber:
 *           oneOf:
 *             - type: integer
 *             - type: 'null'
 *           description: Track number on the disc
 *         name:
 *           oneOf:
 *             - type: string
 *               maxLength: 2048
 *             - type: 'null'
 *           description: Name of the song as it appears on the album
 *         songId:
 *           type: integer
 *           format: int64
 *         albumId:
 *           type: integer
 *           format: int64
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - songInAlbumId
 *         - songId
 *         - albumId
 */
export class SongInAlbum {
  songInAlbumId!: number;

  vocaDbId!: number | null;

  diskNumber!: number | null;

  trackNumber!: number | null;

  name?: string;

  song!: Song;

  songId!: number;

  album!: Album;

  albumId!: number;

  creationDate!: Date;

  updatedOn!: Date;
}
