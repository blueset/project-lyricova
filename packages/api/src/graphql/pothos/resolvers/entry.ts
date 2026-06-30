import { and, eq, isNull, notInArray } from "drizzle-orm";
import { builder } from "../builder";
import { EntryRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import {
  Entries,
  Verses,
  Pulses,
  SongOfEntries,
  TagOfEntries,
} from "../../../drizzle/schema";
import { GraphQLError } from "graphql";
import { segmentedTransliteration } from "../../../utils/transliterate";

const PulseInput = builder.inputType("PulseInput", {
  fields: (t) => ({
    id: t.int({ required: false }),
    creationDate: t.field({ type: "Timestamp" }),
  }),
});

const VerseInput = builder.inputType("VerseInput", {
  fields: (t) => ({
    id: t.float({ required: false }),
    language: t.string(),
    isOriginal: t.boolean({ defaultValue: false }),
    isMain: t.boolean({ defaultValue: false }),
    text: t.string(),
    html: t.string({ required: false }),
    stylizedText: t.string({ required: false }),
    typingSequence: t.field({ type: [[["String"]]] as any, defaultValue: [] }),
    translator: t.string({ required: false }),
  }),
});

const EntryInput = builder.inputType("EntryInput", {
  fields: (t) => ({
    title: t.string(),
    producersName: t.string({ required: false }),
    vocalistsName: t.string({ required: false }),
    comment: t.string({ required: false }),
    tagSlugs: t.stringList({ required: false }),
    verses: t.field({ type: [VerseInput] }),
    songIds: t.floatList({ required: false }),
    pulses: t.field({ type: [PulseInput], required: false }),
    creationDate: t.field({ type: "Timestamp", required: false }),
  }),
});

async function populateVerseTypingSequence(verse: any) {
  if (verse.text && !verse.typingSequence?.length) {
    verse.typingSequence = await segmentedTransliteration(verse.text, {
      language: verse.language.startsWith("ja")
        ? "ja"
        : verse.language.startsWith("zh")
        ? "zh"
        : "en",
      type: "typing",
    });
  }
  return verse;
}

function verseValues(v: any) {
  return {
    language: v.language,
    isOriginal: v.isOriginal,
    isMain: v.isMain,
    text: v.text,
    html: v.html ?? null,
    stylizedText: v.stylizedText ?? null,
    translator: v.translator ?? null,
    typingSequence: v.typingSequence ?? [],
  };
}

builder.queryField("entries", (t) =>
  t.field({
    type: [EntryRef],
    resolve: async () =>
      db.query.Entries.findMany({
        orderBy: (e, { desc }) => [desc(e.recentActionDate)],
      }) as any,
  })
);

builder.queryField("entry", (t) =>
  t.field({
    type: EntryRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) =>
      ((await db.query.Entries.findFirst({ where: eq(Entries.id, id) })) ??
        null) as any,
  })
);

builder.mutationField("newEntry", (t) =>
  t.field({
    type: EntryRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: EntryInput }) },
    resolve: async (_root, { data }, ctx) => {
      const {
        title,
        producersName,
        vocalistsName,
        comment,
        tagSlugs,
        verses,
        songIds,
        pulses,
      } = data;
      const creationDate = data.creationDate ?? new Date();
      const now = new Date();

      const entryId = await db.transaction(async (tx) => {
        const inserted = await tx.insert(Entries).values({
          title,
          producersName: producersName ?? null,
          vocalistsName: vocalistsName ?? null,
          comment: comment ?? null,
          creationDate,
          recentActionDate: creationDate,
          updatedOn: now,
          authorId: ctx.user!.id,
        });
        const newId = inserted[0].insertId;

        for (const verse of verses) {
          const populated = await populateVerseTypingSequence(verse);
          await tx.insert(Verses).values({
            ...verseValues(populated),
            entryId: newId,
            creationDate: now,
            updatedOn: now,
          } as any);
        }
        for (const songId of songIds ?? []) {
          await tx.insert(SongOfEntries).values({
            entryId: newId,
            songId,
            creationDate: now,
            updatedOn: now,
          });
        }
        for (const tagId of tagSlugs ?? []) {
          await tx.insert(TagOfEntries).values({
            entryId: newId,
            tagId,
            creationDate: now,
            updatedOn: now,
          });
        }
        for (const pi of pulses ?? []) {
          await tx.insert(Pulses).values({
            entryId: newId,
            creationDate: pi.creationDate,
          });
        }
        return newId;
      });

      return (await db.query.Entries.findFirst({
        where: eq(Entries.id, entryId),
      })) as any;
    },
  })
);

