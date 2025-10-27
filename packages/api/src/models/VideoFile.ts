import { Song } from "./Song";
import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  AllowNull,
  Default,
  BelongsTo,
  ForeignKey,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Field, Int, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     VideoFile:
 *       type: object
 *       description: A video file associated with a song.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         path:
 *           type: string
 *           maxLength: 768
 *           description: Local path to the video file
 *         songId:
 *           type: integer
 *           format: int64
 *           description: ID of the associated song
 *         title:
 *           type: string
 *           maxLength: 1024
 *           description: Title of the video
 *         sourceUrl:
 *           oneOf:
 *             - type: string
 *               maxLength: 2048
 *               format: uri
 *             - type: 'null'
 *           description: Original URL of the video source
 *         type:
 *           type: string
 *           enum:
 *             - Original
 *             - PV
 *             - Derived
 *             - Subtitled
 *             - OnVocal
 *             - OffVocal
 *             - Other
 *           description: Type of video content
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
 *         - path
 *         - songId
 *         - title
 *         - type
 */
@ObjectType()
@Table({ modelName: "VideoFile" })
export class VideoFile extends Model<VideoFile> {
  @Field(() => Int)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id: number;

  @Column({ type: new DataTypes.STRING(768), unique: true })
  path: string;

  @ForeignKey(() => Song)
  @Column
  songId: number;

  @BelongsTo(() => Song)
  song: Song;

  @Column({ type: new DataTypes.STRING(1024) })
  title: string;

  @AllowNull
  @Column({ type: new DataTypes.STRING(2048) })
  sourceUrl?: string;

  @Default("Other")
  @Column({
    type: DataTypes.ENUM(
      "Original",
      "PV",
      "Derived",
      "Subtitled",
      "OnVocal",
      "OffVocal",
      "Other"
    ),
  })
  type:
    | "Original"
    | "PV"
    | "Derived"
    | "Subtitled"
    | "OnVocal"
    | "OffVocal"
    | "Other";

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
