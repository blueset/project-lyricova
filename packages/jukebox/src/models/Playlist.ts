import { MusicFile } from "./MusicFile";
import { Table, Model, PrimaryKey, Column, BelongsToMany } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";
import { ObjectType, Field, ID } from "type-graphql";

@ObjectType({ description: "A playlist of music files." })
@Table
export class Playlist extends Model<Playlist, Partial<Playlist>> {
  @Field(type => ID, { description: "Slug of the playlist." })
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(512) })
  slug: string;

  @Field({ description: "Name of the playlist." })
  @Column({ type: new DataTypes.STRING(1024) })
  name: string;

  @BelongsToMany(
    type => MusicFile,
    intermediate => FileInPlaylist
  )
  files: MusicFile[];

  // virtual field in GraphQL
  filesCount?: number;
}
