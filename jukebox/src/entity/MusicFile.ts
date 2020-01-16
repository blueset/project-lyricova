import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  PrimaryColumn,
  ManyToOne
} from "typeorm";
import { Song } from "./Song";

@Entity()
export class MusicFile extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 65535 })
  path: string;

  @Column({ type: "int", unsigned: true })
  fileSize: number;

  @ManyToOne(
    () => Song,
    song => song.files,
    { nullable: true }
  )
  song: Song | null;

  @ManyToOne(
    () => Album,
    album => album.files,
    { nullable: true }
  )
  album: Album | null;

  @Column({ type: "varchar", nullable: true, length: 4096 })
  trackName: string | null;

  @Column({ type: "varchar", nullable: true, length: 4096 })
  trackSortOrder: string | null;

  @Column({ type: "varchar", nullable: true, length: 4096 })
  albumName: string | null;

  @Column({ type: "varchar", nullable: true, length: 4096 })
  albumSortOrder: string | null;

  @Column({ type: "varchar", nullable: true, length: 4096 })
  artistName: string | null;

  @Column({ type: "varchar", nullable: true, length: 4096 })
  artistSortOrder: string | null;

  @Column()
  hasLyrics: boolean;

  @Column()
  needReview: boolean;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
