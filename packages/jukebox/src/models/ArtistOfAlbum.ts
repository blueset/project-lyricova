
import { VDBArtistRoleType, VDBArtistCategoryType } from "../types/vocadb";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { Table, Column, PrimaryKey, AutoIncrement, Default, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, DeletedAt, Model } from "sequelize-typescript";
import { SIMPLE_ENUM_ARRAY } from "../utils/sequelizeAdditions";
import { DataTypes } from "sequelize";

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

@Table
export class ArtistOfAlbum extends Model<ArtistOfAlbum> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  artistOfAlbumId: number;

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  @Column({
    type: new SIMPLE_ENUM_ARRAY(ROLES)
  })
  roles: VDBArtistRoleType[];

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  @Column({
    type: new SIMPLE_ENUM_ARRAY(ROLES)
  })
  effectiveRoles: VDBArtistRoleType[];

  @Default("Nothing")
  @Column({
    type: DataTypes.ENUM(...CATEGORIES)
  })
  categories: VDBArtistCategoryType;

  @BelongsTo(type => Album)
  album: Album;

  @ForeignKey(type => Album)
  @Column
  albumId: number;

  @BelongsTo(type => Artist)
  artist: Artist;

  @ForeignKey(type => Artist)
  @Column
  artistId: number;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;
}
