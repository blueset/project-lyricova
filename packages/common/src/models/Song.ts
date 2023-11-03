import { MusicFile } from "./MusicFile";
import { VideoFile } from "./VideoFile";
import { SongForApiContract } from "../types/vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { SongInAlbum } from "./SongInAlbum";
import { Entry } from "./Entry";
import { DataTypes } from "sequelize";
import {
  AllowNull,
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DeletedAt,
  ForeignKey,
  HasMany,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { SongOfEntry } from "./SongOfEntry";
import { Field, Int, ObjectType } from "type-graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import _ from "lodash";

@ObjectType()
@Table({ modelName: "Song" })
export class Song extends Model<Song, Partial<Song>> {
  @Field(() => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
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

  @BelongsToMany(() => Artist, () => ArtistOfSong)
  artists: Array<Artist & { ArtistOfSong: ArtistOfSong }>;

  @BelongsToMany(() => Album, () => SongInAlbum)
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

  @Field((type) => GraphQLJSONObject)
  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson!: SongForApiContract | null;

  @HasMany(() => VideoFile)
  videos: VideoFile[];

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  coverUrl?: string;

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

  /** ArtistOfSong reflected by Album.$get("songs"), added for GraphQL queries. */
  @Field((type) => SongInAlbum, { nullable: true })
  SongInAlbum?: Partial<SongInAlbum>;

  static async saveFromVocaDBEntity(
    entity: SongForApiContract,
    original: Song | null,
    intermediate = false
  ): Promise<Song | null> {
    // import { transliterate } from "../utils/transliterate";
    const { transliterate } = await import("../utils/transliterate");
    await Song.upsert({
      id: entity.id,
      name: entity.name,
      sortOrder: await transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      coverUrl: entity.thumbUrl,
      incomplete: intermediate,
    });

    const song = await Song.findByPk(entity.id);
    if (original !== null) {
      await song?.$set("original", original);
    }

    const artists = (
        await Promise.all(
          (entity.artists ?? []).map((x) => ArtistOfSong.artistFromVocaDB(x))
        )
      ).filter((x): x is Artist => x !== null),
      albums = await Promise.all(
        (entity.albums ?? []).map((x) => SongInAlbum.albumFromVocaDB(entity, x))
      );
    await song?.$set("artists", artists);
    await song?.$set("albums", albums);
    return song;
  }
}
