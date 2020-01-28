import { VDBArtistRoleType, ArtistForSongContract } from "vocadb";
import { Song } from "./Song";
import { Artist } from "./Artist";
import { CreatedAt, UpdatedAt, DeletedAt, AllowNull, Column, Default, PrimaryKey, AutoIncrement, Table, Model, Unique, BelongsTo, ForeignKey } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { SIMPLE_ENUM_ARRAY } from "../utils/sequelizeAdditions";

@Table
export class ArtistOfSong extends Model<ArtistOfSong> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  @AutoIncrement
  artistOfSongId: number;

  @Column({ type: DataTypes.INTEGER })
  @Unique
  @AllowNull
  vocaDbId: number | null;

  @Column({
    type: new SIMPLE_ENUM_ARRAY(["Default",
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
      "VocalDataProvider"])
  })
  artistRoles: VDBArtistRoleType[];

  @Column({ type: new DataTypes.STRING(4096) })
  @AllowNull
  customName: string | null;

  @Column
  @Default(false)
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

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

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
