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

/**
 * @openapi
 * components:
 *   schemas:
 *     UserPublicKeyCredential:
 *       type: object
 *       description: WebAuthn public key credential for passwordless authentication.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         userId:
 *           type: integer
 *           format: int64
 *           description: ID of the user who owns this credential
 *         externalId:
 *           type: string
 *           maxLength: 512
 *           description: External credential ID from WebAuthn
 *         publicKey:
 *           type: string
 *           description: Public key for the credential (base64 encoded)
 *         remarks:
 *           oneOf:
 *             - type: string
 *             - type: 'null'
 *           description: Optional remarks or nickname for this credential
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - userId
 *         - externalId
 *         - publicKey
 */
@Table({ modelName: "UserPublicKeyCredential" })
export class UserPublicKeyCredential extends Model<UserPublicKeyCredential> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id?: number;

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

  @Column({ type: new DataTypes.TEXT(), defaultValue: null })
  remarks?: string;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;
}
