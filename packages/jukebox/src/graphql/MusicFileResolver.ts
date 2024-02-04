import {
  ID3_LYRICS_LANGUAGE,
  MusicFile,
} from "lyricova-common/models/MusicFile";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../utils/secret";
import { writeAsync as ffMetadataWrite } from "lyricova-common/utils/ffmetadata";
import fs from "fs";
import hasha from "hasha";
import pLimit from "p-limit";
import type { WhereOptions } from "sequelize";
import { literal, Op } from "sequelize";
import Path from "path";
import _ from "lodash";
import {
  Arg,
  Args,
  Authorized,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  PubSub,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import type { Publisher } from "type-graphql";
import { PaginationArgs, PaginationInfo } from "./commons";
import { GraphQLError } from "graphql";
import { Playlist } from "lyricova-common/models/Playlist";
import { Song } from "lyricova-common/models/Song";
import { Album } from "lyricova-common/models/Album";
import NodeID3 from "node-id3";
import { swapExt } from "../utils/path";
import { Lyrics } from "lyrics-kit/core";
import { LyricsKitLyrics } from "./LyricsKitObjects";
import type { PubSubSessionPayload } from "./index";

function setDifference<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter((val) => !other.has(val)));
}

function setIntersect<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter((val) => other.has(val)));
}

@ObjectType()
class MusicFilesPaginationEdge {
  @Field()
  cursor: string;

  @Field()
  node: MusicFile;
}

@ObjectType()
export class MusicFilesPagination {
  @Field((type) => Int)
  totalCount: number;

  @Field((type) => [MusicFilesPaginationEdge])
  edges: MusicFilesPaginationEdge[];

  @Field((type) => PaginationInfo)
  pageInfo: PaginationInfo;
}

@ObjectType()
export class MusicFilesScanOutcome {
  @Field((type) => Int)
  added: number;

  @Field((type) => Int)
  deleted: number;

  @Field((type) => Int)
  updated: number;

  @Field((type) => Int)
  unchanged: number;

  @Field((type) => Int)
  total: number;
}

@InputType({ description: "Write metadata to music file." })
class MusicFileInput implements Partial<MusicFile> {
  @Field((type) => Int, {
    description: "ID of corresponding song in database.",
    nullable: true,
  })
  songId?: number;

  @Field((type) => Int, {
    description: "ID of corresponding album in database.",
    nullable: true,
  })
  albumId?: number;

  @Field({ description: "Name of the track stored in file.", nullable: true })
  trackName?: string;

  @Field({
    description: "Sort order key of name of the track stored in file.",
    nullable: true,
  })
  trackSortOrder?: string;

  @Field({ description: "Album of the track stored in file.", nullable: true })
  albumName?: string;

  @Field({
    description: "Sort order key of album of the track stored in file.",
    nullable: true,
  })
  albumSortOrder?: string;

  @Field({ description: "Artist of the track stored in file.", nullable: true })
  artistName?: string;

  @Field({
    description: "Sort order key of artist of the track stored in file.",
    nullable: true,
  })
  artistSortOrder?: string;
}

@InputType({ description: "Music files query options" })
class MusicFilesQueryOptions {
  @Field({ description: "Filter by review status of files", nullable: true })
  needReview?: boolean;
}

