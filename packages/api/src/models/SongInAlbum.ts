import { Song } from "./Song";
import { Album } from "./Album";
import {
  AlbumContract,
  SongForApiContract,
  SongInAlbumForApiContract,
} from "../types/vocadb";
import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Unique,
  AllowNull,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Field, Int, ObjectType } from "type-graphql";

/**
 * @openapi
 * components:
 *   schemas:
 *     SongInAlbum:
 *       type: object
 *       description: Junction table linking songs to albums with track information.
 *       properties:
 *         songInAlbumId:
 *           type: integer
 *           format: int64
 *         vocaDbId:
 *           oneOf:
 *             - type: integer
 *               format: int64
 *             - type: 'null'
 *           description: VocaDB ID for this song-album relationship
 *         diskNumber:
 *           oneOf:
 *             - type: integer
 *             - type: 'null'
 *           description: Disk/disc number in multi-disc albums
 *         trackNumber:
 *           oneOf:
 *             - type: integer
 *             - type: 'null'
 *           description: Track number on the disc
 *         name:
 *           oneOf:
 *             - type: string
 *               maxLength: 2048
 *             - type: 'null'
 *           description: Name of the song as it appears on the album
 *         songId:
 *           type: integer
 *           format: int64
 *         albumId:
 *           type: integer
 *           format: int64
 *         creationDate:
 *           type: string
 *           format: date-time
 *         updatedOn:
 *           type: string
 *           format: date-time
 *       required:
 *         - songInAlbumId
 *         - songId
 *         - albumId
 */
@ObjectType()
@Table({ modelName: "SongInAlbum" })
export class SongInAlbum extends Model<SongInAlbum> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  songInAlbumId: number;

  @Field((type) => Int, { nullable: true })
  @Unique
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  vocaDbId: number | null;

  @Field((type) => Int, { nullable: true })
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  diskNumber: number | null;

  @Field((type) => Int, { nullable: true })
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  trackNumber: number | null;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(2048) })
  name?: string;

  @BelongsTo((type) => Song)
  song: Song;

  @ForeignKey((type) => Song)
  @Column
  songId: number;

  @BelongsTo((type) => Album)
  album: Album;

  @ForeignKey((type) => Album)
  @Column
  albumId: number;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  /**
   * Import a song-in-album relationship from a “song” query from VocaDB.
   *
   * Incomplete build.
   */
  static async albumFromVocaDB(
    song: SongForApiContract,
    entity: AlbumContract
  ): Promise<Album> {
    const album = await Album.fromVocaDBAlbumContract(entity);
    const songInAlbumAttrs = {
      name: song.name,
    };
    if (album.SongInAlbum === undefined) {
      album.SongInAlbum = songInAlbumAttrs;
    } else if (album.SongInAlbum?.update) {
      album.SongInAlbum.set?.(songInAlbumAttrs);
    }
    return album;
  }

  /**
   * Import a song-in-album relationship from an “song” query from UtaiteDB.
   */
  static async albumFromUtaiteDB(
    song: SongForApiContract,
    entity: AlbumContract
  ): Promise<Album> {
    const album = await Album.fromUtaiteDBAlbumContract(entity);
    const songInAlbumAttrs = {
      name: song.name,
    };
    if (album.SongInAlbum === undefined) {
      album.SongInAlbum = songInAlbumAttrs;
    } else if (album.SongInAlbum?.update) {
      album.SongInAlbum.set?.(songInAlbumAttrs);
    }
    return album;
  }

  /**
   * Import a song-in-album relationship from an “album” query from VocaDB.
   *
   * Complete build.
   */
  static async songFromVocaDB(
    entity: SongInAlbumForApiContract
  ): Promise<Song | null> {
    const song = await Song.saveFromVocaDBEntity(entity.song, null, true);
    const songInAlbumAttrs = {
      name: entity.name,
      diskNumber: entity.discNumber,
      trackNumber: entity.trackNumber,
      vocaDbId: entity.id,
    };
    if (song && song?.SongInAlbum === undefined) {
      song.SongInAlbum = songInAlbumAttrs;
    } else if (song?.SongInAlbum?.update) {
      song?.SongInAlbum.set?.(songInAlbumAttrs);
    }
    return song;
  }

  /**
   * Import a song-in-album relationship from an “album” query from UtaiteDB.
   *
   * Complete build.
   */
  static async songFromUtaiteDB(
    entity: SongInAlbumForApiContract,
    song?: Song
  ): Promise<Song | null> {
    if (!song) {
      return null;
    }
    const songInAlbumAttrs = {
      name: entity.name,
      diskNumber: entity.discNumber,
      trackNumber: entity.trackNumber,
    };
    if (song && song?.SongInAlbum === undefined) {
      song.SongInAlbum = songInAlbumAttrs;
    } else if (song?.SongInAlbum?.update) {
      song?.SongInAlbum.set?.(songInAlbumAttrs);
    }
    return song;
  }
}
