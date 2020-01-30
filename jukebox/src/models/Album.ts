
import { SongInAlbum } from "./SongInAlbum";
import { AlbumForApiContract, AlbumContract } from "vocadb";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { MusicFile } from "./MusicFile";
import { transliterate } from "../utils/transliterate";
import { HasMany, Table, Model, Column, PrimaryKey, BelongsToMany, CreatedAt, UpdatedAt, DeletedAt, Default, AllowNull } from "sequelize-typescript";
import { Song } from "./Song";
import { DataTypes } from "sequelize";

@Table
export class Album extends Model<Album> {
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Column({ type: new DataTypes.STRING(4096) })
  name: string;

  @Column({ type: new DataTypes.STRING(4096) })
  sortOrder: string;

  @BelongsToMany(
    () => Song,
    () => SongInAlbum
  )
  songs: Array<Song & { SongInAlbum: SongInAlbum }>;

  @BelongsToMany(
    () => Album,
    () => ArtistOfAlbum
  )
  albums: Array<Album & { ArtistOfAlbum: ArtistOfAlbum }>;

  @HasMany(
    () => MusicFile
  )
  files: MusicFile[];

  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson: AlbumForApiContract | null;

  @Default(true)
  @Column({ type: DataTypes.BOOLEAN })
  incomplete: boolean;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  /** Incomplete build. */
  static async fromVocaDBAlbumContract(entity: AlbumContract): Promise<Album> {
    const obj = (await Album.findOrCreate({
      where: { id: entity.id },
      defaults: {
        name: entity.name,
        sortOrder: transliterate(entity.name),
        incomplete: true
      }
    }))[0];
    return obj;
  }
}
