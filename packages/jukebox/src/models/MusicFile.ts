import { Song } from "./Song";
import { Album } from "./Album";
import { Playlist } from "./Playlist";
import { Model, Column, PrimaryKey, Table, ForeignKey, BelongsTo, AllowNull, BelongsToMany, CreatedAt, UpdatedAt, DeletedAt } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";

@Table
export class MusicFile extends Model<MusicFile> {
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Column({ type: new DataTypes.STRING(768), unique: true })
  path: string;

  @Column({ type: DataTypes.INTEGER.UNSIGNED })
  fileSize: number;

  @AllowNull
  @ForeignKey(() => Song)
  @Column({ type: new DataTypes.INTEGER })
  songId: number;

  @BelongsTo(() => Song)
  song: Song | null;

  @AllowNull
  @ForeignKey(() => Album)
  @Column
  albumId: number;

  @BelongsTo(() => Album)
  album: Album | null;

  @BelongsToMany(
    type => Playlist,
    intermediate => FileInPlaylist
  )
  playlists: Playlist[];

  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  trackName: string | null;

  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  trackSortOrder: string | null;

  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  albumName: string | null;

  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  albumSortOrder: string | null;

  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  artistName: string | null;

  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  artistSortOrder: string | null;

  @Column
  hasLyrics: boolean;

  @Column
  hasCover: boolean;

  @Column
  needReview: boolean;

  @Column({ type: new DataTypes.FLOAT, defaultValue: -1.0 })
  duration: number;

  @Column({ type: new DataTypes.STRING(128) })
  hash: string;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;
}
