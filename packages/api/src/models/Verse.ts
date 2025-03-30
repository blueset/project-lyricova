import { Entry } from "./Entry";
import {
  Model,
  PrimaryKey,
  Table,
  Column,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BelongsTo,
  ForeignKey,
  AllowNull,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@Table({ modelName: "Verse" })
export class Verse extends Model<Verse> {
  @Field()
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(64) })
  language: string;

  @Field()
  @Column({ type: DataTypes.BOOLEAN })
  isOriginal: boolean;

  @Field()
  @Column({ type: DataTypes.BOOLEAN })
  isMain: boolean;

  @Field()
  @Column({ type: new DataTypes.TEXT() })
  text: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.TEXT() })
  html: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.TEXT() })
  stylizedText: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.TEXT() })
  translator: string;

  @Field((type) => [[[String]]])
  @Column({ type: DataTypes.JSON })
  typingSequence: [string, string][][];

  @ForeignKey(() => Entry)
  @Column
  entryId: number;

  @BelongsTo(() => Entry)
  entry: Entry;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
