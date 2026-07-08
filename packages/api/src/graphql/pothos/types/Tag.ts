import { eq } from "drizzle-orm";
import { builder } from "../builder.js";
import { db } from "../../../drizzle/client.js";
import { TagOfEntries } from "../../../drizzle/schema.js";
import { EntryRef } from "./refs.js";

builder.drizzleObjectFields("Tags", (t) => ({
  color: t.field({ type: "String", resolve: (tag: any) => tag.color }),
  name: t.field({ type: "String", resolve: (tag: any) => tag.name }),
  slug: t.field({ type: "ID", resolve: (tag: any) => tag.slug }),
  entries: t.field({
    type: [EntryRef],
    resolve: async (tag: any) => {
      const rows = await db.query.TagOfEntries.findMany({
        where: eq(TagOfEntries.tagId, tag.slug),
        with: { entry: true },
      });
      return rows.map((r) => r.entry!);
    },
  }),
}));
