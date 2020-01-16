import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  PrimaryColumn,
  ManyToOne,
  ManyToMany,
  PrimaryGeneratedColumn
} from "typeorm";
import { Song } from "./Song";
import { Album } from "./Album";
import { Playlist } from "./Playlist";

@Entity()
export class MusicFile extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 768, unique: true })
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

  @ManyToMany(
    type => Playlist,
    playlist => playlist.files
  )
  playlists: Playlist;

  @Column({ type: "varchar", nullable: true, length: 1024 })
  trackName: string | null;

  @Column({ type: "varchar", nullable: true, length: 1024 })
  trackSortOrder: string | null;

  @Column({ type: "varchar", nullable: true, length: 1024 })
  albumName: string | null;

  @Column({ type: "varchar", nullable: true, length: 1024 })
  albumSortOrder: string | null;

  @Column({ type: "varchar", nullable: true, length: 1024 })
  artistName: string | null;

  @Column({ type: "varchar", nullable: true, length: 1024 })
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
