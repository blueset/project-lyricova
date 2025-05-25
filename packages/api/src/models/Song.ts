import { MusicFile } from "./MusicFile";
import { VideoFile } from "./VideoFile";
import type { ArtistForApiContract, SongForApiContract } from "../types/vocadb";
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
import { processUtaiteDbAlbum, processUtaiteDbArtist } from "../utils/vocadb";

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

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  utaiteDbId: number | null;

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

  private static selectPreferredThumbUrl(
    vocaDbJson: SongForApiContract | undefined
  ): string | undefined {
    if (vocaDbJson === undefined) return undefined;
    if (vocaDbJson.pvs?.length) {
      const candidate = vocaDbJson.pvs.find(
        (p) => p.service === "Youtube" && p.pvType === "Original" && p.thumbUrl
      )?.thumbUrl;
      if (candidate) return candidate;
    }
    return vocaDbJson.thumbUrl;
  }

  static async saveFromVocaDBEntity(
    entity: SongForApiContract,
    original: Song | null,
    intermediate = false
  ): Promise<Song | null> {
    // import { transliterate } from "../utils/transliterate";
    const { transliterate } = await import("../utils/transliterate.js");
    await Song.upsert({
      id: entity.id,
      name: entity.name,
      sortOrder: await transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      coverUrl: Song.selectPreferredThumbUrl(entity),
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

  static async saveFromUtaiteDBEntity(
    entity: SongForApiContract,
    original: Song | null,
    intermediate = false
  ): Promise<Song | null> {
    const { transliterate } = await import("../utils/transliterate.js");

    let dbId =
      (await Song.findOne({ where: { utaiteDbId: entity.id } }))?.id ??
      undefined;
    if (dbId === undefined) {
      while (true) {
        dbId = _.random(-2147483648, -1, false);
        const existing = await Song.findByPk(dbId);
        if (existing === null) break; // found an unused ID
      }
    }

    await Song.upsert({
      id: dbId,
      name: entity.name,
      sortOrder: await transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      coverUrl: Song.selectPreferredThumbUrl(entity),
      utaiteDbId: entity.id,
      incomplete: intermediate,
    });

    const song = await Song.findByPk(dbId);
    if (original !== null) {
      await song?.$set("original", original);
    }

    const artists = (
      await Promise.all(
        (entity.artists ?? [])
          .filter((x) => x.artist)
          .map(async (x) => {
            const { artist, type, isNew } = await processUtaiteDbArtist(
              x.artist
            );
            let result: Artist | null = null;
            if (type === "vocaDb") {
              result = await ArtistOfSong.artistFromVocaDB({ ...x, artist });
              if (isNew) {
                await Artist.update(
                  { utaiteDbId: x.artist.id },
                  { where: { id: result.id } }
                );
              }
            } else {
              result = await ArtistOfSong.artistFromUtaiteDB({ ...x, artist });
            }
            return result;
          })
      )
    ).filter((x): x is Artist => x !== null);

    const albums = await Promise.all(
      (entity.albums ?? []).map(async (x) => {
        const { album, type, isNew } = await processUtaiteDbAlbum(x);
        let result: Album | null = null;
        if (type === "vocaDb") {
          result = await SongInAlbum.albumFromVocaDB(entity, album);
          if (isNew) {
            await Album.update(
              { utaiteDbId: x.id },
              { where: { id: result.id } }
            );
          }
        } else {
          result = await SongInAlbum.albumFromUtaiteDB(entity, album);
        }
        return result;
      })
    );

    await song?.$set("artists", artists);
    await song?.$set("albums", albums);
    return song;
  }
}
