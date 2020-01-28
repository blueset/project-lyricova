
import { Song } from "./Song";
import { Album } from "./Album";
import { AlbumContract } from "vocadb";
import { Model, Table, Column, PrimaryKey, AutoIncrement, BelongsTo, ForeignKey, CreatedAt, UpdatedAt, DeletedAt, Unique, AllowNull } from "sequelize-typescript";
import { DataTypes } from "sequelize";

@Table
export class SongInAlbum extends Model<SongInAlbum> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  @AutoIncrement
  songInAlbumId: number;

  @Column({ type: DataTypes.INTEGER })
  @Unique
  @AllowNull
  vocaDbId: number | null;

  @Column({ type: DataTypes.INTEGER })
  @AllowNull
  diskNumber: number | null;

  @Column({ type: DataTypes.INTEGER })
  @AllowNull
  trackNumber: number | null;

  @Column({ type: new DataTypes.STRING(2048) })
  @AllowNull
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

  @DeletedAt
  deletionDate: Date;

  /** Incomplete build. */
  static fromVocaDBAlbumEntity(song: Song, entity: AlbumContract): SongInAlbum {
    const obj = new SongInAlbum();
    Object.assign<SongInAlbum, Partial<SongInAlbum>>(obj, {
      name: song.name,
      // song: song,
      album: Album.fromVocaDBAlbumContract(entity)
    });
    return obj;
  }
}
