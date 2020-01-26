import {
  Entity,
  BaseEntity,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import { VDBArtistRoleType, VDBArtistCategoryType } from "vocadb";
import { Artist } from "./Artist";
import { Album } from "./Album";

const ROLES = [
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
];
const CATEGORIES = [
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
];

@Entity()
export class ArtistOfAlbum extends BaseEntity {
  @PrimaryGeneratedColumn()
  artistOfAlbumId: number;

  @Column({
    type: "simple-array"
  })
  roles: VDBArtistRoleType[];

  @Column({
    type: "simple-array"
  })
  effectiveRoles: VDBArtistRoleType[];

  @Column({
    type: "enum",
    enum: CATEGORIES,
    default: "Nothing"
  })
  categories: VDBArtistCategoryType;

  @ManyToOne(
    () => Album,
    album => album.artistsOfAlbum,
    { cascade: ["insert", "update"] }
  )
  album: Album;

  @ManyToOne(
    () => Artist,
    artist => artist.artistsOfAlbum,
    { cascade: ["insert", "update"] }
  )
  artist: Artist;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
