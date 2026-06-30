import { MusicFile } from "./MusicFile";
import { DataTypes } from "sequelize";
import {
  Model,
  CreatedAt,
  UpdatedAt,
  Column,
  Table,
  PrimaryKey,
  ForeignKey,
  AutoIncrement,
} from "sequelize-typescript";
import { Playlist } from "./Playlist";

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
@Table({ modelName: "FileInPlaylist" })
export class FileInPlaylist extends Model<FileInPlaylist> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  public id!: number;

  @ForeignKey(() => MusicFile)
  @Column
  fileId: number;

  @ForeignKey(() => Playlist)
  @Column
  playlistId: number;

  @Column({ type: new DataTypes.INTEGER(), defaultValue: 0 })
  sortOrder: number;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;
}
