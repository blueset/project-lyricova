import {
  ArtistForSongContract,
  VDBArtistCategoryType,
  VDBArtistRoleType,
} from "../types/vocadb";
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
  UpdatedAt,
} from "sequelize-typescript";
import { DataTypes, ENUM } from "sequelize";
import { SIMPLE_ENUM_ARRAY_INVOCABLE } from "../utils/sequelizeAdditions";
import { Field, Int, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     ArtistOfSong:
 *       type: object
 *       description: Junction table linking artists to songs with their roles.
 *       properties:
 *         artistOfSongId:
 *           type: integer
 *           format: int64
 *         vocaDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: VocaDB ID for this artist-song relationship
 *         artistRoles:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - Default
 *               - Animator
 *               - Arranger
 *               - Composer
 *               - Distributor
 *               - Illustrator
 *               - Instrumentalist
 *               - Lyricist
 *               - Mastering
 *               - Publisher
 *               - Vocalist
 *               - VoiceManipulator
 *               - Other
 *               - Mixer
 *               - Chorus
 *               - Encoder
 *               - VocalDataProvider
 *           description: Roles the artist has in this song
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - Nothing
 *               - Vocalist
 *               - Producer
 *               - Animator
 *               - Label
 *               - Circle
 *               - Other
 *               - Band
 *               - Illustrator
 *               - Subject
 *           description: Categories of the artist in this song
 *         customName:
 *           oneOf:
 *             - type: string
 *               maxLength: 4096
 *             - type: 'null'
 *           description: Custom name for the artist in this specific song
 *         isSupport:
 *           type: boolean
 *           description: Whether this is a support/guest artist
 *         songId:
 *           type: integer
 *           format: int64
 *         artistId:
 *           type: integer
 *           format: int64
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - artistOfSongId
 *         - artistRoles
 *         - categories
 *         - isSupport
 *         - songId
 *         - artistId
 */
@ObjectType()
@Table({ modelName: "ArtistOfSong" })
export class ArtistOfSong extends Model<ArtistOfSong> {
  @Field((type) => Int)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  artistOfSongId: number;

  @Field((type) => Int, { nullable: true })
  @Unique
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  vocaDbId: number | null;

  @Field((type) => [String])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Column(
    SIMPLE_ENUM_ARRAY_INVOCABLE([
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
      "VocalDataProvider",
    ])
  )
  artistRoles: VDBArtistRoleType[];

  @Field((type) => [String])
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Column(
    SIMPLE_ENUM_ARRAY_INVOCABLE([
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
    ])
  )
  categories: VDBArtistCategoryType[];

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  customName?: string;

  @Field()
  @Default(false)
  @Column
  isSupport: boolean;

  @BelongsTo((type) => Song)
  song: Song;

  @ForeignKey((type) => Song)
  @Column
  songId: number;

  @BelongsTo((type) => Artist)
  artist: Artist;

  @ForeignKey((type) => Artist)
  @Column
  artistId: number;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  /** Incomplete build. */
  static async artistFromVocaDB(
    entity: ArtistForSongContract
  ): Promise<Artist | null> {
    // Ignore cases where an artist entity is not found.
    if (entity.artist === undefined) return null;
    const artist = await Artist.fromVocaDBArtistContract(entity.artist);
    const artistOfSongAttrs = {
      artistRoles: entity.effectiveRoles.split(", ") as VDBArtistRoleType[],
      categories: entity.categories.split(", ") as VDBArtistCategoryType[],
      customName: entity.isCustomName ? entity.name : undefined,
      isSupport: entity.isSupport,
    };
    if (artist.ArtistOfSong === undefined) {
      artist.ArtistOfSong = artistOfSongAttrs;
    } else if (artist.ArtistOfSong.set) {
      artist.ArtistOfSong.set(artistOfSongAttrs);
    }
    return artist;
  }

  /** Incomplete build. */
  static async artistFromUtaiteDB(
    entity: ArtistForSongContract
  ): Promise<Artist | null> {
    // Ignore cases where an artist entity is not found.
    if (entity.artist === undefined) return null;
    const artist = await Artist.fromUtaiteDBArtistContract(entity.artist);
    const artistOfSongAttrs = {
      artistRoles: entity.effectiveRoles.split(", ") as VDBArtistRoleType[],
      categories: entity.categories.split(", ") as VDBArtistCategoryType[],
      customName: entity.isCustomName ? entity.name : undefined,
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
