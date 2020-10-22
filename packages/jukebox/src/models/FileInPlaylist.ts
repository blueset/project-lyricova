import { MusicFile } from "./MusicFile";
import { DataTypes } from "sequelize";
import { Model, CreatedAt, UpdatedAt, Column, Table, PrimaryKey, ForeignKey, AutoIncrement } from "sequelize-typescript";
import { Playlist } from "./Playlist";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Table
export class FileInPlaylist extends Model<FileInPlaylist> {

  @Field(type => Int)
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  public id!: number;

  @ForeignKey(() => MusicFile)
  @Column
  fileId: number;

  @ForeignKey(() => Playlist)
  @Column
  playlistId: number;

  @Field(type => Int)
  @Column({ type: new DataTypes.INTEGER, defaultValue: 0 })
  sortOrder: number;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

}
