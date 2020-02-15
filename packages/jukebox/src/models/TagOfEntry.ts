import { DataTypes } from "sequelize";
import { Model, CreatedAt, UpdatedAt, DeletedAt, Column, Table, PrimaryKey, ForeignKey, AutoIncrement } from "sequelize-typescript";
import { Entry } from "./Entry";
import { Tag } from "./Tag";

@Table
export class TagOfEntry extends Model<TagOfEntry> {

  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
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

}
