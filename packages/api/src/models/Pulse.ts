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

/**
 * @openapi
 * components:
 *   schemas:
 *     Pulse:
 *       type: object
 *       description: A pulse on an entry.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         entryId:
 *           type: integer
 *           format: int64
 *           description: ID of the entry being pulsed
 *         creationDate:
 *           type: string
 *           format: date-time
 *           description: When the pulse was created
 *       required:
 *         - id
 *         - entryId
 *         - creationDate
 */
@ObjectType()
@Table({ updatedAt: false, modelName: "Pulse" })
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
