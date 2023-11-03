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
