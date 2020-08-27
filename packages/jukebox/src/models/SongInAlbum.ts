
import { Song } from "./Song";
import { Album } from "./Album";
import { AlbumContract, SongForApiContract } from "../types/vocadb";
import { Model, Table, Column, PrimaryKey, AutoIncrement, BelongsTo, ForeignKey, CreatedAt, UpdatedAt, DeletedAt, Unique, AllowNull } from "sequelize-typescript";
import { DataTypes } from "sequelize";

@Table
export class SongInAlbum extends Model<SongInAlbum> {
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  songInAlbumId: number;

  @Unique
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  vocaDbId: number | null;

  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  diskNumber: number | null;

  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  trackNumber: number | null;

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

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  /** Incomplete build. */
  static async albumFromVocaDB(song: SongForApiContract, entity: AlbumContract): Promise<Album & { SongInAlbum: SongInAlbum }> {
    const album = await Album.fromVocaDBAlbumContract(entity) as (Album & { SongInAlbum: SongInAlbum });
    album.SongInAlbum = (await SongInAlbum.findOrCreate({
      where: {
        songId: song.id,
        albumId: entity.id
      },
      defaults: {
        name: song.name,
      }
    }))[0];
    return album;
  }
}
