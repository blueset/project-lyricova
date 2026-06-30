import { ID3_LYRICS_LANGUAGE, MusicFile } from "../../../models/MusicFile";
import glob from "glob";
import { MUSIC_FILES_PATH } from "../../../utils/secret";
import { writeAsync as ffMetadataWrite } from "../../../utils/ffmetadata";
import fs from "fs";
import hasha from "hasha";
import pLimit from "p-limit";
import type { WhereOptions } from "sequelize";
import { literal, Op } from "sequelize";
import { and, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../../drizzle/client";
import { MusicFiles, Playlists, FileInPlaylists } from "../../../drizzle/schema";
import { updatePlaylistsOfFileAsTags } from "../../../utils/musicFileTags";
import Path from "path";
import _ from "lodash";
import { GraphQLError } from "graphql";
import { Playlist } from "../../../models/Playlist";
import NodeID3 from "node-id3";
import { swapExt } from "../../../utils/path";
import { builder } from "../builder";
import { MusicFileRef } from "../types/refs";
import {
  MusicFilesPaginationRef,
  MusicFilesScanOutcomeRef,
  MusicFilesScanOutcomeShape,
  MusicFilesPaginationEdgeShape,
} from "../types/pagination";
import {
  pubsub,
  TOPIC_MUSIC_FILE_SCAN_PROGRESS,
  PubSubSessionPayload,
} from "../pubsub";

function setDifference<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter((val) => !other.has(val)));
}

function setIntersect<T>(self: Set<T>, other: Set<T>): Set<T> {
  return new Set([...self].filter((val) => other.has(val)));
}

const MusicFileInput = builder.inputType("MusicFileInput", {
  description: "Write metadata to music file.",
  fields: (t) => ({
    songId: t.int({
      required: false,
      description: "ID of corresponding song in database.",
    }),
    albumId: t.int({
      required: false,
      description: "ID of corresponding album in database.",
    }),
    trackName: t.string({
      required: false,
      description: "Name of the track stored in file.",
    }),
    trackSortOrder: t.string({
      required: false,
      description: "Sort order key of name of the track stored in file.",
    }),
    albumName: t.string({
      required: false,
      description: "Album of the track stored in file.",
    }),
    albumSortOrder: t.string({
      required: false,
      description: "Sort order key of album of the track stored in file.",
    }),
    artistName: t.string({
      required: false,
      description: "Artist of the track stored in file.",
    }),
    artistSortOrder: t.string({
      required: false,
      description: "Sort order key of artist of the track stored in file.",
    }),
  }),
});

const MusicFilesQueryOptions = builder.inputType("MusicFilesQueryOptions", {
  description: "Music files query options",
  fields: (t) => ({
    needReview: t.boolean({
      required: false,
      description: "Filter by review status of files",
    }),
  }),
});

