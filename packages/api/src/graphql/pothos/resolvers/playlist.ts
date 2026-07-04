import { and, eq, inArray } from "drizzle-orm";
import { GraphQLError } from "graphql";
import pLimit from "p-limit";
import { builder } from "../builder";
import { PlaylistRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Playlists, FileInPlaylists, MusicFiles } from "../../../drizzle/schema";
import { updatePlaylistsOfFileAsTags } from "../../../utils/musicFileTags";

const NewPlaylistInput = builder.inputType("NewPlaylistInput", {
  fields: (t) => ({
    slug: t.string(),
    name: t.string(),
  }),
});

const UpdatePlaylistInput = builder.inputType("UpdatePlaylistInput", {
  fields: (t) => ({
    slug: t.string({ required: false }),
    name: t.string({ required: false }),
  }),
});

builder.queryField("playlists", (t) =>
  t.field({
    type: [PlaylistRef],
    resolve: async () => db.query.Playlists.findMany(),
  })
);

builder.queryField("playlist", (t) =>
  t.field({
    type: PlaylistRef,
    nullable: true,
    args: { slug: t.arg.string() },
    resolve: async (_root, { slug }) =>
      ((await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      })) ?? null),
  })
);

builder.mutationField("newPlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: NewPlaylistInput }) },
    resolve: async (_root, { data }) => {
      const now = new Date();
      await db.insert(Playlists).values({
        slug: data.slug,
        name: data.name,
        createdAt: now,
        updatedAt: now,
      });
      return (await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, data.slug),
      }))!;
    },
  })
);

builder.mutationField("updatePlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), data: t.arg({ type: UpdatePlaylistInput }) },
    resolve: async (_root, { slug, data }) => {
      const playlist = await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      });
      if (!playlist) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (data.slug !== undefined && data.slug !== null) set.slug = data.slug;
      if (data.name !== undefined && data.name !== null) set.name = data.name;
      await db.update(Playlists).set(set).where(eq(Playlists.slug, slug));
      const newSlug = data.slug ?? slug;
      if (slug !== newSlug) {
        const files = await db.query.FileInPlaylists.findMany({
          columns: { fileId: true },
          where: eq(FileInPlaylists.playlistId, newSlug),
        });
        const limit = pLimit(10);
        await Promise.all(
          files.map((i) =>
            limit(async () => updatePlaylistsOfFileAsTags(i.fileId!))
          )
        );
      }
      return (await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, newSlug),
      }))!;
    },
  })
);

builder.mutationField("addFileToPlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), fileId: t.arg.int() },
    resolve: async (_root, { slug, fileId }) => {
      const playlist = await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      });
      if (!playlist) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const musicFile = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!musicFile) {
        throw new GraphQLError(
          `Music file with ID ${fileId} is not found in database.`
        );
      }
      const existing = await db.query.FileInPlaylists.findFirst({
        where: and(
          eq(FileInPlaylists.playlistId, slug),
          eq(FileInPlaylists.fileId, fileId)
        ),
      });
      if (existing)
        throw new GraphQLError(
          `Music file ${fileId} is already in playlist ${slug}.`
        );
      const count = await db.$count(
        FileInPlaylists,
        eq(FileInPlaylists.playlistId, slug)
      );
      const now = new Date();
      await db.insert(FileInPlaylists).values({
        playlistId: slug,
        fileId,
        sortOrder: count,
        creationDate: now,
        updatedOn: now,
      });
      await updatePlaylistsOfFileAsTags(fileId);
      return playlist;
    },
  })
);

builder.mutationField("removeFileFromPlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), fileId: t.arg.int() },
    resolve: async (_root, { slug, fileId }) => {
      const playlist = await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      });
      if (!playlist) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const musicFile = await db.query.MusicFiles.findFirst({
        where: eq(MusicFiles.id, fileId),
      });
      if (!musicFile) {
        throw new GraphQLError(
          `Music file with ID ${fileId} is not found in database.`
        );
      }
      const existing = await db.query.FileInPlaylists.findFirst({
        where: and(
          eq(FileInPlaylists.playlistId, slug),
          eq(FileInPlaylists.fileId, fileId)
        ),
      });
      if (!existing)
        throw new GraphQLError(
          `Music file ${fileId} is not in playlist ${slug}.`
        );
      await db
        .delete(FileInPlaylists)
        .where(
          and(
            eq(FileInPlaylists.playlistId, slug),
            eq(FileInPlaylists.fileId, fileId)
          )
        );
      await updatePlaylistsOfFileAsTags(fileId);
      return playlist;
    },
  })
);

async function upsertFileSortOrder(
  slug: string,
  fileId: number,
  sortOrder: number
) {
  const now = new Date();
  await db
    .insert(FileInPlaylists)
    .values({
      playlistId: slug,
      fileId,
      sortOrder,
      creationDate: now,
      updatedOn: now,
    })
    .onDuplicateKeyUpdate({ set: { sortOrder, updatedOn: now } });
}

builder.mutationField("updatePlaylistSortOrder", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), fileIds: t.arg.intList() },
    resolve: async (_root, { slug, fileIds }) => {
      const playlist = await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      });
      if (!playlist) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      for (let idx = 0; idx < fileIds.length; idx++) {
        await upsertFileSortOrder(slug, fileIds[idx], idx);
      }
      return playlist;
    },
  })
);

builder.mutationField("removePlaylist", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { slug: t.arg.string() },
    resolve: async (_root, { slug }) => {
      const playlist = await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      });
      if (!playlist) {
        return false;
      }
      const files = await db.query.FileInPlaylists.findMany({
        columns: { fileId: true },
        where: eq(FileInPlaylists.playlistId, slug),
      });

      // FileInPlaylist rows cascade via FK ON DELETE.
      await db.delete(Playlists).where(eq(Playlists.slug, slug));

      const limit = pLimit(10);
      await Promise.all(
        files.map((i) =>
          limit(async () => updatePlaylistsOfFileAsTags(i.fileId!))
        )
      );
      return true;
    },
  })
);

builder.mutationField("updatePlaylistFiles", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), fileIds: t.arg.intList() },
    resolve: async (_root, { slug, fileIds }) => {
      const playlist = await db.query.Playlists.findFirst({
        where: eq(Playlists.slug, slug),
      });
      if (!playlist) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const oldRows = await db.query.FileInPlaylists.findMany({
        columns: { fileId: true },
        where: eq(FileInPlaylists.playlistId, slug),
      });
      const oldFileIds = oldRows.map((v) => v.fileId!);
      const fileIdsSet = new Set(fileIds);
      const oldFilesIdSet = new Set(oldFileIds);

      const limit = pLimit(10);

      // Remove files no longer present.
      const toRemove = oldFileIds.filter((v) => !fileIdsSet.has(v));
      if (toRemove.length) {
        await db
          .delete(FileInPlaylists)
          .where(
            and(
              eq(FileInPlaylists.playlistId, slug),
              inArray(FileInPlaylists.fileId, toRemove)
            )
          );
      }
      await Promise.all(
        toRemove.map((id) => limit(async () => updatePlaylistsOfFileAsTags(id)))
      );

      // Add / update sort order for the desired set.
      for (let idx = 0; idx < fileIds.length; idx++) {
        await upsertFileSortOrder(slug, fileIds[idx], idx);
      }

      // Update tags only for newly added files (mirrors original).
      const toAdd = fileIds.filter((v) => !oldFilesIdSet.has(v));
      await Promise.all(
        toAdd.map((id) => limit(async () => updatePlaylistsOfFileAsTags(id)))
      );

      return playlist;
    },
  })
);
