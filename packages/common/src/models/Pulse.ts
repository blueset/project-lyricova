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
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Table({ updatedAt: false })
export class Pulse extends Model<Pulse> {
  @Field((type) => Int)
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
