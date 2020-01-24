import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  ManyToMany
} from "typeorm";
import { MusicFile } from "./MusicFile";
import { VideoFile } from "./VideoFile";
import { SongForApiContract } from "vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { SongInAlbum } from "./SongInAlbum";
import { Entry } from "./Entry";
import { transliterate } from "../utils/transliterate";

@Entity()
export class Song extends BaseEntity {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({ type: "varchar", length: 4096 })
  name: string;

  @Column({ type: "varchar", length: 4096 })
  sortOrder: string;

  @ManyToOne(
    () => ArtistOfSong,
    artistOfSong => artistOfSong.song
  )
  artistsOfSong: ArtistOfSong[]; // custom intermediate table

  @ManyToOne(
    () => Song,
    song => song.derivedSongs
  )
  original: Song | null;

  @OneToMany(
    () => Song,
    song => song.original
  )
  derivedSongs: Song[];

  songsInAlbum: SongInAlbum[]; // custom intermediate table

  @Column({ type: "json", nullable: true })
  vocaDbJson: SongForApiContract | null;

  @OneToMany(
    () => VideoFile,
    videoFile => videoFile.song
  )
  videos: VideoFile[];

  @Column({ type: "varchar", length: 4096, nullable: true })
  coverPath: string | null;

  @OneToMany(
    () => MusicFile,
    musicFile => musicFile.song
  )
  files: MusicFile[];

  @ManyToMany(
    () => Entry,
    entry => entry.songs
  )
  lyricovaEntries: Entry[];

  @Column({ default: true })
  incomplete: boolean;

  @CreateDateColumn()
  createdOn: Date;

  @UpdateDateColumn()
  updatedOn: Date;

  static fromVocaDBEntity(entity: SongForApiContract): Song {
    const obj = new Song();
    Object.assign<Song, Partial<Song>>(obj, {
      id: entity.id,
      name: entity.name,
      sortOrder: transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      incomplete: false
      // TODO: More entries here
    });
    obj.artistsOfSong = entity.artists.map(x => ArtistOfSong.fromVocaDBEntity(obj, x));
    obj.songsInAlbum = entity.albums.map(x => SongInAlbum.fromVocaDBAlbumEntity(obj, x));
    return obj;
  }
}