async function writeLyricsToMusicFileImpl(
  fileId: number,
  lyrics: string
): Promise<boolean> {
  const file = await MusicFile.findByPk(fileId);
  if (file === null) return false;

  try {
    if (file.path.toLowerCase().endsWith(".flac")) {
      const key = "LYRICS";
      const forceId3v2 = false;
      await ffMetadataWrite(
        file.fullPath,
        { [key]: lyrics },
        { preserveStreams: true, forceId3v2 }
      );
    } else {
      const tags: NodeID3.Tags = {
        unsynchronisedLyrics: {
          language: ID3_LYRICS_LANGUAGE,
          text: lyrics,
        },
      };

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

builder.mutationField("scan", (t) =>
  t.field({
    type: MusicFilesScanOutcomeRef,
    authScopes: { admin: true },
    args: { sessionId: t.arg.string({ required: false }) },
    resolve: async (_root, { sessionId }) => {
      const publish = (payload: PubSubSessionPayload<MusicFilesScanOutcomeShape>) =>
        pubsub.publish(TOPIC_MUSIC_FILE_SCAN_PROGRESS, payload);
      const dryRun = false;
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

      const total = toAdd.size + toDelete.size + toUpdate.size;
      const progressObj: MusicFilesScanOutcomeShape = {
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

      if (toDelete.size && !dryRun) {
        await MusicFile.destroy({
          where: {
            path: {
              [Op.in]: [...toDelete].map((p) =>
                p.replace(MUSIC_FILES_PATH, "")
              ),
            },
          },
        });
      }

      console.log("entries deleted.");
      progressObj.deleted = toDelete.size;
      if (sessionId) await publish({ sessionId, data: progressObj });

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
      }

      console.log("entries added.");

      const toUpdateEntries = databaseEntries.filter((entry) =>
        toUpdate.has(MUSIC_FILES_PATH + entry.path)
      );

      console.log("to Update Entries", toUpdateEntries.length);

      if (!dryRun) {
        await Promise.all(
          toUpdateEntries.map((entry) =>
            limit(async () => {
              const res = await entry.updateSongEntry();
              if (res === null) progressObj.unchanged++;
              else progressObj.updated++;
              if (
                sessionId &&
                (progressObj.updated + progressObj.unchanged) % 10 === 0
              )
                await publish({ sessionId, data: progressObj });
            })
          )
        );
      }
      await publish({ sessionId, data: progressObj });

      console.log("entries updated.");

      return progressObj;
    },
  })
);

builder.mutationField("scanByPath", (t) =>
  t.field({
    type: MusicFileRef,
    nullable: true,
    authScopes: { admin: true },
    description:
      "Scan a single file based on its path. This may create, update or delete an entry.",
    args: {
      path: t.arg.string({
        description: "Path to scan relative to MUSIC_DATA_PATH.",
      }),
    },
    resolve: async (_root, { path }) => {
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
        return file as any;
      } else {
        await MusicFile.destroy({ where: { path } });
        return null;
      }
    },
  })
);

builder.queryField("musicFiles", (t) =>
  t.field({
    type: MusicFilesPaginationRef,
    args: {
      after: t.arg.string({ required: false }),
      first: t.arg.int({ defaultValue: 25 }),
      options: t.arg({ type: MusicFilesQueryOptions, required: false }),
    },
    resolve: async (_root, { first, after, options }) => {
      if (after === null || after === undefined) {
        after = "-1";
      }

      const offset = parseInt(after) + 1;

      const whereClause =
        options && options.needReview !== undefined && options.needReview !== null
          ? eq(MusicFiles.needReview, options.needReview)
          : undefined;

      const count = await db.$count(MusicFiles, whereClause);
      const rows = await db.query.MusicFiles.findMany({
        offset,
        limit: first < 0 ? undefined : first,
        where: whereClause,
      });
      const edges: MusicFilesPaginationEdgeShape[] = rows.map((r, idx) => ({
        cursor: `${offset + idx}`,
        node: r,
      }));
      const endCursor =
        edges.length > 0 ? edges[edges.length - 1].cursor : after;
      return {
        totalCount: count,
        edges,
        pageInfo: {
          endCursor: endCursor,
          hasNextPage: offset + first < count,
        },
      };
    },
  })
);

builder.queryField("searchMusicFiles", (t) =>
  t.field({
    type: [MusicFileRef],
    args: { keywords: t.arg.string() },
    resolve: async (_root, { keywords }) =>
      db.query.MusicFiles.findMany({
        where: sql`match (path, trackName, trackSortOrder, artistName, artistSortOrder, albumName, albumSortOrder) against (${keywords} in boolean mode)`,
      }) as any,
  })
);

builder.queryField("musicFile", (t) =>
  t.field({
    type: MusicFileRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) =>
      ((await db.query.MusicFiles.findFirst({ where: eq(MusicFiles.id, id) })) ?? null) as any,
  })
);

builder.mutationField("writeTagsToMusicFile", (t) =>
  t.field({
    type: MusicFileRef,
    authScopes: { admin: true },
    args: { id: t.arg.int(), data: t.arg({ type: MusicFileInput }) },
    resolve: async (_root, { id, data }) => {
      const song = await MusicFile.findByPk(id);
      if (song === null) {
        throw new GraphQLError(`Music file with id ${id} is not found.`);
      }

      await song.writeToFile(data as any);

      _.assign(song, data);

      song.set({
        hash: await hasha.fromFile(song.fullPath, { algorithm: "md5" }),
      });

      await song.save();
      return song as any;
    },
  })
);

builder.mutationField("writeLyrics", (t) =>
  t.boolean({
    authScopes: { admin: true },
    description: "Write lyrics to a separate file",
    args: {
      fileId: t.arg.int({ description: "Music file ID" }),
      lyrics: t.arg.string({ description: "Lyrics file content" }),
      ext: t.arg.string({
        description: "Lyrics file extension",
        defaultValue: "lrc",
      }),
    },
    resolve: async (_root, { fileId, lyrics, ext }) => {
      const file = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!file) return false;
      const lyricsPath = swapExt(Path.resolve(MUSIC_FILES_PATH, file.path), ext);

      try {
        fs.writeFileSync(lyricsPath, lyrics);
        await db
          .update(MusicFiles)
          .set({ hasLyrics: true, updatedOn: new Date() })
          .where(eq(MusicFiles.id, fileId));
      } catch (e) {
        console.error("Error while writing lyrics file:", e);
        return false;
      }

      return true;
    },
  })
);

