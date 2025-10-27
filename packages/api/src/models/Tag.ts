import { Entry } from "./Entry";
import {
  Model,
  Table,
  Column,
  PrimaryKey,
  BelongsToMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { TagOfEntry } from "./TagOfEntry";
import { Field, ID, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       description: A tag for categorizing entries.
 *       properties:
 *         slug:
 *           type: string
 *           maxLength: 512
 *           example: "core"
 *           description: URL-friendly identifier for the tag
 *         name:
 *           type: string
 *           maxLength: 1024
 *           example: "Core"
 *           description: Display name of the tag
 *         color:
 *           type: string
 *           maxLength: 16
 *           example: "#39c5bb"
 *           description: Hex color code for the tag
 *       required:
 *         - slug
 *         - name
 *         - color
 */
@ObjectType()
@Table({ modelName: "Tag" })
export class Tag extends Model<Tag> {
  @Field((type) => ID)
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(512) })
  slug: string;

  @Field()
  @Column({ type: new DataTypes.STRING(1024) })
  name: string;

  @Field()
  @Column({ type: new DataTypes.STRING(16) })
  color: string;

  @BelongsToMany(() => Entry, () => TagOfEntry)
  entries: Entry[];
}
