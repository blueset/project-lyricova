import { MusicFile } from "./MusicFile";
import { VideoFile } from "./VideoFile";
import { SongForApiContract } from "vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { SongInAlbum } from "./SongInAlbum";
import { Entry } from "./Entry";
import { transliterate } from "../utils/transliterate";
import { DataTypes } from "sequelize";
import { Includeable } from "sequelize/types";
import { Model, CreatedAt, UpdatedAt, DeletedAt, Column, Table, BelongsTo, PrimaryKey, ForeignKey, HasMany, AllowNull, BelongsToMany } from "sequelize-typescript";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { SongOfEntry } from "./SongOfEntry";

@Table
export class Song extends Model<Song> {
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  public id!: number;

  @Column({ type: new DataTypes.STRING(4096) })
  public name!: string;

  @Column({ type: new DataTypes.STRING(4096) })
  public sortOrder!: string;

  @BelongsToMany(
    () => Artist,
    () => ArtistOfSong
  )
  artists: Array<Artist & { ArtistOfSong: ArtistOfSong }>;

  @BelongsToMany(
    () => Album,
    () => SongInAlbum
  )
  albums: Array<Album & { SongInAlbum: SongInAlbum }>;

  @AllowNull
  @ForeignKey(type => Song)
  @Column({ type: DataTypes.INTEGER })
  originalId!: number | null;

  @BelongsTo(type => Song, "originalId")
  original: Song | null;

  @HasMany(type => Song, "originalId")
  readonly derivedSongs: Song[];

  @AllowNull
  @Column({ type: DataTypes.JSON })
  vocaDbJson!: SongForApiContract | null;

  @HasMany(() => VideoFile)
  videos: VideoFile[];

  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  coverPath!: string | null;

  @HasMany(() => MusicFile)
  files: MusicFile[];

  @BelongsToMany(() => Entry, () => SongOfEntry)
  lyricovaEntries: Array<Entry & { SongOfEntry: SongOfEntry }>;

  @Column({ type: DataTypes.BOOLEAN, defaultValue: true })
  incomplete!: boolean;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  static async saveFromVocaDBEntity(entity: SongForApiContract, original: Song | null): Promise<Song> {
    const include: Includeable[] = [Artist, Album];
    if (original !== null) {
      include.push({ model: Song, as: "original" });
    }
    return Song.build({
      id: entity.id,
      name: entity.name,
      sortOrder: transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      incomplete: false,
      artists: entity.artists.map(x => ArtistOfSong.artistFromVocaDB(x)),
      albums: entity.albums.map(x => SongInAlbum.albumFromVocaDB(entity, x)),
      original: original
    }, {
      include: include
    });
  }
}