builder.mutationField("writeLyricsToMusicFile", (t) =>
  t.boolean({
    authScopes: { admin: true },
    description: "Write lyrics to music file as a tag",
    args: {
      fileId: t.arg.int({ description: "Music file ID" }),
      lyrics: t.arg.string({ description: "Lyrics content" }),
    },
    resolve: (_root, { fileId, lyrics }) =>
      writeLyricsToMusicFileImpl(fileId, lyrics),
  })
);

builder.mutationField("removeLyrics", (t) =>
  t.boolean({
    authScopes: { admin: true },
    description: "Remove lyrics of a file",
    args: { fileId: t.arg.int({ description: "Music file ID" }) },
    resolve: async (_root, { fileId }) => {
      const file = await MusicFile.findByPk(fileId);
      if (file === null) return false;
      const lrcPath = swapExt(file.fullPath, "lrc");
      const lrcxPath = swapExt(file.fullPath, "lrcx");

      try {
        fs.unlinkSync(lrcPath);
        fs.unlinkSync(lrcxPath);

        const outcome = await writeLyricsToMusicFileImpl(fileId, "");
        if (!outcome) return false;

        await file.update({ hasLyrics: false });
      } catch (e) {
        console.error("Error while writing lyrics file:", e);
        return false;
      }

      return true;
    },
  })
);

builder.mutationField("setPlaylistsOfFile", (t) =>
  t.field({
    type: MusicFileRef,
    authScopes: { admin: true },
    description:
      "Set which playlist a file belong to, this replaces existing values.",
    args: {
      fileId: t.arg.int({ description: "Music file ID" }),
      playlistSlugs: t.arg.stringList({ description: "Playlists to set" }),
    },
    resolve: async (_root, { fileId, playlistSlugs }) => {
      const file = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!file) {
        throw new Error("Music file is not found.");
      }
      const playlists = await db.query.Playlists.findMany({
        where: inArray(Playlists.slug, playlistSlugs),
      });
      if (playlists.length !== playlistSlugs.length) {
        throw new Error("Some or all playlist slugs are not found in database.");
      }

      // Replace the file's playlist memberships (mirrors Sequelize $set).
      const now = new Date();
      await db.delete(FileInPlaylists).where(eq(FileInPlaylists.fileId, fileId));
      for (const slug of playlistSlugs) {
        await db.insert(FileInPlaylists).values({
          fileId,
          playlistId: slug,
          sortOrder: 0,
          creationDate: now,
          updatedOn: now,
        });
      }
      await updatePlaylistsOfFileAsTags(fileId);
      return (await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      })) as any;
    },
  })
);

