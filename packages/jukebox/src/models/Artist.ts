
import { ArtistForApiContract, ArtistContract, VDBArtistType } from "../types/vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { transliterate } from "../utils/transliterate";
import { DataTypes } from "sequelize";
import { Table, Column, Model, PrimaryKey, BelongsToMany, AllowNull, ForeignKey, BelongsTo, Default, CreatedAt, UpdatedAt, DeletedAt, HasMany } from "sequelize-typescript";
import { Song } from "./Song";
import { Album } from "./Album";
import { Field, Int, ObjectType } from "type-graphql";
import { GraphQLJSONObject } from "graphql-type-json";

@ObjectType()
@Table
export class Artist extends Model<Artist> {
  @Field(() => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  name: string;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  sortOrder: string;

  @Field()
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
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  public baseVoiceBankId!: number | null;

  @BelongsTo(type => Artist, "baseVoiceBankId")
  public baseVoiceBank: Artist | null;

  @HasMany(type => Artist, "baseVoiceBankId")
  public readonly derivedVoiceBanks: Artist[];

  @Field(type => GraphQLJSONObject)
  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson: ArtistForApiContract | null;

  @Field()
  @Default(true)
  @Column({ type: DataTypes.BOOLEAN })
  incomplete: boolean;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;


  /** ArtistOfSong reflected by Song.$get("albums"), added for GraphQL queries. */
  @Field(type => ArtistOfSong,{nullable: true})
  ArtistOfSong?: Partial<ArtistOfSong>;

  /** incomplete entity */
  static async fromVocaDBArtistContract(artist: ArtistContract): Promise<Artist> {
    const obj = (await Artist.findOrCreate({
      where: { id: artist.id },
      defaults: {
        name: artist.name,
        sortOrder: transliterate(artist.name),
        type: artist.artistType
      },
    }))[0];
    return obj;
  }
}
