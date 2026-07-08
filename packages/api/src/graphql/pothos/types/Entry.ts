import { eq } from "drizzle-orm";
import { builder } from "../builder.js";
import { db } from "../../../drizzle/client.js";
import { SongOfEntries, TagOfEntries } from "../../../drizzle/schema.js";
import { SongRef, TagRef } from "./refs.js";

builder.drizzleObjectFields("Entries", (t) => {
  const col = (type: any, name: string, nullable = false) =>
    t.field({ type, nullable, resolve: (e: any) => e[name] });
  return {
    id: col("Float", "id"),
    title: col("String", "title"),
    producersName: col("String", "producersName"),
    vocalistsName: col("String", "vocalistsName"),
    authorId: col("Float", "authorId"),
    comment: col("String", "comment", true),
    creationDate: t.field({
      type: "Timestamp",
      resolve: (e: any) => e.creationDate,
    }),
    recentActionDate: t.field({
      type: "Timestamp",
      resolve: (e: any) => e.recentActionDate,
    }),
    updatedOn: t.field({ type: "Timestamp", resolve: (e: any) => e.updatedOn }),
    author: t.relation("author"),
    pulses: t.relation("pulses", { nullable: true }),
    verses: t.relation("verses", { nullable: true }),
    songs: t.field({
      type: [SongRef],
      nullable: true,
      resolve: async (e: any) => {
        const rows = await db.query.SongOfEntries.findMany({
          where: eq(SongOfEntries.entryId, e.id),
          with: { song: true },
        });
        return rows.map((r) => r.song!);
      },
    }),
    tags: t.field({
      type: [TagRef],
      nullable: true,
      resolve: async (e: any) => {
        const rows = await db.query.TagOfEntries.findMany({
          where: eq(TagOfEntries.entryId, e.id),
          with: { tag: true },
        });
        return rows.map((r) => r.tag!);
      },
    }),
  };
});
