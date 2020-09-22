import {MusicFile} from "../models/MusicFile";
import glob from "glob";
import {MUSIC_FILES_PATH} from "../utils/secret";
import ffprobe from "ffprobe-client";
import {writeAsync as ffMetadataWrite} from "../utils/ffmetadata";
import fs from "fs";
import hasha from "hasha";
import pLimit from "p-limit";
import { literal, Op, WhereOptions } from "sequelize";
import Path from "path";
import chunkArray from "../utils/chunkArray";
import _ from "lodash";
import {
  Arg,
  Args,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root
} from "type-graphql";
import {PaginationArgs, PaginationInfo} from "./commons";
import {UserInputError} from "apollo-server-express";
import {Playlist} from "../models/Playlist";
import {Song} from "../models/Song";
import {Album} from "../models/Album";
import NodeID3 from "node-id3";
import {swapExt} from "../utils/path";
import {Lyrics} from "lyrics-kit";
import {LyricsKitLyrics} from "./LyricsKitObjects";

function setDifference<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter(val => !other.has(val)));
}

function setUnion<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter(val => other.has(val)));
}

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
  songId: string;
  albumId: string;
  playlists: string[];
  lyrics?: string;
}

const
  SONG_ID_TAG = "LyricovaSongID",
  ALBUM_ID_TAG = "LyricovaAlbumID",
  PLAYLIST_IDS_TAG = "LyricovaPlaylistIDs";

const ID3_LYRICS_LANGUAGE = "eng";


@ObjectType()
class MusicFilesPaginationEdge {
  @Field()
  cursor: string;

  @Field()
  node: MusicFile;
}

@ObjectType()
export class MusicFilesPagination {
  @Field(type => Int)
  totalCount: number;

  @Field(type => [MusicFilesPaginationEdge])
  edges: MusicFilesPaginationEdge[];

  @Field()
  pageInfo: PaginationInfo;
}

@ObjectType()
export class MusicFilesScanOutcome {
  @Field(type => Int)
  added: number;

  @Field(type => Int)
  deleted: number;

  @Field(type => Int)
  updated: number;

  @Field(type => Int)
  unchanged: number;

}


@InputType({ description: "Write metadata to music file." })
class MusicFileInput implements Partial<MusicFile> {


  @Field(type => Int, { description: "ID of corresponding song in database.", nullable: true })
  songId?: number;

  @Field(type => Int, { description: "ID of corresponding album in database.", nullable: true })
  albumId?: number;

  @Field({ description: "Name of the track stored in file.", nullable: true })
  trackName?: string;

  @Field({ description: "Sort order key of name of the track stored in file.", nullable: true })
  trackSortOrder?: string;

  @Field({ description: "Album of the track stored in file.", nullable: true })
  albumName?: string;

  @Field({ description: "Sort order key of album of the track stored in file.", nullable: true })
  albumSortOrder?: string;

  @Field({ description: "Artist of the track stored in file.", nullable: true })
  artistName?: string;

  @Field({ description: "Sort order key of artist of the track stored in file.", nullable: true })
  artistSortOrder?: string;

}

@InputType({description: "Music files query options"})
class MusicFilesQueryOptions {
  @Field({description: "Filter by review status of files", nullable: true})
  needReview?: boolean;
}

@Resolver(of => MusicFile)
export class MusicFileResolver {


  /** Get metadata of a song via ffprobe */
  private static async getSongMetadata(path: string): Promise<GenericMetadata> {
    const metadata = await ffprobe(path);
    const tags = metadata.format.tags ?? {};
    const duration = parseFloat(metadata.format.duration);
    let playlists: string[] = [];

    if (tags[PLAYLIST_IDS_TAG]) {
      playlists = tags[PLAYLIST_IDS_TAG].split(",");
    }

    return {
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
      songId: tags[SONG_ID_TAG] || undefined,
      albumId: tags[ALBUM_ID_TAG] || undefined,
      lyrics: tags[`lyrics-${ID3_LYRICS_LANGUAGE}`] || tags.LYRICS || undefined,
      playlists: playlists,
      // formatName: get(metadata, "format.format_name", ""),
      // playlists: tags[PLAYLIST_IDS_TAG] ? tags[PLAYLIST_IDS_TAG].split(",") : undefined,
    };
  }

