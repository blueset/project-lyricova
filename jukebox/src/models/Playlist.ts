import { MusicFile } from "./MusicFile";
import { Table, Model, PrimaryKey, Column, BelongsToMany } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";

@Table
export class Playlist extends Model<Playlist> {
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(512) })
  slug: string;

  @Column({ type: new DataTypes.STRING(1024) })
  name: string;

  @BelongsToMany(
    type => MusicFile,
    intermediate => FileInPlaylist
  )
  files: MusicFile[];
}
