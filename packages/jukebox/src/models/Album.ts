
import { SongInAlbum } from "./SongInAlbum";
import { AlbumForApiContract, AlbumContract } from "../types/vocadb";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { MusicFile } from "./MusicFile";
import { transliterate } from "../utils/transliterate";
import { HasMany, Table, Model, Column, PrimaryKey, BelongsToMany, CreatedAt, UpdatedAt, DeletedAt, Default, AllowNull } from "sequelize-typescript";
import { Song } from "./Song";
import { DataTypes } from "sequelize";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Table
export class Album extends Model<Album> {
  @Field(type => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  name: string;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  sortOrder: string;

  @BelongsToMany(
    () => Song,
    () => SongInAlbum
  )
  songs: Array<Song & { SongInAlbum: SongInAlbum }>;

  @BelongsToMany(
    () => Album,
    () => ArtistOfAlbum
  )
  albums: Array<Album & { ArtistOfAlbum: ArtistOfAlbum }>;

  @HasMany(
    () => MusicFile
  )
  files: MusicFile[];

  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson: AlbumForApiContract | null;

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

  @Field()
  @DeletedAt
  deletionDate: Date;

  /** Incomplete build. */
  static async fromVocaDBAlbumContract(entity: AlbumContract): Promise<Album> {
    const obj = (await Album.findOrCreate({
      where: { id: entity.id },
      defaults: {
        name: entity.name,
        sortOrder: transliterate(entity.name),
        incomplete: true
      }
    }))[0];
    return obj;
  }
}
