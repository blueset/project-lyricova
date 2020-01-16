import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  PrimaryColumn,
  ManyToOne,
  OneToMany
} from "typeorm";
import { ArtistForApiContract, VDBArtistCategoryType } from "vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { ArtistOfAlbum } from "./ArtistOfAlbum";

@Entity()
export class Artist extends BaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", length: 4096 })
  name: string;

  @Column({ type: "varchar", length: 4096 })
  sortOrder: string;

  @Column({
    type: "enum",
    enum: [
      "Nothing",
      "Vocalist",
      "Producer",
      "Animator",
      "Label",
      "Circle",
      "Other",
      "Band",
      "Illustrator",
      "Subject"
    ],
    default: "Nothing"
  })
  type: VDBArtistCategoryType;

  @ManyToOne(
    () => ArtistOfSong,
    artistOfSong => artistOfSong.artist
  )
  artistsOfSong: ArtistOfSong[];

  @ManyToOne(
    () => ArtistOfAlbum,
    artistOfAlbum => artistOfAlbum.artist
  )
  artistsOfAlbum: ArtistOfAlbum[];

  @ManyToOne(
    () => Artist,
    artist => artist.derivedVoiceBank
  )
  baseVoiceBank: Artist | null;

  @OneToMany(
    () => Artist,
    artist => artist.baseVoiceBank
  )
  derivedVoiceBank: Artist[];

  @Column({ type: "json", nullable: true })
  vocaDbJson: ArtistForApiContract | null;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
