import {
  PrimaryGeneratedColumn,
  Entity,
  BaseEntity,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany
} from "typeorm";
import { Song } from "./Song";
import { User } from "./User";
import { Tag } from "./Tag";
import { Verse } from "./Verse";

@Entity()
export class Entry extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 512 })
  title: string;

  @Column({ type: "varchar", length: 1024 })
  producersName: string;

  @Column({ type: "varchar", length: 1024 })
  vocalistsName: string;

  @ManyToMany(
    type => Song,
    song => song.lyricovaEntries
  )
  songs: Song[];

  @ManyToOne(type => User)
  author: User;

  @Column({ type: "text" })
  comment: string;

  @ManyToMany(
    type => Tag,
    tag => tag.entries
  )
  tags: Tag[];

  @OneToMany(
    type => Verse,
    verse => verse.entry
  )
  verses: Verse[];

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