  /** Make a new MusicFile object from file path. */
  private static async buildSongEntry(path: string): Promise<GenericMetadata & {
    path: string;
    hasLyrics: boolean;
    hash: string;
    needReview: boolean;
  }> {
    const md5Promise = hasha.fromFile(path, { algorithm: "md5" });
    const metadataPromise = MusicFileResolver.getSongMetadata(path);
    const md5 = await md5Promise,
      metadata = await metadataPromise;
    const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
    const hasLyrics = fs.existsSync(lrcPath);
    return {
      path: Path.relative(MUSIC_FILES_PATH, path),
      hasLyrics: hasLyrics,
      hash: md5,
      needReview: true,
      ...metadata
    };
  }

  /** Update an existing MusicFile object with data in file. */
  private static async updateSongEntry(entry: MusicFile): Promise<MusicFile | null> {
    try {
      let needUpdate = false;
      const path = entry.fullPath;
      const lrcPath = path.substr(0, path.lastIndexOf(".")) + ".lrc";
      const hasLyrics = fs.existsSync(lrcPath);
      needUpdate = needUpdate || hasLyrics !== entry.hasLyrics;
      const fileSize = fs.statSync(path).size;
      const md5 = await hasha.fromFile(path, {algorithm: "md5"});
      needUpdate = needUpdate || md5 !== entry.hash;
      if (!needUpdate) return null;

      const metadata = await MusicFileResolver.getSongMetadata(path);
      entry = await entry.update({
        path: Path.relative(MUSIC_FILES_PATH, path),
        hasLyrics: hasLyrics,
        fileSize: fileSize,
        hash: md5,
        needReview: true,
        ...metadata
      });
    } catch (e) {
      console.error("Error occurred while updating song entry", e);
    }
    return entry;
  }

  private static async updateMD5(entry: MusicFile): Promise<void> {
    const md5 = await hasha.fromFile(entry.fullPath, { algorithm: "md5" });
    await entry.update({ hash: md5 });
  }

