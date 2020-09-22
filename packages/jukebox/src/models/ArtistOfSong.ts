import { ArtistForSongContract, VDBArtistCategoryType, VDBArtistRoleType } from "../types/vocadb";
import { Song } from "./Song";
import { Artist } from "./Artist";
import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt
} from "sequelize-typescript";
import { DataTypes, ENUM } from "sequelize";
import { SIMPLE_ENUM_ARRAY_INVOCABLE } from "../utils/sequelizeAdditions";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Table
export class ArtistOfSong extends Model<ArtistOfSong> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  artistOfSongId: number;

  @Field(type => Int, { nullable: true })
  @Unique
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  vocaDbId: number | null;

  @Field(type => [String])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Column(SIMPLE_ENUM_ARRAY_INVOCABLE([
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
    ])
  )
  artistRoles: VDBArtistRoleType[];

  @Field(type => [String])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Column(SIMPLE_ENUM_ARRAY_INVOCABLE([
    "Nothing",
    "Vocalist",
    "Producer",
    "Animator",
    "Label",
    "Circle",
    "Other",
    "Band",
    "Illustrator",
    "Subject",
  ]))
  categories: VDBArtistCategoryType[];

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  customName: string | null;

  @Field()
  @Default(false)
  @Column
  isSupport: boolean;

  @BelongsTo(type => Song)
  song: Song;

  @ForeignKey(type => Song)
  @Column
  songId: number;

  @BelongsTo(type => Artist)
  artist: Artist;

  @ForeignKey(type => Artist)
  @Column
  artistId: number;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  /** Incomplete build. */
  static async artistFromVocaDB(entity: ArtistForSongContract): Promise<Artist> {
    const artist = await Artist.fromVocaDBArtistContract(entity.artist);
    const artistOfSongAttrs = {
      artistRoles: entity.effectiveRoles.split(", ") as VDBArtistRoleType[],
      categories: entity.categories.split(", ") as VDBArtistCategoryType[],
      customName: entity.isCustomName ? entity.name : null,
      isSupport: entity.isSupport,
    };
    if (artist.ArtistOfSong === undefined) {
      artist.ArtistOfSong = artistOfSongAttrs;
    } else if (artist.ArtistOfSong.set) {
      artist.ArtistOfSong.set(artistOfSongAttrs);
    }
    return artist;
  }
}
