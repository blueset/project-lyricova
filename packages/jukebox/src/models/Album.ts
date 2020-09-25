
import { SongInAlbum } from "./SongInAlbum";
import { AlbumForApiContract, AlbumContract, SongForApiContract } from "../types/vocadb";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { MusicFile } from "./MusicFile";
import { transliterate } from "../utils/transliterate";
import {
  HasMany,
  Table,
  Model,
  Column,
  PrimaryKey,
  BelongsToMany,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Default,
  AllowNull,
  Index
} from "sequelize-typescript";
import { Song } from "./Song";
import { DataTypes } from "sequelize";
import { ObjectType, Field, Int } from "type-graphql";
import { Artist } from "./Artist";
import { ArtistOfSong } from "./ArtistOfSong";

@ObjectType()
@Table
export class Album extends Model<Album> {
  @Field(type => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  @Index({
    name: "Album_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  name: string;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  @Index({
    name: "Album_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  sortOrder: string;

  @BelongsToMany(
    () => Song,
    () => SongInAlbum
  )
  songs: Array<Song & { SongInAlbum: SongInAlbum }>;

  @BelongsToMany(
    () => Artist,
    () => ArtistOfAlbum
  )
  artists: Array<Artist & { ArtistOfAlbum: ArtistOfAlbum }>;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  coverUrl: string;

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

  /** SongInAlbum reflected by Song.$get("albums"), added for GraphQL queries. */
  @Field(type => SongInAlbum,{nullable: true})
  SongInAlbum?: Partial<SongInAlbum>;

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

  static async saveFromVocaDBEntity(entity: AlbumForApiContract): Promise<Album> {
    await Album.upsert({
      id: entity.id,
      name: entity.name,
      sortOrder: transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      coverPath: entity.mainPicture?.urlOriginal ?? null,
      incomplete: false,
    });

    const album = await Album.findByPk(entity.id);

    const artists = await Promise.all(entity.artists.map(x => ArtistOfAlbum.artistFromVocaDB(x))),
      tracks = await Promise.all(entity.tracks.map(x => SongInAlbum.songFromVocaDB(x)));
    await album.$set("artists", artists);
    await album.$set("songs", tracks);
    return album;
  }
}
