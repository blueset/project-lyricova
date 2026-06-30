import { builder } from "../builder";
import { EntryRef } from "../types/refs";
import { Entry } from "../../../models/Entry";
import { Verse } from "../../../models/Verse";
import { Pulse } from "../../../models/Pulse";
import { GraphQLError } from "graphql";
import { segmentedTransliteration } from "../../../utils/transliterate";
import sequelize from "../../../db";

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

builder.queryField("entries", (t) =>
  t.field({
    type: [EntryRef],
    resolve: () =>
      Entry.findAll({
        order: [["recentActionDate", "DESC"]],
        include: ["verses", "tags", "songs", "pulses"],
      }),
  })
);

builder.queryField("entry", (t) =>
  t.field({
    type: EntryRef,
    nullable: true,
    args: { id: t.arg.int() },
    resolve: (_root, { id }) => Entry.findByPk(id),
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
      const tx = await sequelize.transaction();
      try {
        const entry = await Entry.create(
          {
            title,
            producersName,
            vocalistsName,
            comment,
            creationDate,
            recentActionDate: creationDate,
            authorId: ctx.user.id,
          } as any,
          { transaction: tx }
        );
        for await (const verse of verses) {
          const populatedVerse = await populateVerseTypingSequence(verse);
          await entry.$create("verse", populatedVerse, { transaction: tx });
        }
        await entry.$add("song", songIds, { transaction: tx });
        await entry.$add("tag", tagSlugs, { transaction: tx });
        await entry.$add(
          "pulse",
          (pulses ?? []).map((pi) => Pulse.build(pi as any, { isNewRecord: true })),
          { transaction: tx }
        );

        await tx.commit();
        return entry;
      } catch (e) {
        await tx.rollback();
        throw e;
      }
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
      const entry = await Entry.findByPk(id);
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      const tx = await sequelize.transaction();
      const recentActionDate = new Date(
        Math.max(
          creationDate.valueOf(),
          ...(pulses ?? []).map((p) => p.creationDate.valueOf())
        )
      );
      try {
        await entry.update(
          {
            title,
            producersName,
            vocalistsName,
            comment,
            recentActionDate,
          },
          { transaction: tx }
        );
        if (creationDate) {
          entry.changed("creationDate", true);
          entry.set("creationDate", creationDate, { raw: true });
          await entry.save({
            silent: true,
            fields: ["creationDate"],
            transaction: tx,
          });
        }
        const verseObjs: Verse[] = [];
        for await (const v of verses) {
          const vObj = Verse.build(v as any, { isNewRecord: !v.id });
          vObj.update(v as any);

          await vObj.save({ transaction: tx });

          verseObjs.push(vObj);
        }
        await entry.$set("verses", verseObjs, { transaction: tx });
        await entry.$set("songs", songIds, { transaction: tx });
        await entry.$set("tags", tagSlugs, { transaction: tx });
        const pulseObjs: Pulse[] = [];
        for await (const pi of pulses ?? []) {
          const p = Pulse.build(pi as any, { isNewRecord: !pi.id });
          p.changed("creationDate", true);
          p.set("creationDate", pi.creationDate, { raw: true });
          await p.save({
            silent: true,
            fields: pi.id ? ["id", "creationDate"] : ["creationDate"],
            transaction: tx,
          });
          pulseObjs.push(p);
        }
        await entry.$set("pulses", pulseObjs, { transaction: tx });

        await tx.commit();

        await Verse.destroy({ where: { entryId: null } });
        await Pulse.destroy({ where: { entryId: null } });

        return entry;
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    },
  })
);

builder.mutationField("deleteEntry", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) => {
      const entry = await Entry.findByPk(id);
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      await entry.destroy();
      return true;
    },
  })
);

builder.mutationField("bumpEntry", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { id: t.arg.int() },
    resolve: async (_root, { id }) => {
      const entry = await Entry.findByPk(id);
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      const date = new Date();
      const pulse = await Pulse.create({ creationDate: date } as any);
      entry.$add("pulse", pulse);
      entry.recentActionDate = date;
      await entry.save();
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
      const entry = await Entry.findByPk(id);
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      await entry.$create("pulse", {});
      return entry;
    },
  })
);

builder.mutationField("unpulseEntry", (t) =>
  t.field({
    type: EntryRef,
    authScopes: { admin: true },
    args: { id: t.arg.float(), pulseId: t.arg.float() },
    resolve: async (_root, { id, pulseId }) => {
      const entry = await Entry.findByPk(id);
      if (!entry) {
        throw new GraphQLError("Entry not found");
      }
      await entry.$remove("pulse", pulseId);
      await entry.reload({ include: ["pulses"] });
      await entry.update({
        recentActionDate: new Date(
          Math.max(
            entry.creationDate.valueOf(),
            ...entry.pulses.map((p) => p.creationDate.valueOf())
          )
        ),
      });
      return entry;
    },
  })
);
