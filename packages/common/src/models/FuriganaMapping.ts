import {
  Column,
  Model,
  Table,
  DataType,
  AllowNull,
} from "sequelize-typescript";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@Table({ updatedAt: false, createdAt: false, modelName: "FuriganaMapping" })
export class FuriganaMapping extends Model<FuriganaMapping> {
  @Field()
  @Column({ type: new DataType.STRING(128), primaryKey: true })
  text: string;

  @Field()
  @Column({ type: new DataType.STRING(128), primaryKey: true })
  furigana: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataType.STRING(128) })
  segmentedText?: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataType.STRING(128) })
  segmentedFurigana?: string;
}