@Resolver((of) => MusicFile)
export class MusicFileResolver {
  @Subscription(() => MusicFilesScanOutcome, {
    topics: "MUSIC_FILE_SCAN_PROGRESS",
    filter: ({ payload, args }) => args.sessionId === payload.sessionId,
    nullable: true,
    description:
      "Progress of a `scan`. Session ID is required when performing search.",
  })
  scanProgress(
    @Root() payload: PubSubSessionPayload<MusicFilesScanOutcome>,
    @Arg("sessionId") sessionId: string
  ): MusicFilesScanOutcome | null {
    return payload.data;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => MusicFilesScanOutcome)
  public async scan(
    @Arg("sessionId", { nullable: true }) sessionId: string | null,
    @PubSub("MUSIC_FILE_SCAN_PROGRESS")
    publish: Publisher<PubSubSessionPayload<MusicFilesScanOutcome>>
  ): Promise<MusicFilesScanOutcome> {
    const dryRun = false;
    // Load
    const databaseEntries = await MusicFile.findAll({
      attributes: ["id", "path", "fileSize", "hash", "hasLyrics"],
    });
    const filePaths = glob.sync(`${MUSIC_FILES_PATH}**/*.{mp3,flac,aiff}`, {
      nosort: true,
      nocase: true,
    });
    const knownPathsSet: Set<string> = new Set(
      databaseEntries.map((entry) => MUSIC_FILES_PATH + entry.path)
    );
    const filePathsSet: Set<string> = new Set(filePaths);

    const toAdd = setDifference(filePathsSet, knownPathsSet);
    const toUpdate = setIntersect(knownPathsSet, filePathsSet);
    const toDelete = setDifference(knownPathsSet, filePathsSet);

    // console.log("To add", toAdd);
    // console.log("To update", toUpdate);
    // console.log("To delete", toDelete);

    const total = toAdd.size + toDelete.size + toUpdate.size;
    const progressObj: MusicFilesScanOutcome = {
      added: 0,
      deleted: 0,
      updated: 0,
      unchanged: 0,
      total,
    };
    if (sessionId) await publish({ sessionId, data: progressObj });

    console.log(
      `toAdd: ${toAdd.size}, toUpdate: ${toUpdate.size}, toDelete: ${toDelete.size}`
    );

    // Remove records from database for removed files
    if (toDelete.size && !dryRun) {
      await MusicFile.destroy({ where: { path: { [Op.in]: [...toDelete] } } });
    }

    console.log("entries deleted.");
    progressObj.deleted = toDelete.size;
    if (sessionId) await publish({ sessionId, data: progressObj });

    // Add new files to database
    const limit = pLimit(10);

    if (!dryRun) {
      const entriesToAdd = await Promise.all(
        [...toAdd].map((path) =>
          limit(
            async () =>
              await MusicFile.build({ fullPath: path }).buildSongEntry()
          )
        )
      );

      console.log("entries_to_add done.");

      entriesToAdd.map((entry) =>
        limit(async () => {
          await entry.save();
          if (entry.playlists.length > 0)
            await entry.$set("playlists", entry.playlists);
        })
      );
      progressObj.added += entriesToAdd.length;
      // for (const chunk of chunkArray(entriesToAdd)) {
      //
      //   // console.log(chunk);
      //   await MusicFile.bulkCreate(chunk);
      //   progressObj.added += chunk.length;
      //   if (sessionId) await publish({ sessionId, data: progressObj });
      // }
    }

    console.log("entries added.");

    // update songs into database
    const toUpdateEntries = databaseEntries.filter((entry) =>
      toUpdate.has(MUSIC_FILES_PATH + entry.path)
    );

    console.log("to Update Entries", toUpdateEntries.length);

    if (!dryRun) {
      await Promise.all(
        toUpdateEntries.map((entry) =>
          limit(async () => {
            const res = await entry.updateSongEntry();
            // console.log("Result", res);
            if (res === null) progressObj.unchanged++;
            else progressObj.updated++;
            if (
              sessionId &&
              (progressObj.updated + progressObj.unchanged) % 10 === 0
            )
              await publish({
                sessionId,
                data: progressObj,
              });
          })
        )
      );
    }
    await publish({ sessionId, data: progressObj });

    console.log("entries updated.");

    return progressObj;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => MusicFile, {
    nullable: true,
    description:
      "Scan a single file based on its path. This may create, update or delete an entry.",
  })
  public async scanByPath(
    @Arg("path", { description: "Path to scan relative to MUSIC_DATA_PATH." })
    path: string
  ): Promise<MusicFile | null> {
    const fullPath = Path.resolve(MUSIC_FILES_PATH, path);
    if (fs.existsSync(fullPath)) {
      let file = await MusicFile.findOne({ where: { path } });
      if (file === null) {
        file = MusicFile.build({ path, fullPath });
        await file.buildSongEntry();
        await file.save();
      } else {
        file = await file.updateSongEntry();
      }
      return file;
    } else {
      // Remove entry if exists
      await MusicFile.destroy({ where: { path } });
      return null;
    }
    return null;
  }

