import { Song } from "./Song";
import { User } from "./User";
import { Tag } from "./Tag";
import { Verse } from "./Verse";
import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  HasMany,
  AllowNull,
  Sequelize,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { SongOfEntry } from "./SongOfEntry";
import { TagOfEntry } from "./TagOfEntry";
import { Pulse } from "./Pulse";
import { ObjectType, Field } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     Entry:
 *       type: object
 *       description: A Lyricova blog entry.
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         title:
 *           type: string
 *           maxLength: 512
 *           example: "初音ミクの消失 -DEAD END-"
 *         producersName:
 *           type: string
 *           maxLength: 1024
 *           example: "cosMo@暴走P"
 *         vocalistsName:
 *           type: string
 *           maxLength: 1024
 *           example: "初音ミク"
 *         authorId:
 *           type: integer
 *           format: int64
 *         comment:
 *           oneOf:
 *             - type: string
 *               maxLength: 2048
 *             - type: 'null'
 *         recentActionDate:
 *           type: string
 *           format: date-time
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
 *         - title
 *         - producersName
 *         - vocalistsName
 *         - authorId
 */
@ObjectType({ description: "A Lyricova entry." })
@Table({ modelName: "Entry" })
export class Entry extends Model<Entry> {
  @Field()
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(512) })
  title: string;

  @Field()
  @Column({ type: new DataTypes.STRING(1024) })
  producersName: string;

  @Field()
  @Column({ type: new DataTypes.STRING(1024) })
  vocalistsName: string;

  @BelongsToMany(() => Song, () => SongOfEntry)
  songs: Array<Song & { SongOfEntry: SongOfEntry }>;

  @Field()
  @ForeignKey(() => User)
  @Column
  authorId: number;

  @Field()
  @BelongsTo((type) => User, "authorId")
  author: User;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: "text" })
  comment: string;

  @BelongsToMany(() => Tag, () => TagOfEntry)
  tags: Array<Tag & { TagOfEntry: TagOfEntry }>;

  @HasMany((type) => Verse)
  verses: Verse[];

  @HasMany((type) => Pulse)
  pulses: Pulse[];

  @Field()
  @Column({
    type: new DataTypes.DATE(),
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP()"),
  })
  recentActionDate: Date;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
