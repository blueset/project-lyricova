import { MusicFile } from "./MusicFile";
import {
  Table,
  Model,
  PrimaryKey,
  Column,
  BelongsToMany,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";

/**
 * @openapi
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       description: A playlist of music files.
 *       properties:
 *         slug:
 *           type: string
 *           maxLength: 512
 *           example: "favorites"
 *           description: URL-friendly identifier for the playlist
 *         name:
 *           type: string
 *           maxLength: 1024
 *           example: "My Favorites"
 *           description: Display name of the playlist
 *         filesCount:
 *           type: integer
 *           description: Number of files in the playlist
 *           readOnly: true
 *       required:
 *         - slug
 *         - name
 */
@Table({ modelName: "Playlist" })
export class Playlist extends Model<Playlist, Partial<Playlist>> {
  @PrimaryKey
  @Column({ type: new DataTypes.STRING(512) })
  slug: string;

  @Column({ type: new DataTypes.STRING(1024) })
  name: string;

  @BelongsToMany((type) => MusicFile, (intermediate) => FileInPlaylist)
  files: MusicFile[];

  // virtual field in GraphQL
  filesCount?: number;
}
