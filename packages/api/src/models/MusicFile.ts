import type { Song } from "./Song";
import type { Album } from "./Album";
import type { Playlist } from "./Playlist";
import type { FileInPlaylist } from "./FileInPlaylist";

export const ID3_LYRICS_LANGUAGE = "eng";

/**
 * @openapi
 * components:
 *   schemas:
 *     MusicFile:
 *       type: object
 *       description: A music file in the jukebox.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: File ID in database
 *         path:
 *           type: string
 *           maxLength: 768
 *           description: Local path to the song file
 *           example: "shoshitsu/gekishou.mp3"
 *         fileSize:
 *           type: integer
 *           format: int64
 *           minimum: 0
 *           description: Size of file in bytes
 *           example: 12345678
 *         songId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: ID of corresponding song in database
 *         albumId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: ID of corresponding album in database
 *         trackName:
 *           oneOf:
 *             - type: string
 *               maxLength: 1024
 *               example: "初音ミクの激唱"
 *             - type: 'null'
 *           description: Name of the track stored in file
 *         trackSortOrder:
 *           oneOf:
 *             - type: string
 *               maxLength: 1024
 *               example: "はつねみくのげきしょう"
 *             - type: 'null'
 *           description: Sort order key of name of the track
 *         albumName:
 *           oneOf:
 *             - type: string
 *               maxLength: 1024
 *               example: "初音ミクの消失 Real and Repeat"
 *             - type: 'null'
 *           description: Album of the track stored in file
 *         albumSortOrder:
 *           oneOf:
 *             - type: string
 *               maxLength: 1024
 *               example: "はつねみくのしょうしつ Real and Repeat"
 *             - type: 'null'
 *           description: Sort order key of album
 *         artistName:
 *           oneOf:
 *             - type: string
 *               maxLength: 1024
 *               example: "cosMo@暴走P feat. 初音ミク"
 *             - type: 'null'
 *           description: Artist of the track stored in file
 *         artistSortOrder:
 *           oneOf:
 *             - type: string
 *               maxLength: 1024
 *               example: "こすもあっとぼうそうぴー feat. はつねみく"
 *             - type: 'null'
 *           description: Sort order key of artist
 *         hasLyrics:
 *           type: boolean
 *           description: If the file is accompanied with a lyrics file
 *         hasCover:
 *           type: boolean
 *           description: If the file has an embedded cover art
 *         needReview:
 *           type: boolean
 *           description: If this entry needs review
 *         duration:
 *           type: number
 *           format: float
 *           description: Duration of the song in seconds
 *           example: 301
 *         hash:
 *           type: string
 *           maxLength: 128
 *           pattern: "^[a-fA-F0-9]{32}$"
 *           description: MD5 hash of the file
 *           example: "0123456789abcdef0123456789abcdef"
 *         playCount:
 *           type: integer
 *           minimum: 0
 *           description: Number of times the file has been played
 *         lastPlayed:
 *           oneOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *           description: Date when the file was last played
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - path
 *         - fileSize
 *         - hasLyrics
 *         - hasCover
 *         - needReview
 *         - duration
 *         - hash
 *         - playCount
 */
export class MusicFile {
  id!: number;

  path!: string;

  fileSize!: number;

  songId!: number;

  song!: Song | null;

  albumId!: number;

  album!: Album | null;

  playlists!: Playlist[];

  trackName?: string;

  trackSortOrder?: string;

  albumName?: string;

  albumSortOrder?: string;

  artistName?: string;

  artistSortOrder?: string;

  hasLyrics!: boolean;

  hasCover!: boolean;

  needReview!: boolean;

  duration!: number;

  hash!: string;

  playCount!: number;

  lastPlayed?: Date;

  creationDate!: Date;

  updatedOn!: Date;

  /** FileInPlaylist reflected by Playlist.$get("files"), added for GraphQL queries. */
  FileInPlaylist?: Partial<FileInPlaylist>;

  fullPath!: string;
}
