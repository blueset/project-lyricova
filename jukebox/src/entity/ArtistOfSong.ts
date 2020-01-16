import {
  Entity,
  BaseEntity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import { VDBArtistRoleType } from "vocadb";
import { Song } from "./Song";
import { Artist } from "./Artist";

@Entity()
export class ArtistOfSong extends BaseEntity {
  @PrimaryGeneratedColumn()
  artistOfSongId: number;

  @Column({ type: "int", nullable: true })
  vocaDbId: number | null;

  @Column({
    type: "enum",
    enum: [
      "Default",
      "Animator",
      "Arranger",
      "Composer",
      "Distributor",
      "Illustrator",
      "Instrumentalist",
      "Lyricist",
      "Mastering",
      "Publisher",
      "Vocalist",
      "VoiceManipulator",
      "Other",
      "Mixer",
      "Chorus",
      "Encoder",
      "VocalDataProvider"
    ],
    default: "Default"
  })
  artistRole: VDBArtistRoleType;

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
}
