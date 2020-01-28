import { Song } from "./Song";
import { Album } from "./Album";
import { Playlist } from "./Playlist";
import { Model, Column, PrimaryKey, Table, ForeignKey, BelongsTo, AllowNull, BelongsToMany, CreatedAt, UpdatedAt, DeletedAt } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";

@Table
export class MusicFile extends Model<MusicFile> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
  id: number;

  @Column({ type: new DataTypes.STRING(768), unique: true })
  path: string;

  @Column({ type: new DataTypes.INTEGER.UNSIGNED })
  fileSize: number;

  @ForeignKey(() => Song)
  @Column({ type: new DataTypes.INTEGER })
  @AllowNull
  songId: number;

  @BelongsTo(() => Song)
  song: Song | null;

  @ForeignKey(() => Album)
  @AllowNull
  albumId: number;

  @BelongsTo(() => Album)
  album: Album | null;

  @BelongsToMany(
    type => Playlist,
    intermediate => FileInPlaylist
  )
  playlists: Playlist[];

  @Column({ type: new DataTypes.STRING(1024) })
  @AllowNull
  trackName: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  @AllowNull
  trackSortOrder: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  @AllowNull
  albumName: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  @AllowNull
  albumSortOrder: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  @AllowNull
  artistName: string | null;

  @Column({ type: new DataTypes.STRING(1024) })
  @AllowNull
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

  @DeletedAt
  deletionDate: Date;
}
