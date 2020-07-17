import { Song } from "./Song";
import { Album } from "./Album";
import { Playlist } from "./Playlist";
import { Model, Column, PrimaryKey, Table, ForeignKey, BelongsTo, AllowNull, BelongsToMany, CreatedAt, UpdatedAt, DeletedAt, AutoIncrement } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";
import { ObjectType, Field, Int, Float } from "type-graphql";
import { MUSIC_FILES_PATH } from "../utils/secret";
import path from "path";

@ObjectType({ description: "A music file in the jukebox." })
@Table
export class MusicFile extends Model<MusicFile> {
  @Field(type => Int, { description: "File ID in database." })
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Field({ description: "Local path to the song." })
  @Column({ type: new DataTypes.STRING(768), unique: true })
  path: string;

  @Field(type => Int, { description: "Size of file in bytes." })
  @Column({ type: DataTypes.INTEGER.UNSIGNED })
  fileSize: number;

  @Field(type => Int, { description: "ID of corresponding song in database.", nullable: true })
  @AllowNull
  @ForeignKey(() => Song)
  @Column({ type: new DataTypes.INTEGER })
  songId: number;

  @BelongsTo(() => Song)
  song: Song | null;

  @Field(type => Int, { description: "ID of corresponding album in database.", nullable: true })
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

  @Field({ description: "Name of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  trackName: string | null;

  @Field({ description: "Sort order key of name of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  trackSortOrder: string | null;

  @Field({ description: "Album of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  albumName: string | null;

  @Field({ description: "Sort order key of album of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  albumSortOrder: string | null;

  @Field({ description: "Artist of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  artistName: string | null;

  @Field({ description: "Sort order key of artist of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  artistSortOrder: string | null;

  @Field({ description: "If the file is accompanied with a lyrics file." })
  @Column
  hasLyrics: boolean;

  @Field({ description: "If the file has an embedded cover art." })
  @Column
  hasCover: boolean;

  @Field({ description: "If this entry needs review." })
  @Column
  needReview: boolean;

  @Field(type => Float, { description: "Duration of the song in seconds." })
  @Column({ type: new DataTypes.FLOAT, defaultValue: -1.0 })
  duration: number;

  @Field({ description: "SHA256 of the file." })
  @Column({ type: new DataTypes.STRING(128) })
  hash: string;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  get fullPath(): string {
    return path.resolve(MUSIC_FILES_PATH, this.path);
  }
}
