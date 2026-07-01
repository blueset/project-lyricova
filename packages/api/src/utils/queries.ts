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
import { inArray, sql } from "drizzle-orm";
import { db } from "../drizzle/client";
import { Entries } from "../drizzle/schema";

/**
 * Correlated condition mirroring the Sequelize `entryListingCondition`
 * requirement that a listed entry has at least one non-deleted main verse
 * (the eager-load INNER JOINs verses filtered to `isMain = true`). Use in a
 * query that joins `Entries`, alongside `isNull(Entries.deletionDate)`.
 */
export const entryHasMainVerse = sql`EXISTS (SELECT 1 FROM Verses AS v WHERE v.entryId = ${Entries.id} AND v.isMain = true AND v.deletionDate IS NULL)`;

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
        where: (v: any, { and, eq, isNull }: any) =>
          and(eq(v.isMain, true), isNull(v.deletionDate)),
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
