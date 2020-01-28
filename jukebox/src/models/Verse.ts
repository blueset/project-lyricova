
import { Entry } from "./Entry";
import { Model, PrimaryKey, Table, Column, AutoIncrement, CreatedAt, UpdatedAt, DeletedAt } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { ManyToOne } from "typeorm";

@Table
export class Verse extends Model<Verse> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  @AutoIncrement
  id: number;

  @Column({ type: new DataTypes.STRING(64) })
  language: string;

  @Column({ type: DataTypes.BOOLEAN })
  isOriginal: boolean;

  @Column({ type: DataTypes.BOOLEAN })
  isMain: boolean;

  @Column({ type: new DataTypes.TEXT })
  text: string;

  @Column({ type: new DataTypes.TEXT })
  html: string;

  @Column({ type: new DataTypes.TEXT })
  stylizedText: string;

  @Column({ type: DataTypes.JSON })
  typingSequence: string;

  @ManyToOne(
    () => Entry,
    entry => entry.verses
  )
  entry: Entry;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
