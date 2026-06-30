import { builder } from "../builder";
import { PlaylistRef, MusicFileRef } from "./refs";
import { literal } from "sequelize";

PlaylistRef.implement({
  fields: (t) => ({
    files: t.field({
      type: [MusicFileRef],
      resolve: (p) =>
        p.$get("files", {
          // Order by the through-table sortOrder column.
          order: [literal("FileInPlaylist.sortOrder asc")],
        }),
    }),
    filesCount: t.int({ resolve: (p) => p.$count("files") }),
    name: t.exposeString("name", { description: "Name of the playlist." }),
    slug: t.exposeID("slug", { description: "Slug of the playlist." }),
  }),
});
