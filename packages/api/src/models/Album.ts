import type { SongInAlbum } from "./SongInAlbum.js";
import type { AlbumForApiContract } from "../types/vocadb.js";
import type { ArtistOfAlbum } from "./ArtistOfAlbum.js";
import type { MusicFile } from "./MusicFile.js";
import type { Song } from "./Song.js";
import type { Artist } from "./Artist.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     Album:
 *       type: object
 *       description: An album entry.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: VocaDB album ID for values greater than 0 or internal album ID otherwise.
 *         name:
 *           type: string
 *           maxLength: 4096
 *           example: "初音ミクの消失 Real and Repeat"
 *         sortOrder:
 *           type: string
 *           maxLength: 4096
 *           description: Sort order name
 *           example: "はつねみくのしょうしつ Real and Repeat"
 *         coverUrl:
 *           oneOf:
 *             - type: string
 *               maxLength: 4096
 *               format: uri
 *             - type: 'null'
 *           description: URL to the album’s cover image
 *         vocaDbJson:
 *           $ref: 'https://vocadb.net/swagger/v1/swagger.json#/components/schemas/AlbumForApiContract'
 *           type: object
 *           description: Full VocaDB or UtaiteDB API response
 *         incomplete:
 *           type: boolean
 *           description: Whether this entry is an incomplete import from VocaDB/UtaiteDB
 *         utaiteDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: UtaiteDB ID if from UtaiteDB
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
export class Album {
  id!: number;

  name!: string;

  sortOrder!: string;

  songs!: Array<Song & { SongInAlbum: SongInAlbum }>;

  artists!: Array<Artist & { ArtistOfAlbum: ArtistOfAlbum }>;

  coverUrl?: string;

  files!: MusicFile[];

  vocaDbJson!: AlbumForApiContract | null;

  incomplete!: boolean;

  utaiteDbId!: number | null;

  creationDate!: Date;

  updatedOn!: Date;

  deletionDate!: Date;

  /** SongInAlbum reflected by Song.$get("albums"), added for GraphQL queries. */
  SongInAlbum?: Partial<SongInAlbum>;
}
