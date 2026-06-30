import { Playlist } from "../../../models/Playlist";
import { MusicFile } from "../../../models/MusicFile";
import { GraphQLError } from "graphql";
import pLimit from "p-limit";
import { builder } from "../builder";
import { PlaylistRef } from "../types/refs";

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
    resolve: () => Playlist.findAll(),
  })
);

builder.queryField("playlist", (t) =>
  t.field({
    type: PlaylistRef,
    nullable: true,
    args: { slug: t.arg.string() },
    resolve: (_root, { slug }) => Playlist.findByPk(slug),
  })
);

builder.mutationField("newPlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: NewPlaylistInput }) },
    resolve: (_root, { data }) => Playlist.create(data as any),
  })
);

builder.mutationField("updatePlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), data: t.arg({ type: UpdatePlaylistInput }) },
    resolve: async (_root, { slug, data }) => {
      const playlist = await Playlist.findByPk(slug);
      if (playlist === null) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      await playlist.update(data as any);
      if (slug !== data.slug) {
        const files = await playlist.$get("files");
        const limit = pLimit(10);
        await Promise.all(
          files.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
        );
      }
      return playlist;
    },
  })
);

builder.mutationField("addFileToPlaylist", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), fileId: t.arg.int() },
    resolve: async (_root, { slug, fileId }) => {
      const playlist = await Playlist.findByPk(slug);
      if (playlist === null) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const musicFile = await MusicFile.findByPk(fileId);
      if (musicFile === null) {
        throw new GraphQLError(
          `Music file with ID ${fileId} is not found in database.`
        );
      }
      const has = await playlist.$has("file", musicFile);
      if (has)
        throw new GraphQLError(
          `Music file ${fileId} is already in playlist ${slug}.`
        );
      const count = await playlist.$count("files");
      await playlist.$add("file", musicFile, { through: { sortOrder: count } });
      await musicFile.updatePlaylistsOfFileAsTags();
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
      const playlist = await Playlist.findByPk(slug);
      if (playlist === null) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const musicFile = await MusicFile.findByPk(fileId);
      if (musicFile === null) {
        throw new GraphQLError(
          `Music file with ID ${fileId} is not found in database.`
        );
      }
      const has = await playlist.$has("file", musicFile);
      if (!has)
        throw new GraphQLError(
          `Music file ${fileId} is not in playlist ${slug}.`
        );
      await playlist.$remove("file", musicFile);
      await musicFile.updatePlaylistsOfFileAsTags();
      return playlist;
    },
  })
);

builder.mutationField("updatePlaylistSortOrder", (t) =>
  t.field({
    type: PlaylistRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), fileIds: t.arg.intList() },
    resolve: async (_root, { slug, fileIds }) => {
      const playlist = await Playlist.findByPk(slug);
      if (playlist === null) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const dummyFileObjs = fileIds.map((v, idx) => {
        const obj = MusicFile.build({ id: v }, { isNewRecord: false });
        obj.FileInPlaylist = { sortOrder: idx } as any;
        return obj;
      });
      await playlist.$add("files", dummyFileObjs);
      return playlist;
    },
  })
);

builder.mutationField("removePlaylist", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { slug: t.arg.string() },
    resolve: async (_root, { slug }) => {
      const playlist = await Playlist.findByPk(slug);
      if (playlist === null) {
        return false;
      }
      const files = await playlist.$get("files");

      await playlist.destroy();

      const limit = pLimit(10);
      await Promise.all(
        files.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
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
      const playlist = await Playlist.findByPk(slug);
      if (playlist === null) {
        throw new GraphQLError(
          `Playlist with slug ${slug} is not found in database.`
        );
      }
      const oldFiles = await playlist.$get("files");
      const fileIdsSet = new Set(fileIds);
      const oldFilesIdSet = new Set(oldFiles.map((v) => v.id));

      const limit = pLimit(10);

      const toRemoveObjs = oldFiles.filter((v) => !fileIdsSet.has(v.id));
      await playlist.$remove("files", toRemoveObjs);
      await Promise.all(
        toRemoveObjs.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
      );

      const dummyFileObjs = fileIds.map((v, idx) => {
        const obj = MusicFile.build({ id: v }, { isNewRecord: false });
        obj.FileInPlaylist = { sortOrder: idx } as any;
        return obj;
      });
      await playlist.$add("files", dummyFileObjs);

      const toAddObjcts = dummyFileObjs.filter((v) => !oldFilesIdSet.has(v.id));
      await Promise.all(
        toAddObjcts.map((i) => limit(async () => i.updatePlaylistsOfFileAsTags()))
      );

      return playlist;
    },
  })
);
