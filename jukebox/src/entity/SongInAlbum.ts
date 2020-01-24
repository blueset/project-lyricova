import {
  Entity,
  BaseEntity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import { Song } from "./Song";
import { Album } from "./Album";
import { AlbumContract } from "vocadb";

@Entity()
export class SongInAlbum extends BaseEntity {
  @PrimaryGeneratedColumn()
  songInAlbumId: number;

  @Column({ type: "int", nullable: true, unique: true })
  vocaDbId: number | null;

  @Column({ type: "int", nullable: true })
  diskNumber: number | null;

  @Column({ type: "int", nullable: true })
  trackNumber: number | null;

  @Column({ type: "varchar", length: 2048, nullable: true })
  name: string | null;

  @ManyToOne(
    () => Song,
    song => song.songsInAlbum
  )
  song: Song;

  @ManyToOne(
    () => Album,
    album => album.songsInAlbum
  )
  album: Album;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;

  /** Incomplete build. */
  static fromVocaDBAlbumEntity(song: Song, entity: AlbumContract): SongInAlbum {
    const obj = new SongInAlbum();
    Object.assign<SongInAlbum, Partial<SongInAlbum>>(obj, {
      name: song.name,
      // song: song,
      album: Album.fromVocaDBAlbumContract(entity)
    });
    return obj;
  }
}
