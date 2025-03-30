import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { User } from "./User";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Table({ modelName: "UserPublicKeyCredential" })
export class UserPublicKeyCredential extends Model<UserPublicKeyCredential> {
  @Field()
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id?: number;

  @Field()
  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo((type) => User, "userId")
  user?: User;

  @Unique
  @Column({ type: new DataTypes.STRING(512) })
  externalId: string;

  @Column({ type: new DataTypes.TEXT() })
  publicKey: string;

  @Field({ nullable: true })
  @Column({ type: new DataTypes.TEXT(), defaultValue: null })
  remarks?: string;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;
}
