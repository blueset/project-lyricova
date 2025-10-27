import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Default,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ObjectType, Field, Int } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       description: A user account in the system.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         username:
 *           type: string
 *           maxLength: 256
 *           example: "admin"
 *           description: Unique username for login
 *         displayName:
 *           type: string
 *           maxLength: 256
 *           example: "Administrator"
 *           description: Display name shown to other users
 *         email:
 *           type: string
 *           maxLength: 512
 *           format: email
 *           example: "admin@example.com"
 *           description: Unique email address
 *         emailMD5:
 *           type: string
 *           description: MD5 hash of email (for Gravatar)
 *           pattern: "^[a-fA-F0-9]{32}$"
 *           readOnly: true
 *         role:
 *           type: string
 *           enum:
 *             - admin
 *             - guest
 *           description: User role determining permissions
 *         provider:
 *           type: string
 *           maxLength: 256
 *           description: OAuth provider name if using OAuth
 *         provider_id:
 *           type: string
 *           maxLength: 1024
 *           description: OAuth provider’s user ID
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *         deletionDate:
 *           oneOf:
 *             - type: string
 *               format: date-time
 *             - type: 'null'
 *       required:
 *         - id
 *         - username
 *         - displayName
 *         - email
 *         - role
 */
@ObjectType()
@Table({ modelName: "User" })
export class User extends Model<User> {
  @Field()
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
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
  provider?: string;

  @Column({ type: new DataTypes.STRING(1024) })
  provider_id?: string;

  @Field()
  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  @Field()
  get emailMD5(): string {
    return crypto
      .createHash("md5")
      .update(this.email || "")
      .digest("hex");
  }

  public async checkPassword(plaintextPassword: string): Promise<boolean> {
    return await bcrypt.compare(plaintextPassword, this.password);
  }
}
