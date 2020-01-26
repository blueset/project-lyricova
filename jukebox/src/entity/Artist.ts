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
import { ArtistForApiContract, ArtistContract, VDBArtistType } from "vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { transliterate } from "../utils/transliterate";

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
      "Unknown",
      "Circle",
      "Label",
      "Producer",
      "Animator",
      "Illustrator",
      "Lyricist",
      "Vocaloid",
      "UTAU",
      "CeVIO",
      "OtherVoiceSynthesizer",
      "OtherVocalist",
      "OtherGroup",
      "OtherIndividual",
      "Utaite",
      "Band",
      "Vocalist",
      "Character",
    ],
    default: "Unknown"
  })
  type: VDBArtistType;

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
    artist => artist.derivedVoiceBank,
    { cascade: ["insert", "update"] }
  )
  baseVoiceBank: Artist | null;

  @OneToMany(
    () => Artist,
    artist => artist.baseVoiceBank
  )
  derivedVoiceBank: Artist[];

  @Column({ type: "json", nullable: true })
  vocaDbJson: ArtistForApiContract | null;

  @Column({ default: true })
  incomplete: boolean;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;

  /** incomplete entity */
  static fromVocaDBArtistContract(artist: ArtistContract): Artist {
    const obj = new Artist();
    Object.assign<Artist, Partial<Artist>>(obj, {
      id: artist.id,
      name: artist.name,
      sortOrder: transliterate(artist.name),
      type: artist.artistType,
      incomplete: true
    });
    return obj;
  }
}