builder.mutationField("updateEntry", (t) =>
  t.field({
    type: EntryRef,
    authScopes: { admin: true },
    args: { id: t.arg.int(), data: t.arg({ type: EntryInput }) },
    resolve: async (_root, { id, data }) => {
      const {
        title,
        producersName,
        vocalistsName,
        creationDate,
        comment,
        tagSlugs,
        verses,
        songIds,
        pulses,
      } = data;
      const existing = await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      });
      if (!existing) {
        throw new GraphQLError("Entry not found");
      }
      const now = new Date();
      const recentActionDate = new Date(
        Math.max(
          creationDate!.valueOf(),
          ...(pulses ?? []).map((p) => p.creationDate.valueOf())
        )
      );

      await db.transaction(async (tx) => {
        await tx
          .update(Entries)
          .set({
            title,
            producersName: producersName ?? null,
            vocalistsName: vocalistsName ?? null,
            comment: comment ?? null,
            recentActionDate,
            creationDate: creationDate ?? existing.creationDate,
            updatedOn: now,
          })
          .where(eq(Entries.id, id));

        // Upsert verses, then orphan any of this entry's verses left out.
        const verseIds: number[] = [];
        for (const v of verses) {
          if (v.id) {
            await tx
              .update(Verses)
              .set({ ...verseValues(v), entryId: id, updatedOn: now } as any)
              .where(eq(Verses.id, v.id));
            verseIds.push(v.id);
          } else {
            const r = await tx.insert(Verses).values({
              ...verseValues(v),
              entryId: id,
              creationDate: now,
              updatedOn: now,
            } as any);
            verseIds.push(r[0].insertId);
          }
        }
        await tx
          .update(Verses)
          .set({ entryId: null })
          .where(
            verseIds.length
              ? and(eq(Verses.entryId, id), notInArray(Verses.id, verseIds))
              : eq(Verses.entryId, id)
          );

        // Replace song + tag associations.
        await tx.delete(SongOfEntries).where(eq(SongOfEntries.entryId, id));
        for (const songId of songIds ?? []) {
          await tx.insert(SongOfEntries).values({
            entryId: id,
            songId,
            creationDate: now,
            updatedOn: now,
          });
        }
        await tx.delete(TagOfEntries).where(eq(TagOfEntries.entryId, id));
        for (const tagId of tagSlugs ?? []) {
          await tx.insert(TagOfEntries).values({
            entryId: id,
            tagId,
            creationDate: now,
            updatedOn: now,
          });
        }

        // Upsert pulses, then orphan any left out.
        const pulseIds: number[] = [];
        for (const pi of pulses ?? []) {
          if (pi.id) {
            await tx
              .update(Pulses)
              .set({ creationDate: pi.creationDate, entryId: id })
              .where(eq(Pulses.id, pi.id));
            pulseIds.push(pi.id);
          } else {
            const r = await tx.insert(Pulses).values({
              entryId: id,
              creationDate: pi.creationDate,
            });
            pulseIds.push(r[0].insertId);
          }
        }
        await tx
          .update(Pulses)
          .set({ entryId: null })
          .where(
            pulseIds.length
              ? and(eq(Pulses.entryId, id), notInArray(Pulses.id, pulseIds))
              : eq(Pulses.entryId, id)
          );
      });

      // Remove rows orphaned above (Sequelize didn't cascade these).
      await db.delete(Verses).where(isNull(Verses.entryId));
      await db.delete(Pulses).where(isNull(Pulses.entryId));

      return (await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      })) as any;
    },
  })
);

builder.mutationField("deleteEntry", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) => {
      const entry = await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      });
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      // Child rows (verses/pulses/song+tag junctions) cascade via FK ON DELETE.
      await db.delete(Entries).where(eq(Entries.id, id));
      return true;
    },
  })
);

builder.mutationField("bumpEntry", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) => {
      const entry = await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      });
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      const date = new Date();
      await db.insert(Pulses).values({ entryId: id, creationDate: date });
      await db
        .update(Entries)
        .set({ recentActionDate: date, updatedOn: new Date() })
        .where(eq(Entries.id, id));
      return true;
    },
  })
);

builder.mutationField("pulseEntry", (t) =>
  t.field({
    type: EntryRef,
    authScopes: { admin: true },
    args: { id: t.arg.float() },
    resolve: async (_root, { id }) => {
      const entry = await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      });
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      await db.insert(Pulses).values({ entryId: id, creationDate: new Date() });
      return (await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      })) as any;
    },
  })
);

builder.mutationField("unpulseEntry", (t) =>
  t.field({
    type: EntryRef,
    authScopes: { admin: true },
    args: { id: t.arg.float(), pulseId: t.arg.float() },
    resolve: async (_root, { id, pulseId }) => {
      const entry = await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      });
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      // $remove orphans the pulse (sets FK null) rather than deleting it.
      await db
        .update(Pulses)
        .set({ entryId: null })
        .where(eq(Pulses.id, pulseId));
      const remaining = await db.query.Pulses.findMany({
        where: eq(Pulses.entryId, id),
      });
      const recentActionDate = new Date(
        Math.max(
          entry.creationDate.valueOf(),
          ...remaining.map((p) => p.creationDate.valueOf())
        )
      );
      await db
        .update(Entries)
        .set({ recentActionDate, updatedOn: new Date() })
        .where(eq(Entries.id, id));
      return (await db.query.Entries.findFirst({
        where: eq(Entries.id, id),
      })) as any;
    },
  })
);
