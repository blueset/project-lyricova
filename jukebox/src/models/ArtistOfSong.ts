import { VDBArtistRoleType, ArtistForSongContract } from "vocadb";
import { Song } from "./Song";
import { Artist } from "./Artist";
import { CreatedAt, UpdatedAt, DeletedAt, AllowNull, Column, Default, PrimaryKey, AutoIncrement, Table, Model, Unique, BelongsTo, ForeignKey } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { SIMPLE_ENUM_ARRAY } from "../utils/sequelizeAdditions";

@Table
export class ArtistOfSong extends Model<ArtistOfSong> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  artistOfSongId: number;

  @Unique
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
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

  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  customName: string | null;

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

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  /** Incomplete build. */
  static artistFromVocaDB(entity: ArtistForSongContract): Artist & { ArtistOfSong: ArtistOfSong } {
    const artist = Artist.fromVocaDBArtistContract(entity.artist) as (Artist & { ArtistOfSong: ArtistOfSong });
    artist.ArtistOfSong = ArtistOfSong.build({
      vocaDbId: entity.id,
      artistRoles: entity.effectiveRoles.split(", ") as VDBArtistRoleType[],
      customName: entity.isCustomName ? entity.name : null,
      isSupport: entity.isSupport,
    });
    return artist;
  }
}
