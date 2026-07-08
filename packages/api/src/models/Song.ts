import type { MusicFile } from "./MusicFile.js";
import type { VideoFile } from "./VideoFile.js";
import type { SongForApiContract } from "../types/vocadb.js";
import type { ArtistOfSong } from "./ArtistOfSong.js";
import type { SongInAlbum } from "./SongInAlbum.js";
import type { Entry } from "./Entry.js";
import type { Artist } from "./Artist.js";
import type { Album } from "./Album.js";
import type { SongOfEntry } from "./SongOfEntry.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     Song:
 *       type: object
 *       description: A song entry from VocaDB or UtaiteDB.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: VocaDB song ID for values greater than 0 or internal song ID otherwise.
 *         name:
 *           type: string
 *           maxLength: 4096
 *           example: "初音ミクの消失 -DEAD END-"
 *         sortOrder:
 *           type: string
 *           maxLength: 4096
 *           description: Sort order name
 *           example: "はつねみくのしょうしつ -DEAD END-"
 *         originalId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: ID of the original song if this is a derived version
 *         vocaDbJson:
 *           type: object
 *           description: Full VocaDB or UtaiteDB API response
 *           $ref: 'https://vocadb.net/swagger/v1/swagger.json#/components/schemas/SongForApiContract'
 *         utaiteDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: UtaiteDB ID if from UtaiteDB
 *         coverUrl:
 *           oneOf:
 *             - type: string
 *               maxLength: 4096
 *               format: uri
 *               example: "https://example.com/cover.jpg"
 *             - type: 'null'
 *           description: URL to the song’s cover image
 *         incomplete:
 *           type: boolean
 *           description: Whether this entry is incomplete and needs more data
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *         deletionDate:
 *           oneOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *       required:
 *         - id
 *         - name
 *         - sortOrder
 *         - incomplete
 */
export class Song {
  public id!: number;

  public name!: string;

  public sortOrder!: string;

  artists!: Array<Artist & { ArtistOfSong: ArtistOfSong }>;

  albums!: Array<Album & { SongInAlbum: SongInAlbum }>;

  originalId!: number | null;

  original!: Song | null;

  readonly derivedSongs!: Song[];

  vocaDbJson!: SongForApiContract | null;

  utaiteDbId!: number | null;

  videos!: VideoFile[];

  coverUrl?: string;

  files!: MusicFile[];

  lyricovaEntries!: Array<Entry & { SongOfEntry: SongOfEntry }>;

  incomplete!: boolean;

  creationDate!: Date;

  updatedOn!: Date;

  deletionDate!: Date;

  /** ArtistOfSong reflected by Album.$get("songs"), added for GraphQL queries. */
  SongInAlbum?: Partial<SongInAlbum>;
}
