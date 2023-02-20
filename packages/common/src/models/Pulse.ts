import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { Entry } from "./Entry";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@Table
export class Pulse extends Model<Pulse> {
  @Field((type) => ID)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataType.INTEGER() })
  id: number;

  @ForeignKey(() => Entry)
  @Column
  entryId: number;

  @BelongsTo(() => Entry)
  entry: Entry;

  @Field()
  @CreatedAt
  creationDate: Date;
}
