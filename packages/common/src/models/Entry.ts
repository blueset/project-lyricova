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
import { ObjectType, Field, ID } from "type-graphql";

@ObjectType({ description: "A Lyricova entry." })
@Table
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

  @BelongsToMany(
    () => Song,
    () => SongOfEntry
  )
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

  @BelongsToMany(
    () => Tag,
    () => TagOfEntry
  )
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