  @Query((returns) => MusicFilesPagination)
  public async musicFiles(
    @Args() { first, after }: PaginationArgs,
    @Arg("options", { nullable: true }) options: MusicFilesQueryOptions
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
      where,
    });
    const edges: MusicFilesPaginationEdge[] = result.rows.map((r, idx) => {
      return {
        cursor: `${offset + idx}`,
        node: r,
      };
    });
    const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : after;
    return {
      totalCount: result.count,
      edges,
      pageInfo: {
        endCursor: endCursor,
        hasNextPage: offset + first < result.count,
      },
    };
  }

  @Query((returns) => [MusicFile])
  public async searchMusicFiles(
    @Arg("keywords") keywords: string
  ): Promise<MusicFile[]> {
    return MusicFile.findAll({
      where: literal(
        "match (path, trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder) against (:keywords in boolean mode)"
      ),
      replacements: {
        keywords,
      },
    });
  }

  @Query((returns) => MusicFile, { nullable: true })
  public async musicFile(
    @Arg("id", (type) => Int) id: number
  ): Promise<MusicFile | null> {
    return MusicFile.findByPk(id);
  }

  @Authorized("ADMIN")
  @Mutation((returns) => MusicFile)
  public async writeTagsToMusicFile(
    @Arg("id", (type) => Int) id: number,
    @Arg("data") data: MusicFileInput
  ): Promise<MusicFile> {
    const song = await MusicFile.findByPk(id);
    if (song === null) {
      throw new GraphQLError(`Music file with id ${id} is not found.`);
    }

    // write song file
    await song.writeToFile(data);

    _.assign(song, data);

    // update hash
    song.set({
      hash: await hasha.fromFile(song.fullPath, { algorithm: "md5" }),
    });

    await song.save();
    return song;
  }

  @FieldResolver((type) => [Playlist])
  private async playlists(@Root() musicFile: MusicFile): Promise<Playlist[]> {
    return musicFile.$get("playlists");
  }

  @FieldResolver((type) => Song, { nullable: true })
  private async song(@Root() musicFile: MusicFile): Promise<Song | null> {
    return musicFile.$get("song");
  }

  @FieldResolver((type) => Album, { nullable: true })
  private async album(@Root() musicFile: MusicFile): Promise<Album | null> {
    return musicFile.$get("album");
  }

  @FieldResolver((type) => String, { nullable: true })
  private async lyricsText(
    @Root() musicFile: MusicFile,
    @Arg("ext", { defaultValue: "lrc" }) ext: string
  ): Promise<string | null> {
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

  @FieldResolver((type) => LyricsKitLyrics, { nullable: true })
  private async lyrics(
    @Root() musicFile: MusicFile
  ): Promise<LyricsKitLyrics | null> {
    const filePath = musicFile.fullPath;
    const lrcPath = swapExt(filePath, "lrc");
    const lrcxPath = swapExt(filePath, "lrcx");
    let path: string | null = null;
    let usedType: "lrc" | "lrcx";
    if (fs.existsSync(lrcxPath)) {
      path = lrcxPath;
      usedType = "lrcx";
    } else if (fs.existsSync(lrcPath)) {
      path = lrcPath;
      usedType = "lrc";
    } else {
      console.log("no file is found");
      return null;
    }
    try {
      const buffer = fs.readFileSync(path);
      let content = buffer.toString();

      if (usedType === "lrc") {
        // Transform standard " / " type of translation to LyricsX types.
        content = content.replace(
          /^((?:\[[0-9:.-]+])+)(.+?) \/ (.+)$/gm,
          "$1$2\n$1[tr]$3"
        );
        content = content.replace(
          /^((?:\[[0-9:.-]+])+)(.+?)[\/／](.+)$/gm,
          "$1$2\n$1[tr]〝$3〟"
        );
      }

      const lrcs = new LyricsKitLyrics(new Lyrics(content));
      lrcs.lines = lrcs.lines.filter((l) => isFinite(l.position));
      return lrcs;
    } catch (e) {
      console.error("Error while reading lyrics file:", e);
      return null;
    }
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean, {
    description: "Write lyrics to a separate file",
  })
  public async writeLyrics(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("lyrics", () => String, { description: "Lyrics file content" })
    lyrics: string,
    @Arg("ext", () => String, {
      description: "Lyrics file extension",
      defaultValue: "lrc",
    })
    ext: string
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

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean, {
    description: "Write lyrics to music file as a tag",
  })
  public async writeLyricsToMusicFile(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("lyrics", () => String, { description: "Lyrics content" })
    lyrics: string
  ): Promise<boolean> {
    const file = await MusicFile.findByPk(fileId);
    if (file === null) return false;

    try {
      // Use FFmpeg only for FLAC due to its bug on ID3 lyrics.
      if (file.path.toLowerCase().endsWith(".flac")) {
        const key = "LYRICS";
        // const forceId3v2 = file.path.toLowerCase().endsWith(".aiff");
        const forceId3v2 = false;
        await ffMetadataWrite(
          file.fullPath,
          {
            [key]: lyrics,
          },
          { preserveStreams: true, forceId3v2: forceId3v2 }
        );
      } else {
        // Use node-id3 for ID3
        const tags: NodeID3.Tags = {
          unsynchronisedLyrics: {
            language: ID3_LYRICS_LANGUAGE,
            text: lyrics,
          },
        };

        // Write ID3-Frame into (.mp3) file, returns true or error object
        const result = NodeID3.update(tags, file.fullPath);
        if (result !== true) {
          throw result;
        }
      }
    } catch (e) {
      console.error("Error while writing lyrics tag:", e);
      return false;
    }

    await file.updateMD5();
    return true;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean, { description: "Remove lyrics of a file" })
  public async removeLyrics(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number
  ): Promise<boolean> {
    const file = await MusicFile.findByPk(fileId);
    if (file === null) return false;
    const filePath = file.fullPath;
    const lrcPath = swapExt(filePath, "lrc");
    const lrcxPath = swapExt(filePath, "lrcx");

    try {
      // Delete lyrics files
      fs.unlinkSync(lrcPath);
      fs.unlinkSync(lrcxPath);

      // Clear metadata tags
      const outcome = await this.writeLyricsToMusicFile(fileId, "");
      if (!outcome) return false;

      await file.update({ hasLyrics: false });
    } catch (e) {
      console.error("Error while writing lyrics file:", e);
      return false;
    }

    return true;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => MusicFile, {
    description:
      "Set which playlist a file belong to, this replaces existing values.",
  })
  public async setPlaylistsOfFile(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("playlistSlugs", () => [String], { description: "Playlists to set" })
    playlistSlugs: string[]
  ): Promise<MusicFile> {
    let file: MusicFile, playlists: Playlist[];
    try {
      file = await MusicFile.findByPk(fileId, { rejectOnEmpty: true });
    } catch {
      throw new Error("Music file is not found.");
    }
    try {
      playlists = await Promise.all(
        playlistSlugs.map((val) =>
          Playlist.findByPk(val, { rejectOnEmpty: true })
        )
      );
    } catch (e) {
      console.log("playlist lookup error", e);
      throw new Error("Some or all playlist slugs are not found in database.");
    }

    await file.$set("playlists", playlists);
    const result = await MusicFile.findByPk(fileId);
    await result.updatePlaylistsOfFileAsTags();
    return result;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => MusicFile, {
    description: "Write lyrics to music file as a tag",
  })
  public async toggleMusicFileReviewStatus(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("needReview", () => Boolean, {
      description: "If the file still needs review",
    })
    needReview: boolean
  ): Promise<MusicFile> {
    let file: MusicFile;
    try {
      file = await MusicFile.findByPk(fileId, { rejectOnEmpty: true });
    } catch {
      throw new Error("Music file is not found.");
    }
    await file.update({ needReview });

    return file;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Int, { description: "Bump play count of a file" })
  public async bumpPlayCount(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number
  ): Promise<number> {
    const file = await MusicFile.findByPk(fileId);
    if (file === null) return 0;
    const playCount = file.playCount + 1;
    await file.update({ playCount, lastPlayed: new Date() });
    return playCount;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => MusicFile)
  public async updateMusicFileStats(
    @Arg("fileId", () => Int, { description: "Music file ID" }) fileId: number,
    @Arg("playCount", () => Int, { description: "Play count" })
    playCount: number,
    @Arg("lastPlayed", () => Date, {
      description: "Last played",
      nullable: true,
    })
    lastPlayed: Date | null
  ): Promise<MusicFile> {
    const file = await MusicFile.findByPk(fileId);
    if (file === null) throw new Error("Music file is not found.");
    await file.update({ playCount, lastPlayed });
    return file;
  }

  @Query((returns) => [MusicFile], {
    description: "Get music files added in 30 days",
  })
  public async newMusicFiles(): Promise<MusicFile[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return await MusicFile.findAll({
      where: {
        creationDate: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      order: [["creationDate", "DESC"]],
    });
  }

  @Query((returns) => [MusicFile], {
    description: "Get music files reviewed in 30 days",
  })
  public async recentlyReviewedMusicFiles(): Promise<MusicFile[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return await MusicFile.findAll({
      where: {
        updatedOn: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      order: [["updatedOn", "DESC"]],
    });
  }

  @Query((returns) => [MusicFile], {
    description: "Get music files played in 30 days",
  })
  public async recentMusicFiles(): Promise<MusicFile[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return await MusicFile.findAll({
      where: {
        lastPlayed: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      order: [["lastPlayed", "DESC"]],
    });
  }

  @Query((returns) => [MusicFile], {
    description: "Get music files played the most",
  })
  public async popularMusicFiles(
    @Arg("limit", () => Int, { description: "Limit of results" })
    limit: number
  ): Promise<MusicFile[]> {
    return await MusicFile.findAll({
      where: {
        playCount: {
          [Op.gt]: 0,
        },
      },
      order: [
        ["playCount", "DESC"],
        ["lastPlayed", "DESC"],
      ],
      limit,
    });
  }
}
