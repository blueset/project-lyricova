import { DataTypes } from "sequelize";
import { Model, CreatedAt, UpdatedAt, DeletedAt, Column, Table, PrimaryKey, ForeignKey, AutoIncrement } from "sequelize-typescript";
import { Song } from "./Song";
import { Entry } from "./Entry";

@Table
export class SongOfEntry extends Model<SongOfEntry> {

  @Column({ type: new DataTypes.INTEGER })
  @AutoIncrement
  @PrimaryKey
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

  @DeletedAt
  deletionDate: Date;

}
