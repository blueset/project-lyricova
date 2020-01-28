
import { Song } from "./Song";
import { Model, Table, Column, PrimaryKey, AutoIncrement, CreatedAt, UpdatedAt, DeletedAt, AllowNull, Default, BelongsTo, ForeignKey } from "sequelize-typescript";
import { DataTypes } from "sequelize";


@Table
export class VideoFile extends Model<VideoFile> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  @AutoIncrement
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

  @Column({ type: new DataTypes.STRING(2048) })
  @AllowNull
  sourceUrl: string | null;

  @Column({ type: DataTypes.ENUM("Original", "PV", "Derived", "Subtitled", "OnVocal", "OffVocal", "Other") })
  @Default("Other")
  type: "Original" | "PV" | "Derived" | "Subtitled" | "OnVocal" | "OffVocal" | "Other";

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
