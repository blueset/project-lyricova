import { eq } from "drizzle-orm";
import { builder } from "../builder";
import { db } from "../../../drizzle/client";
import { TagOfEntries } from "../../../drizzle/schema";
import { TagRef, EntryRef } from "./refs";

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
      return rows.map((r) => r.entry) as any;
    },
  }),
}));