  /** Write metadata to file partially */
  private static async writeToFile(file: MusicFile, data: Partial<MusicFile>) {
    let mapping;
    if (file.path.toLowerCase().endsWith(".flac")) {
      mapping = { trackSortOrder: "TITLESORT", artistSortOrder: "ARTISTSORT", albumSortOrder: "ALBUMSORT" };
    } else { // FFMPEG default
      mapping = { trackSortOrder: "title-sort", artistSortOrder: "artist-sort", albumSortOrder: "album-sort" };
    }
    const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
    await ffMetadataWrite(file.fullPath, {
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

  @Mutation(returns => MusicFilesScanOutcome)
  public async scan(): Promise<MusicFilesScanOutcome> {
    // Load
    const databaseEntries = await MusicFile.findAll({
      attributes: ["id", "path", "fileSize", "hash", "hasLyrics"]
    });
    const filePaths = glob.sync(
      `${MUSIC_FILES_PATH}/**/*.{mp3,flac,aiff}`,
      {
        nosort: true,
        nocase: true
      }
    );
    const knownPathsSet: Set<string> = new Set(
      databaseEntries.map(entry => entry.path)
    );
    const filePathsSet: Set<string> = new Set(filePaths);

    const toAdd = setDifference(filePathsSet, knownPathsSet);
    const toUpdate = setUnion(knownPathsSet, filePathsSet);
    const toDelete = setDifference(knownPathsSet, filePathsSet);

    console.log(`toAdd: ${toAdd.size}, toUpdate: ${toUpdate.size}, toDelete: ${toDelete.size}`);

    // Remove records from database for removed files
    if (toDelete.size) {
      await MusicFile.destroy({ where: { path: { [Op.in]: [...toDelete] } } });
    }

    console.log("entries deleted.");

    // Add new files to database
    const limit = pLimit(10);

    const entriesToAdd = await Promise.all(
      [...toAdd].map(path => limit(async () => MusicFileResolver.buildSongEntry(path)))
    );

    console.log("entries_to_add done.");

    for (const chunk of chunkArray(entriesToAdd)) {
      await MusicFile.bulkCreate(chunk);
    }

    console.log("entries added.");

    // update songs into database
    const toUpdateEntries = databaseEntries.filter(entry =>
      toUpdate.has(entry.path)
    );
    const updateResults = await Promise.all(
      toUpdateEntries.map(entry =>
        limit(async () => MusicFileResolver.updateSongEntry(entry))
      )
    );

    console.log("entries updated.");

    const updatedCount = updateResults.reduce(
      (prev: number, curr) => prev + (curr === null ? 0 : 1),
      0
    ) as number;
    return {
      added: toAdd.size,
      deleted: toDelete.size,
      updated: updatedCount,
      unchanged: toUpdate.size - updatedCount
    };
  }

  @Query(returns => MusicFilesPagination)
  public async musicFiles(
    @Args() { first, after }: PaginationArgs,
    @Arg("options", {nullable: true}) options: MusicFilesQueryOptions
  ): Promise<MusicFilesPagination> {
    if (after === null || after === undefined) {
      after = "-1";
    }

    const offset = parseInt(after) + 1;

    const where: WhereOptions = {};
    if (options) {
      if (options.needReview !== undefined) {
        where.needReview = options.needReview;
      }
    }

    const result = await MusicFile.findAndCountAll({
      offset: offset,
      limit: first < 0 ? undefined : first,
      where
    });
    const edges: MusicFilesPaginationEdge[] = result.rows.map((r, idx) => {
      return {
        cursor: `${offset + idx}`,
        node: r
      };
    });
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : after;
    return {
      totalCount: result.count,
      edges,
      pageInfo: {
        endCursor: endCursor,
        hasNextPage: offset + first < result.count
      }
    };
  }

  @Query(returns => [MusicFile])
  public async searchMusicFiles(@Arg("keywords") keywords: string): Promise<MusicFile[]> {
    return MusicFile.findAll({
      where: literal("match (path, trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder) against (:keywords in boolean mode)"),
      replacements: {
        keywords,
      },
    });
  }

  @Query(returns => MusicFile, { nullable: true })
  public async musicFile(@Arg("id", type => Int) id: number): Promise<MusicFile | null> {
    return MusicFile.findByPk(id);
  }

  @Mutation(returns => MusicFile)
  public async writeTagsToMusicFile(@Arg("id", type => Int) id: number, @Arg("data") data: MusicFileInput): Promise<MusicFile> {
    const song = await MusicFile.findByPk(id);
    if (song === null) {
      throw new UserInputError(`Music file with id ${id} is not found.`);
    }

    // write song file
    await MusicFileResolver.writeToFile(song, data);

    _.assign(song, data);

    // update hash
    song.set({ hash: await hasha.fromFile(song.fullPath, { algorithm: "md5" }) });

    await song.save();
    return song;
  }

  @FieldResolver(type => [Playlist])
  private async playlists(@Root() musicFile: MusicFile): Promise<Playlist[]> {
    return musicFile.$get("playlists");
  }

  @FieldResolver(type => Song, { nullable: true })
  private async song(@Root() musicFile: MusicFile): Promise<Song | null> {
    return musicFile.$get("song");
  }

  @FieldResolver(type => Album, { nullable: true })
  private async album(@Root() musicFile: MusicFile): Promise<Album | null> {
    return musicFile.$get("album");
  }

  @FieldResolver(type => String, { nullable: true })
  private async lyricsText(@Root() musicFile: MusicFile, @Arg("ext", { defaultValue: "lrc" }) ext: string): Promise<string | null> {
    const filePath = musicFile.fullPath;
    const lyricsPath = swapExt(filePath, ext);
    try {
      const buffer = fs.readFileSync(lyricsPath);
      return buffer.toString();
    } catch (e) {
      console.error("Error while reading lyrics file:", e);
      return null;
    }
  }

  @FieldResolver(type => LyricsKitLyrics, { nullable: true })
  private async lyrics(@Root() musicFile: MusicFile): Promise<LyricsKitLyrics | null> {
    const filePath = musicFile.fullPath;
    const lrcPath = swapExt(filePath, "lrc");
    const lrcxPath = swapExt(filePath, "lrcx");
    let path: string | null = null;
    if (fs.existsSync(lrcxPath)) {
      path = lrcxPath;
    } else if (fs.existsSync(lrcPath)) {
      path = lrcPath;
    } else {
      console.log("no file is found");
      return null;
    }
    try {
      const buffer = fs.readFileSync(path);
      let content = buffer.toString();

      // Transform standard " / " type of translation to LyricsX types.
      content = content.replace(/^((?:\[[0-9:.-]+])+)(.+?) \/ (.+)$/mg, "$1$2\n$1[tr]$3");
      content = content.replace(/^((?:\[[0-9:.-]+])+)(.+?)[\/／](.+)$/mg, "$1$2\n$1[tr]〝$3〟");

      return new LyricsKitLyrics(new Lyrics(content));
    } catch (e) {
      console.error("Error while reading lyrics file:", e);
      return null;
    }
  }


  @Mutation(returns => Boolean, { description: "Write lyrics to a separate file" })
  public async writeLyrics(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("lyrics", () => String, { description: "Lyrics file content" }) lyrics: string,
    @Arg("ext", () => String, { description: "Lyrics file extension", defaultValue: "lrc" }) ext: string,
  ): Promise<boolean> {
    const file = await MusicFile.findByPk(fileId);
    if (file === null) return false;
    const filePath = file.fullPath;
    const lyricsPath = swapExt(filePath, ext);

    try {
      fs.writeFileSync(lyricsPath, lyrics);
      await file.update({ hasLyrics: true });
    } catch (e) {
      console.error("Error while writing lyrics file:", e);
      return false;
    }

    return true;
  }

  @Mutation(returns => Boolean, { description: "Write lyrics to music file as a tag" })
  public async writeLyricsToMusicFile(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("lyrics", () => String, { description: "Lyrics content" }) lyrics: string,
  ): Promise<boolean> {
    const file = await MusicFile.findByPk(fileId);
    if (file === null) return false;

    try {
      // Use FFmpeg only for FLAC due to its bug on ID3 lyrics.
      if (file.path.toLowerCase().endsWith(".flac")) {
        const key = "LYRICS";
        // const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
        const forceId3v2 = false;
        await ffMetadataWrite(file.fullPath, {
          [key]: lyrics
        }, { preserveStreams: true, forceId3v2: forceId3v2 });
      } else {
        // Use node-id3 for ID3
        const tags: NodeID3.Tags = {
          unsynchronisedLyrics: {
            language: ID3_LYRICS_LANGUAGE,
            text: lyrics,
          },
        };

        // Write ID3-Frame into (.mp3) file, returns true or error object
        const result = NodeID3.update(tags, file.path);
        if (result !== true) {
          throw result;
        }
      }
    } catch (e) {
      console.error("Error while writing lyrics tag:", e);
      return false;
    }

    await MusicFileResolver.updateMD5(file);
    return true;
  }

  @Mutation(returns => MusicFile, { description: "Set which playlist a file belong to, this replaces existing values." })
  public async setPlaylistsOfSong(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("playlistSlugs", () => [String], { description: "Playlists to set" }) playlistSlugs: string[],
  ): Promise<MusicFile> {
    let file: MusicFile, playlists: Playlist[];
    try {
      file = await MusicFile.findByPk(fileId, { rejectOnEmpty: true });
    } catch {
      throw new Error("Music file is not found.");
    }
    try {
      playlists = await Promise.all(playlistSlugs.map((val) => Playlist.findByPk(val, { rejectOnEmpty: true })));
    } catch (e) {
      console.log("playlist lookup error", e);
      throw new Error("Some or all playlist slugs are not found in database.");
    }

    // TODO: throw custom error here

    await file.$set("playlists", playlists);
    const result = await MusicFile.findByPk(fileId);
    const forceId3v2 = result.path.toLowerCase().endsWith(".aiff");
    await ffMetadataWrite(result.fullPath, {
      [PLAYLIST_IDS_TAG]: (await result.$get("playlists")).map((i) => i.slug).join(",")
    }, { preserveStreams: true, forceId3v2: forceId3v2 });

    await MusicFileResolver.updateMD5(file);
    return result;
  }
}
