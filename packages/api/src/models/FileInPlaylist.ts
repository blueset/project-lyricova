/**
 * @openapi
 * components:
 *   schemas:
 *     FileInPlaylist:
 *       type: object
 *       description: Junction table linking music files to playlists with ordering.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         fileId:
 *           type: integer
 *           format: int64
 *           description: ID of the music file
 *         playlistId:
 *           type: string
 *           maxLength: 512
 *           description: Slug of the playlist
 *         sortOrder:
 *           type: integer
 *           description: Order of the file in the playlist
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - fileId
 *         - playlistId
 *         - sortOrder
 */
export class FileInPlaylist {
  public id!: number;

  fileId: number;

  playlistId: number;

  sortOrder: number;

  creationDate: Date;

  updatedOn: Date;
}
