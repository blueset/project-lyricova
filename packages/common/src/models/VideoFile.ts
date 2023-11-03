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
