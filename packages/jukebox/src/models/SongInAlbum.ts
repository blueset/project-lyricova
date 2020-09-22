import { Song } from "./Song";
import { Album } from "./Album";
import { AlbumContract, SongForApiContract } from "../types/vocadb";
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
  AllowNull
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Table
export class SongInAlbum extends Model<SongInAlbum> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  songInAlbumId: number;

  @Field(type => Int, { nullable: true })
  @Unique
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  vocaDbId: number | null;

  @Field(type => Int, { nullable: true })
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  diskNumber: number | null;

  @Field(type => Int, { nullable: true })
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  trackNumber: number | null;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(2048) })
  name: string | null;

  @BelongsTo(
    type => Song
  )
  song: Song;

  @ForeignKey(type => Song)
  @Column
  songId: number;

  @BelongsTo(
    type => Album
  )
  album: Album;

  @ForeignKey(type => Album)
  @Column
  albumId: number;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  /** Incomplete build. */
  static async albumFromVocaDB(song: SongForApiContract, entity: AlbumContract): Promise<Album> {
    const album = await Album.fromVocaDBAlbumContract(entity);
    const songInAlbumAttrs = {
      name: song.name,
    };
    if (album.SongInAlbum === undefined) {
      album.SongInAlbum = songInAlbumAttrs;
    } else if (album.SongInAlbum?.update) {
      album.SongInAlbum.set(songInAlbumAttrs);
    }
    return album;
  }
}