builder.mutationField("toggleMusicFileReviewStatus", (t) =>
  t.field({
    type: MusicFileRef,
    authScopes: { admin: true },
    description: "Write lyrics to music file as a tag",
    args: {
      fileId: t.arg.int({ description: "Music file ID" }),
      needReview: t.arg.boolean({
        description: "If the file still needs review",
      }),
    },
    resolve: async (_root, { fileId, needReview }) => {
      const file = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!file) {
        throw new Error("Music file is not found.");
      }
      await db
        .update(MusicFiles)
        .set({ needReview, updatedOn: new Date() })
        .where(eq(MusicFiles.id, fileId));
      return (await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      })) as any;
    },
  })
);

builder.mutationField("bumpPlayCount", (t) =>
  t.int({
    authScopes: { admin: true },
    description: "Bump play count of a file",
    args: { fileId: t.arg.int({ description: "Music file ID" }) },
    resolve: async (_root, { fileId }) => {
      const file = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!file) return 0;
      const playCount = file.playCount + 1;
      // silent: preserve updatedOn.
      await db
        .update(MusicFiles)
        .set({ playCount, lastPlayed: new Date() })
        .where(eq(MusicFiles.id, fileId));
      return playCount;
    },
  })
);

builder.mutationField("updateMusicFileStats", (t) =>
  t.field({
    type: MusicFileRef,
    authScopes: { admin: true },
    args: {
      fileId: t.arg.int({ description: "Music file ID" }),
      playCount: t.arg.int({ description: "Play count" }),
      lastPlayed: t.arg({
        type: "Timestamp",
        required: false,
        description: "Last played",
      }),
    },
    resolve: async (_root, { fileId, playCount, lastPlayed }) => {
      const file = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!file) throw new Error("Music file is not found.");
      await db
        .update(MusicFiles)
        .set({ playCount, lastPlayed: lastPlayed ?? null, updatedOn: new Date() })
        .where(eq(MusicFiles.id, fileId));
      return (await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      })) as any;
    },
  })
);

builder.queryField("newMusicFiles", (t) =>
  t.field({
    type: [MusicFileRef],
    description: "Get music files added in 30 days",
    resolve: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return db.query.MusicFiles.findMany({
        where: gte(MusicFiles.creationDate, thirtyDaysAgo),
        orderBy: [desc(MusicFiles.creationDate)],
      }) as any;
    },
  })
);

builder.queryField("recentlyReviewedMusicFiles", (t) =>
  t.field({
    type: [MusicFileRef],
    description: "Get music files reviewed in 30 days",
    resolve: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return db.query.MusicFiles.findMany({
        where: gte(MusicFiles.updatedOn, thirtyDaysAgo),
        orderBy: [desc(MusicFiles.updatedOn)],
      }) as any;
    },
  })
);

builder.queryField("recentMusicFiles", (t) =>
  t.field({
    type: [MusicFileRef],
    description: "Get music files played in 30 days",
    resolve: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return db.query.MusicFiles.findMany({
        where: gte(MusicFiles.lastPlayed, thirtyDaysAgo),
        orderBy: [desc(MusicFiles.lastPlayed)],
      }) as any;
    },
  })
);

builder.queryField("popularMusicFiles", (t) =>
  t.field({
    type: [MusicFileRef],
    description: "Get music files played the most",
    args: { limit: t.arg.int({ description: "Limit of results" }) },
    resolve: async (_root, { limit }) =>
      db.query.MusicFiles.findMany({
        where: gt(MusicFiles.playCount, 0),
        orderBy: [desc(MusicFiles.playCount), desc(MusicFiles.lastPlayed)],
        limit,
      }) as any,
  })
);
