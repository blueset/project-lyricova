
import type {
  VDBArtistRoleType,
  VDBArtistCategoryType,
  ArtistForSongContract,
  ArtistForAlbumForApiContract
} from "../types/vocadb";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { Table, Column, PrimaryKey, AutoIncrement, Default, ForeignKey, BelongsTo, CreatedAt, UpdatedAt, DeletedAt, Model } from "sequelize-typescript";
import { SIMPLE_ENUM_ARRAY } from "../utils/sequelizeAdditions";
import { DataTypes } from "sequelize";
import { Field, Int, ObjectType } from "type-graphql";

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

@ObjectType()
@Table
export class ArtistOfAlbum extends Model<ArtistOfAlbum> {
  @Field(type => Int)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  artistOfAlbumId: number;

  @Field(type => [String])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Column({
    type: new SIMPLE_ENUM_ARRAY(ROLES)
  })
  roles: VDBArtistRoleType[];

  @Field(type => [String])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Column({
    type: new SIMPLE_ENUM_ARRAY(ROLES)
  })
  effectiveRoles: VDBArtistRoleType[];

  @Field(type => String)
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

  /** Incomplete build. */
  static async artistFromVocaDB(entity: ArtistForAlbumForApiContract): Promise<Artist> {
    const artist = await Artist.fromVocaDBArtistContract(entity.artist);
    const artistOfAlbumAttrs = {
      effectiveRoles: entity.effectiveRoles.split(", ") as VDBArtistRoleType[],
      roles: entity.roles.split(", ") as VDBArtistRoleType[],
      categories: entity.categories.split(", ")[0] as VDBArtistCategoryType,
    };
    if (artist.ArtistOfAlbum === undefined) {
      artist.ArtistOfAlbum = artistOfAlbumAttrs;
    } else if (artist.ArtistOfAlbum.set) {
      artist.ArtistOfAlbum.set(artistOfAlbumAttrs);
    }
    return artist;
  }
}
