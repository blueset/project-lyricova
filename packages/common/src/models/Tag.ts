import { Entry } from "./Entry";
import {
  Model,
  Table,
  Column,
  PrimaryKey,
  BelongsToMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { TagOfEntry } from "./TagOfEntry";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@Table({ modelName: "Tag" })
export class Tag extends Model<Tag> {
  @Field((type) => ID)
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(512) })
  slug: string;

  @Field()
  @Column({ type: new DataTypes.STRING(1024) })
  name: string;

  @Field()
  @Column({ type: new DataTypes.STRING(16) })
  color: string;

  @BelongsToMany(() => Entry, () => TagOfEntry)
  entries: Entry[];
}
