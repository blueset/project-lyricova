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
import { Song } from "./Song";
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
    type: "enum",
    enum: ROLES,
    default: "Default"
  })
  roles: VDBArtistRoleType;

  @Column({
    type: "enum",
    enum: ROLES,
    default: "Default"
  })
  effectiveRoles: VDBArtistRoleType;

  @Column({
    type: "enum",
    enum: CATEGORIES,
    default: "Nothing"
  })
  categories: VDBArtistCategoryType;

  @ManyToOne(
    type => Album,
    album => album.artistsOfAlbum
  )
  album: Album;

  @ManyToOne(
    type => Artist,
    artist => artist.artistsOfAlbum
  )
  artist: Artist;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;
}
