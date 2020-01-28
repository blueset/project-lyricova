
import { Entry } from "./Entry";
import { Model, Table, Column, PrimaryKey, BelongsToMany } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { TagOfEntry } from "./TagOfEntry";

@Table
export class Tag extends Model<Tag> {
  @Column({ type: new DataTypes.STRING(512) })
  @PrimaryKey
  slug: string;

  @Column({ type: new DataTypes.STRING(1024) })
  name: string;

  @Column({ type: new DataTypes.STRING(16) })
  color: string;

  @BelongsToMany(() => Entry, () => TagOfEntry)
  entries: Entry[];
}
