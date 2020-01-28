
import { ArtistForApiContract, ArtistContract, VDBArtistType } from "vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { transliterate } from "../utils/transliterate";
import { DataTypes } from "sequelize";
import { Table, Column, Model, PrimaryKey, BelongsToMany, AllowNull, ForeignKey, BelongsTo, Default, CreatedAt, UpdatedAt, DeletedAt, HasMany } from "sequelize-typescript";
import { Song } from "./Song";
import { Album } from "./Album";

@Table
export class Artist extends Model<Artist> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  id: number;

  @Column({ type: new DataTypes.STRING(4096) })
  name: string;

  @Column({ type: new DataTypes.STRING(4096) })
  sortOrder: string;

  @Column({
    type: new DataTypes.ENUM(
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
    ),
    defaultValue: "Unknown"
  })
  type: VDBArtistType;

  @BelongsToMany(() => Song, () => ArtistOfSong)
  songs: Array<Song & { ArtistOfSong: ArtistOfSong }>;

  @BelongsToMany(() => Album, () => ArtistOfAlbum)
  albums: Array<Album & { ArtistOfAlbum: ArtistOfAlbum }>;

  @ForeignKey(type => Artist)
  @Column({ type: DataTypes.INTEGER })
  @AllowNull
  public baseVoiceBankId!: number | null;

  @BelongsTo(type => Artist, "baseVoiceBankId")
  public baseVoiceBank: Artist | null;

  @HasMany(type => Artist, "baseVoiceBankId")
  public readonly derivedVoiceBanks: Artist[];

  @Column({ type: DataTypes.JSON })
  @AllowNull
  vocaDbJson: ArtistForApiContract | null;

  @Column({ type: DataTypes.BOOLEAN })
  @Default(true)
  incomplete: boolean;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

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
