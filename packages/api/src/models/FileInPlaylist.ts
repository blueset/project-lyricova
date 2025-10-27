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
import { Field, Int, ObjectType } from "type-graphql";

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
@ObjectType()
@Table({ modelName: "FileInPlaylist" })
export class FileInPlaylist extends Model<FileInPlaylist> {
  @Field((type) => Int)
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

  @Field((type) => Int)
  @Column({ type: new DataTypes.INTEGER(), defaultValue: 0 })
  sortOrder: number;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;
}
