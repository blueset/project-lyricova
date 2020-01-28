import { DataTypes } from "sequelize";
import { Model, CreatedAt, UpdatedAt, DeletedAt, Column, Table, PrimaryKey, ForeignKey, AutoIncrement } from "sequelize-typescript";
import { Entry } from "./Entry";
import { Tag } from "./Tag";

@Table
export class TagOfEntry extends Model<TagOfEntry> {

  @Column({ type: new DataTypes.INTEGER })
  @AutoIncrement
  @PrimaryKey
  public id!: number;

  @ForeignKey(() => Tag)
  @Column({ type: new DataTypes.STRING(512) })
  tagId: string;

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
