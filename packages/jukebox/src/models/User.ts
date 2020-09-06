import { Model, Table, Column, PrimaryKey, AutoIncrement, CreatedAt, UpdatedAt, DeletedAt, Default } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Table
export class User extends Model<User> {
  @Field(type => Int)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(256), unique: true })
  username: string;

  @Field()
  @Column({ type: new DataTypes.STRING(256) })
  displayName: string;

  @Column({ type: new DataTypes.STRING(256) })
  password: string;

  @Field()
  @Column({ type: new DataTypes.STRING(512), unique: true })
  email: string;

  @Field()
  @Default("guest")
  @Column({ type: new DataTypes.ENUM("admin", "guest") })
  role: "admin" | "guest";

  @Column({ type: new DataTypes.STRING(256) })
  provider: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  provider_id: string | null;

  @Field()
  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  @Field()
  get emailMD5(): string {
    return crypto.createHash("md5").update(this.email || "").digest("hex");
  }

  public async checkPassword(plaintextPassword: string): Promise<boolean> {
    return await bcrypt.compare(plaintextPassword, this.password);
  }
}
