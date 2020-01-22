import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  PrimaryColumn,
  ManyToOne
} from "typeorm";
import { SongInAlbum } from "./SongInAlbum";
import { AlbumForApiContract } from "vocadb";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { MusicFile } from "./MusicFile";

@Entity()
export class Album extends BaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", length: 4096 })
  name: string;

  @Column({ type: "varchar", length: 4096 })
  sortOrder: string;

  @ManyToOne(
    () => SongInAlbum,
    songInAlbum => songInAlbum.album
  )
  songsInAlbum: SongInAlbum[];

  @ManyToOne(
    () => ArtistOfAlbum,
    artistOfAlbum => artistOfAlbum.album
  )
  artistsOfAlbum: ArtistOfAlbum[];

  @ManyToOne(
    () => MusicFile,
    musicFile => musicFile.album
  )
  files: MusicFile[];

  @Column({ type: "json", nullable: true })
  vocaDbJson: AlbumForApiContract | null;

  @Column({ default: true })
  incomplete: boolean;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
