import { MusicFile } from "./MusicFile";
import { VideoFile } from "./VideoFile";
import { SongForApiContract } from "vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { SongInAlbum } from "./SongInAlbum";
import { Entry } from "./Entry";
import { transliterate } from "../utils/transliterate";
import { DataTypes } from "sequelize";
import { Model, CreatedAt, UpdatedAt, DeletedAt, Column, Table, BelongsTo, PrimaryKey, ForeignKey, HasMany, AllowNull, BelongsToMany } from "sequelize-typescript";
import { Artist } from "./Artist";
import { Album } from "./Album";
import { SongOfEntry } from "./SongOfEntry";

@Table
export class Song extends Model<Song> {
  @Column({ type: new DataTypes.INTEGER })
  @PrimaryKey
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

  @ForeignKey(type => Song)
  @Column({ type: DataTypes.INTEGER })
  @AllowNull
  public originalId!: number | null;

  @BelongsTo(type => Song, "originalId")
  public original: Song | null;

  @HasMany(type => Song, "originalId")
  public readonly derivedSongs: Song[];

  @Column({ type: DataTypes.JSON })
  @AllowNull
  public vocaDbJson!: SongForApiContract | null;

  @HasMany(() => VideoFile)
  videos: VideoFile[];

  @Column({ type: new DataTypes.STRING(4096) })
  @AllowNull
  public coverPath!: string | null;

  @HasMany(() => MusicFile)
  files: MusicFile[];

  @BelongsToMany(() => Entry, () => SongOfEntry)
  lyricovaEntries: Array<Entry & { SongOfEntry: SongOfEntry }>;

  @Column({ type: DataTypes.BOOLEAN, defaultValue: true })
  public incomplete!: boolean;

  @CreatedAt
  creationDate: Date;

  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  // static fromVocaDBEntity(entity: SongForApiContract): Song {
  //   const obj = new Song();
  //   Object.assign<Song, Partial<Song>>(obj, {
  //     id: entity.id,
  //     name: entity.name,
  //     sortOrder: transliterate(entity.name), // prompt user to check this upon import
  //     vocaDbJson: entity,
  //     incomplete: false
  //     // TODO: More entries here
  //   });
  //   obj.artistsOfSong = entity.artists.map(x => ArtistOfSong.fromVocaDBEntity(obj, x));
  //   obj.songsInAlbum = entity.albums.map(x => SongInAlbum.fromVocaDBAlbumEntity(obj, x));
  //   return obj;
  // }
}
