import { Entity, BaseEntity, PrimaryColumn, Column, ManyToMany } from "typeorm";
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
  files: MusicFile[];
}
