
import { Song } from "./Song";
import { User } from "./User";
import { Tag } from "./Tag";
import { Verse } from "./Verse";
import { Model, Table, Column, PrimaryKey, AutoIncrement, CreatedAt, UpdatedAt, DeletedAt, BelongsToMany, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { SongOfEntry } from "./SongOfEntry";
import { TagOfEntry } from "./TagOfEntry";

@Table
export class Entry extends Model<Entry> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  @AutoIncrement
  id: number;

  @Column({ type: new DataTypes.STRING(512) })
  title: string;

  @Column({ type: new DataTypes.STRING(1024) })
  producersName: string;

  @Column({ type: new DataTypes.STRING(1024) })
  vocalistsName: string;

  @BelongsToMany(() => Song, () => SongOfEntry)
  songs: Array<Song & { SongOfEntry: SongOfEntry }>;

  @ForeignKey(() => User)
  @Column
  authorId: number;

  @BelongsTo(type => User, "authorId")
  author: User;

  @Column({ type: "text" })
  comment: string;

  @BelongsToMany(() => Tag, () => TagOfEntry)
  tags: Array<Tag & { TagOfEntry: TagOfEntry }>;

  @HasMany(type => Verse)
  verses: Verse[];

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;
}
