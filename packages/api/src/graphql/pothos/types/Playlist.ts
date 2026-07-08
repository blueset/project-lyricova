import { eq } from "drizzle-orm";
import { builder } from "../builder.js";
import { db } from "../../../drizzle/client.js";
import { FileInPlaylists } from "../../../drizzle/schema.js";
import { MusicFileRef } from "./refs.js";

builder.drizzleObjectFields("Playlists", (t) => ({
  slug: t.field({
    type: "ID",
    description: "Slug of the playlist.",
    resolve: (p: any) => p.slug,
  }),
  name: t.field({
    type: "String",
    description: "Name of the playlist.",
    resolve: (p: any) => p.name,
  }),
  files: t.field({
    type: [MusicFileRef],
    resolve: async (p: any) => {
      const rows = await db.query.FileInPlaylists.findMany({
        where: eq(FileInPlaylists.playlistId, p.slug),
        with: { file: true },
        orderBy: (fip, { asc }) => [asc(fip.sortOrder)],
      });
      return rows.map((r) => ({ ...r.file, FileInPlaylist: r })) as any;
    },
  }),
  filesCount: t.int({
    resolve: (p: any) =>
      db.$count(FileInPlaylists, eq(FileInPlaylists.playlistId, p.slug)),
  }),
}));
