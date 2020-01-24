import {
  Entity,
  BaseEntity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import { VDBArtistRoleType, ArtistForSongContract } from "vocadb";
import { Song } from "./Song";
import { Artist } from "./Artist";

@Entity()
export class ArtistOfSong extends BaseEntity {
  @PrimaryGeneratedColumn()
  artistOfSongId: number;

  @Column({ type: "int", nullable: true, unique: true })
  vocaDbId: number | null;

  @Column({
    type: "simple-array"
  })
  artistRoles: VDBArtistRoleType[];

  @Column({ type: "varchar", length: 4096, nullable: true })
  customName: string | null;

  @Column({ default: false })
  isSupport: boolean;

  @ManyToOne(
    type => Song,
    song => song.artistsOfSong
  )
  song: Song;

  @ManyToOne(
    type => Artist,
    artist => artist.artistsOfSong
  )
  artist: Artist;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;

  /** Incomplete build. */
  static fromVocaDBEntity(song: Song, entity: ArtistForSongContract): ArtistOfSong {
    const obj = new ArtistOfSong();
    Object.assign<ArtistOfSong, Partial<ArtistOfSong>>(obj, {
      vocaDbId: entity.id,
      artistRoles: entity.effectiveRoles.split(", ") as VDBArtistRoleType[],
      customName: entity.isCustomName ? entity.name : null,
      isSupport: entity.isSupport,
      artist: Artist.fromVocaDBArtistContract(entity.artist)
    });
    return obj;
  }
}
