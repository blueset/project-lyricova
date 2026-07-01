/**
 * @openapi
 * components:
 *   schemas:
 *     SongOfEntry:
 *       type: object
 *       description: Junction table linking songs to lyricova entries.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         songId:
 *           type: integer
 *           format: int64
 *           description: ID of the song
 *         entryId:
 *           type: integer
 *           format: int64
 *           description: ID of the entry
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - songId
 *         - entryId
 */
export class SongOfEntry {
  public id!: number;

  songId: number;

  entryId: number;

  creationDate: Date;

  updatedOn: Date;
}
