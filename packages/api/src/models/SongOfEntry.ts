import { DataTypes } from "sequelize";
import {
  Model,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Column,
  Table,
  PrimaryKey,
  ForeignKey,
  AutoIncrement,
} from "sequelize-typescript";
import { Song } from "./Song";
import { Entry } from "./Entry";

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
@Table({ modelName: "SongOfEntry" })
export class SongOfEntry extends Model<SongOfEntry> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  public id!: number;

  @ForeignKey(() => Song)
  @Column
  songId: number;

  @ForeignKey(() => Entry)
  @Column
  entryId: number;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;
}
