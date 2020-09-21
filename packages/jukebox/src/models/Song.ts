import { MusicFile } from "./MusicFile";
import { VideoFile } from "./VideoFile";
import { SongForApiContract } from "../types/vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { SongInAlbum } from "./SongInAlbum";
import { Entry } from "./Entry";
import { transliterate } from "../utils/transliterate";
import { DataTypes } from "sequelize";
import { Includeable } from "sequelize/types";
import {
  Model,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Column,
  Table,
  BelongsTo,
  PrimaryKey,
  ForeignKey,
  HasMany,
  AllowNull,
  BelongsToMany,
  Index
} from "sequelize-typescript";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { SongOfEntry } from "./SongOfEntry";
import { ObjectType, Int, Field } from "type-graphql";

@ObjectType()
@Table
export class Song extends Model<Song> {
  @Field(() => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  public id!: number;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  @Index({
    name: "Song_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  public name!: string;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  @Index({
    name: "Song_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  public sortOrder!: string;

  @BelongsToMany(
    () => Artist,
    () => ArtistOfSong
  )
  artists: Array<Artist & { ArtistOfSong: ArtistOfSong }>;

  @BelongsToMany(
    () => Album,
    () => SongInAlbum
  )
  albums: Array<Album & { SongInAlbum: SongInAlbum }>;

  @Field(() => Int, { nullable: true })
  @AllowNull
  @ForeignKey(() => Song)
  @Column({ type: DataTypes.INTEGER })
  originalId!: number | null;

  @BelongsTo(() => Song, "originalId")
  original: Song | null;

  @HasMany(() => Song, "originalId")
  readonly derivedSongs: Song[];

  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson!: SongForApiContract | null;

  @HasMany(() => VideoFile)
  videos: VideoFile[];

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  coverPath!: string | null;

  @HasMany(() => MusicFile)
  files: MusicFile[];

  @BelongsToMany(() => Entry, () => SongOfEntry)
  lyricovaEntries: Array<Entry & { SongOfEntry: SongOfEntry }>;

  @Field()
  @Column({ type: DataTypes.BOOLEAN, defaultValue: true })
  incomplete!: boolean;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  static async saveFromVocaDBEntity(entity: SongForApiContract, original: Song | null): Promise<Song> {
    const include: Includeable[] = [Artist, Album];
    if (original !== null) {
      include.push({ model: Song, as: "original" });
    }
    /* const inserted: boolean = */
    await Song.upsert({
      id: entity.id,
      name: entity.name,
      sortOrder: transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      incomplete: false,
    });

    const song = await Song.findByPk(entity.id);
    if (original !== null) {
      await song.$set("original", original);
    }

    const artists = await Promise.all(entity.artists.map(x => ArtistOfSong.artistFromVocaDB(x))),
      albums = await Promise.all(entity.albums.map(x => SongInAlbum.albumFromVocaDB(entity, x)));
    // await Promise.all(artists.map(x => x.save()));
    // await Promise.all(albums.map(x => x.save()));
    await song.$set("artists", artists);
    await song.$set("albums", albums);
    return song;
  }
}
