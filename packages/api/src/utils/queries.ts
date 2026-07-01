export const entryListingCondition = {
  attributes: {
    exclude: ["updatedOn"],
  },
  include: [
    {
      association: "verses",
      attributes: ["text", "isMain", "isOriginal", "language"],
      where: {
        isMain: true,
      },
    },
    {
      association: "tags",
      attributes: ["name", "slug", "color"],
      through: {
        attributes: [] as string[],
      },
    },
    {
      association: "pulses",
      attributes: ["creationDate"],
    },
  ],
};

// --- Drizzle entry-listing helper (Phase 5 REST migration) ---
// Mirrors `entryListingCondition`: entries with main verses, tags, and pulses,
// excluding `updatedOn`. Kept alongside the Sequelize export until all consumers
// (Song/Artist/Tag/LyricovaPublic) are migrated.
import { inArray } from "drizzle-orm";
import { db } from "../drizzle/client";
import { Entries } from "../drizzle/schema";

export function mapEntryListing(e: Record<string, any>): Record<string, any> {
  const { updatedOn: _updatedOn, tagOfEntries, verses, pulses, ...cols } = e;
  // Preserve the Sequelize key order: entry columns, verses, tags, pulses.
  return {
    ...cols,
    verses,
    tags: (tagOfEntries ?? []).map((t: any) => t.tag),
    pulses,
  };
}

/** Fetch entries (by id, preserving the given order) in the listing shape. */
export async function fetchEntriesListing(
  entryIds: number[]
): Promise<Record<string, any>[]> {
  if (!entryIds.length) return [];
  const rows = await db.query.Entries.findMany({
    where: inArray(Entries.id, entryIds),
    with: {
      verses: {
        columns: { text: true, isMain: true, isOriginal: true, language: true },
        where: (v: any, { eq }: any) => eq(v.isMain, true),
      },
      pulses: {
        columns: { creationDate: true },
        orderBy: (p: any, { desc }: any) => desc(p.id),
      },
      tagOfEntries: {
        columns: {},
        with: { tag: { columns: { name: true, slug: true, color: true } } },
      },
    },
  });
  const byId = new Map(rows.map((r: any) => [r.id, r]));
  return entryIds
    .map((id) => byId.get(id))
    .filter((r): r is Record<string, any> => !!r)
    .map(mapEntryListing);
}
