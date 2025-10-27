import { DataTypes } from "sequelize";
import {
  Model,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Column,
  Table,
  PrimaryKey,
  ForeignKey,
  AutoIncrement,
} from "sequelize-typescript";
import { Entry } from "./Entry";
import { Tag } from "./Tag";
import { Field, ID, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     TagOfEntry:
 *       type: object
 *       description: Junction table linking tags to entries.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         tagId:
 *           type: string
 *           maxLength: 512
 *           description: Slug of the tag
 *         entryId:
 *           type: integer
 *           format: int64
 *           description: ID of the entry
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - tagId
 *         - entryId
 */
@ObjectType()
@Table({ modelName: "TagOfEntry" })
export class TagOfEntry extends Model<TagOfEntry> {
  @Field((type) => ID)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  public id!: number;

  @ForeignKey(() => Tag)
  @Column({ type: new DataTypes.STRING(512) })
  tagId: string;

  @ForeignKey(() => Entry)
  @Column
  entryId: number;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;
}
