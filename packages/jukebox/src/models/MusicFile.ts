import { Song } from "./Song";
import { Album } from "./Album";
import { Playlist } from "./Playlist";
import {
  Model,
  Column,
  PrimaryKey,
  Table,
  ForeignKey,
  BelongsTo,
  AllowNull,
  BelongsToMany,
  CreatedAt,
  UpdatedAt,
  AutoIncrement,
  Index
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { FileInPlaylist } from "./FileInPlaylist";
import { ObjectType, Field, Int, Float, ID } from "type-graphql";
import { MUSIC_FILES_PATH } from "../utils/secret";
import path from "path";
import hasha from "hasha";
import { writeAsync as ffMetadataWrite } from "../utils/ffmetadata";
import ffprobe from "ffprobe-client";
import fs from "fs";
import Path from "path";


interface GenericMetadata {
  trackName?: string;
  trackSortOrder?: string;
  artistName?: string;
  artistSortOrder?: string;
  albumName?: string;
  albumSortOrder?: string;
  hasCover: boolean;
  duration: number;
  fileSize: number;
  // formatName?: string;
  songId?: string;
  albumId?: string;
  playlists: string[];
  lyrics?: string;
}

const
  SONG_ID_TAG = "LyricovaSongID",
  ALBUM_ID_TAG = "LyricovaAlbumID",
  PLAYLIST_IDS_TAG = "LyricovaPlaylistIDs";

export const ID3_LYRICS_LANGUAGE = "eng";

@ObjectType({ description: "A music file in the jukebox." })
@Table
export class MusicFile extends Model<MusicFile, Partial<MusicFile>> {
  @Field(type => Int, { description: "File ID in database." })
  @AutoIncrement
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER })
  id: number;

  @Field({ description: "Local path to the song." })
  @Column({ type: new DataTypes.STRING(768), unique: true })
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
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
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  trackName: string | null;

  @Field({ description: "Sort order key of name of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  trackSortOrder: string | null;

  @Field({ description: "Album of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  albumName: string | null;

  @Field({ description: "Sort order key of album of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  albumSortOrder: string | null;

  @Field({ description: "Artist of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  artistName: string | null;

  @Field({ description: "Sort order key of artist of the track stored in file.", nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(1024) })
  @Index({
    name: "MusicFile_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
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

  @Field({ description: "MD5 of the file." })
  @Column({ type: new DataTypes.STRING(128) })
  hash: string;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  /** FileInPlaylist reflected by Playlist.$get("files"), added for GraphQL queries. */
  @Field(type => FileInPlaylist, { nullable: true })
  FileInPlaylist?: Partial<FileInPlaylist>;

  // Virtual column that does not exist in database
  @Column({ type: DataTypes.VIRTUAL })
  get fullPath(): string {
    return path.resolve(MUSIC_FILES_PATH, this.path);
  }

  set fullPath(fullPath: string) {
    this.path = path.relative(MUSIC_FILES_PATH, fullPath);
  }

  public async updateMD5(): Promise<void> {
    const md5 = await hasha.fromFile(this.fullPath, { algorithm: "md5" });
    await this.update({ hash: md5 });
  }

  /**
   * Fetch current playlists of a music file from database, and write it as a metadata tag to the file itself.
   */
  public async updatePlaylistsOfFileAsTags(): Promise<void> {
    const forceId3v2 = this.path.toLowerCase().endsWith(".aiff");
    await ffMetadataWrite(this.fullPath, {
      [PLAYLIST_IDS_TAG]: (await this.$get("playlists")).map((i) => i.slug).join(",")
    }, { preserveStreams: true, forceId3v2: forceId3v2 });

    await this.updateMD5();
  }

  /** Get metadata of a song via ffprobe */
  private async getSongMetadata(): Promise<GenericMetadata> {
    const path = this.fullPath;
    const metadata = await ffprobe(path);
    const tags = metadata.format.tags ?? {};
    const duration = parseFloat(metadata.format.duration);
    let playlists: string[] = [];

    if (tags[PLAYLIST_IDS_TAG]) {
      playlists = tags[PLAYLIST_IDS_TAG].split(",");
    }

    const columns: GenericMetadata = {
      trackName: tags.title || tags.TITLE || undefined,
      trackSortOrder: tags["title-sort"] || tags.TITLESORT || undefined,
      artistName: tags.artist || tags.ARTIST || undefined,
      artistSortOrder:
        tags["artist-sort"] || tags.ARTISTSORT || undefined,
      albumName: tags.album || tags.ALBUM || undefined,
      albumSortOrder: tags["album-sort"] || tags.ALBUMSORT || undefined,
      hasCover: metadata.streams.some(val => val.codec_type === "video"),
      duration: isNaN(duration) ? -1 : duration,
      fileSize: parseInt(metadata.format.size),
      playlists: playlists,
      // formatName: get(metadata, "format.format_name", ""),
      // playlists: tags[PLAYLIST_IDS_TAG] ? tags[PLAYLIST_IDS_TAG].split(",") : undefined,
    };

    const songId = tags[SONG_ID_TAG] || undefined;
    if (songId !== undefined) columns.songId = songId;
    const albumId = tags[ALBUM_ID_TAG] || undefined;
    if (albumId !== undefined) columns.albumId = albumId;
    const lyrics = tags[`lyrics-${ID3_LYRICS_LANGUAGE}`] || tags.LYRICS || undefined;
    if (lyrics !== undefined) columns.lyrics = lyrics;

    return columns;
  }

  /** Make a new MusicFile object from file path. */
  public async buildSongEntry(): Promise<this> {
    const path = this.fullPath;
    const md5Promise = hasha.fromFile(path, { algorithm: "md5" });
    const metadataPromise = this.getSongMetadata();
    const md5 = await md5Promise,
      { songId, albumId, playlists, lyrics, ...metadata } = await metadataPromise;
    const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
    const hasLyrics = fs.existsSync(lrcPath);

    // console.log(songId, albumId, playlists);

    this.set({
      hasLyrics: hasLyrics,
      hash: md5,
      needReview: true,
      ...metadata,
    } as Partial<this>);
    if (parseInt(songId)) this.set({songId: parseInt(songId)});
    if (parseInt(albumId)) this.set({songId: parseInt(albumId)});

    this.playlists = playlists.map(slug => Playlist.build({ slug }, { isNewRecord: false }));

    return this;
  }

  /** Update an existing MusicFile object with data in file. */
  public async updateSongEntry(): Promise<MusicFile | null> {
    try {
      let needUpdate = false;
      const path = this.fullPath;
      const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
      const hasLyrics = fs.existsSync(lrcPath);
      needUpdate = needUpdate || hasLyrics !== this.hasLyrics;
      const fileSize = fs.statSync(path).size;
      const md5 = await hasha.fromFile(path, { algorithm: "md5" });
      needUpdate = needUpdate || md5 !== this.hash;
      if (!needUpdate) return null;

      const { songId, albumId, playlists, lyrics, ...metadata } = await this.getSongMetadata();
      await this.update({
        path: Path.relative(MUSIC_FILES_PATH, path),
        hasLyrics: hasLyrics,
        fileSize: fileSize,
        hash: md5,
        needReview: true,
        songId: songId ? parseInt(songId) : null,
        albumId: albumId ? parseInt(albumId) : null,
        ...metadata
      });
      await this.$set("playlists", playlists);
    } catch (e) {
      console.error("Error occurred while updating song entry", e);
    }
    return this;
  }

  /** Write metadata to file partially */
  public async writeToFile(data: Partial<MusicFile>): Promise<void> {
    let mapping;
    if (this.path.toLowerCase().endsWith(".flac")) {
      mapping = { trackSortOrder: "TITLESORT", artistSortOrder: "ARTISTSORT", albumSortOrder: "ALBUMSORT" };
    } else { // FFMPEG default
      mapping = { trackSortOrder: "title-sort", artistSortOrder: "artist-sort", albumSortOrder: "album-sort" };
    }
    const forceId3v2 = this.path.toLowerCase().endsWith(".aiff");
    await ffMetadataWrite(this.fullPath, {
      title: data.trackName,
      [mapping.trackSortOrder]: data.trackSortOrder,
      album: data.albumName,
      [mapping.albumSortOrder]: data.albumSortOrder,
      artist: data.artistName,
      [mapping.artistSortOrder]: data.artistSortOrder,
      [SONG_ID_TAG]: `${data.songId}`,
      [ALBUM_ID_TAG]: `${data.albumId}`
    }, { preserveStreams: true, forceId3v2: forceId3v2 });
  }

}
