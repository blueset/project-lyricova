import { SongInAlbum } from "./SongInAlbum";
import type { AlbumForApiContract, AlbumContract } from "../types/vocadb";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { MusicFile } from "./MusicFile";
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
  Index,
} from "sequelize-typescript";
import { Song } from "./Song";
import { DataTypes } from "sequelize";
import { ObjectType, Field, Int } from "type-graphql";
import { Artist } from "./Artist";
import _ from "lodash";
import { processUtaiteDbArtist } from "../utils/vocadb";

@ObjectType()
@Table({ modelName: "Album" })
export class Album extends Model<Album, Partial<Album>> {
  @Field((type) => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
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

  @BelongsToMany(() => Song, () => SongInAlbum)
  songs: Array<Song & { SongInAlbum: SongInAlbum }>;

  @BelongsToMany(() => Artist, () => ArtistOfAlbum)
  artists: Array<Artist & { ArtistOfAlbum: ArtistOfAlbum }>;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  coverUrl?: string;

  @HasMany(() => MusicFile)
  files: MusicFile[];

  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson: AlbumForApiContract | null;

  @Field()
  @Default(true)
  @Column({ type: DataTypes.BOOLEAN })
  incomplete: boolean;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  utaiteDbId: number | null;

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
  @Field((type) => SongInAlbum, { nullable: true })
  SongInAlbum?: Partial<SongInAlbum>;

  /** Incomplete build. */
  static async fromVocaDBAlbumContract(entity: AlbumContract): Promise<Album> {
    const { transliterate } = await import("../utils/transliterate.js");

    const obj = (
      await Album.findOrCreate({
        where: { id: entity.id },
        defaults: {
          name: entity.name,
          sortOrder: await transliterate(entity.name),
          incomplete: true,
        },
      })
    )[0];
    return obj;
  }

  /** Incomplete build. */
  static async fromUtaiteDBAlbumContract(
    entity: AlbumContract
  ): Promise<Album> {
    const { transliterate } = await import("../utils/transliterate.js");

    let dbId =
      (await Album.findOne({ where: { utaiteDbId: entity.id } }))?.id ??
      undefined;
    if (dbId === undefined) {
      while (true) {
        dbId = _.random(-2147483648, -1, false);
        const existing = await Album.findByPk(dbId);
        if (existing === null) break; // found an unused ID
      }
    }

    const obj = (
      await Album.findOrCreate({
        where: { id: dbId },
        defaults: {
          name: entity.name,
          sortOrder: await transliterate(entity.name),
          utaiteDbId: entity.id,
          incomplete: true,
        },
      })
    )[0];
    return obj;
  }

  static async saveFromVocaDBEntity(
    entity: AlbumForApiContract
  ): Promise<Album | null> {
    const { transliterate } = await import("../utils/transliterate.js");
    await Album.upsert({
      id: entity.id,
      name: entity.name,
      sortOrder: await transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      coverUrl: entity.mainPicture?.urlOriginal,
      incomplete: false,
    });

    const album = await Album.findByPk(entity.id);
    const artists = await Promise.all(
        (entity.artists ?? [])
          .filter((x) => x.artist)
          .map((x) => ArtistOfAlbum.artistFromVocaDB(x))
      ),
      tracks = (
        await Promise.all(
          (entity.tracks ?? [])
            .filter((x) => x.song)
            .map((x) => SongInAlbum.songFromVocaDB(x))
        )
      ).filter((t): t is Song => t !== null);
    await album?.$set(
      "artists",
      _.uniqBy(artists, (a) => a.id)
    );
    await album?.$set(
      "songs",
      _.uniqBy(tracks, (t) => t.id)
    );
    return album;
  }

  static async saveFromUtaiteDBEntity(
    entity: AlbumForApiContract,
    trackEntities: Song[]
  ): Promise<Album | null> {
    const { transliterate } = await import("../utils/transliterate.js");

    let dbId =
      (await Album.findOne({ where: { utaiteDbId: entity.id } }))?.id ??
      undefined;
    if (dbId === undefined) {
      while (true) {
        dbId = _.random(-2147483648, -1, false);
        const existing = await Album.findByPk(dbId);
        if (existing === null) break; // found an unused ID
      }
    }

    await Album.upsert({
      id: dbId,
      name: entity.name,
      sortOrder: await transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      coverUrl: entity.mainPicture?.urlOriginal,
      utaiteDbId: entity.id,
      incomplete: false,
    });

    const album = await Album.findByPk(dbId);

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
              result = await ArtistOfAlbum.artistFromVocaDB({ ...x, artist });
              if (isNew) {
                await Artist.update(
                  { utaiteDbId: x.artist.id },
                  { where: { id: result.id } }
                );
              }
            } else {
              result = await ArtistOfAlbum.artistFromUtaiteDB({ ...x, artist });
            }
            return result;
          })
      )
    ).filter((x): x is Artist => x !== null);

    const trackEntitiesMap = new Map(
      trackEntities.map((x) => [x.utaiteDbId, x])
    );

    const tracks = (
      await Promise.all(
        (entity.tracks ?? [])
          .filter((x) => x.song)
          .map(async (x) => {
            const result = await SongInAlbum.songFromUtaiteDB(
              x,
              trackEntitiesMap.get(x.song.id)
            );
            return result;
          })
      )
    ).filter((t): t is Song => t !== null);

    await album?.$set(
      "artists",
      _.uniqBy(artists, (a) => a.id)
    );
    await album?.$set(
      "songs",
      _.uniqBy(tracks, (t) => t.id)
    );
    return album;
  }
}
