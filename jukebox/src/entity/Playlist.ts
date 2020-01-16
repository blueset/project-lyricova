import {
  Entity,
  BaseEntity,
  PrimaryColumn,
  Column,
  ManyToMany,
  JoinTable
} from "typeorm";
import { MusicFile } from "./MusicFile";

@Entity()
export class Playlist extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 512 })
  slug: string;

  @Column({ type: "varchar", length: 1024 })
  name: string;

  @ManyToMany(
    type => MusicFile,
    musicFile => musicFile.playlists
  )
  @JoinTable({ name: "file_in_playlist" })
  files: MusicFile[];
}
