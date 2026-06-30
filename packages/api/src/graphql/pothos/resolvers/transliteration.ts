import { builder } from "../builder";
import { TransliterationResultRef } from "../types/Transliteration";
import { FuriganaMappingRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { FuriganaMappings } from "../../../drizzle/schema";
import { convertMonoruby } from "../../../utils/monoruby";

const FuriganaLabelInput = builder.inputType("FuriganaLabel", {
  description: "Furigana/romaji to words in a lyrics line.",
  fields: (t) => ({
    content: t.string({ description: "Furigana/romaji content" }),
    leftIndex: t.int({
      description:
        "Starting character per Extended Grapheme Cluster (including)",
    }),
    rightIndex: t.int({
      description:
        "Ending character per Extended Grapheme Cluster (excluding)",
    }),
  }),
});

const FuriganaMappingInputRef = builder.inputType("FuriganaMappingInput", {
  fields: (t) => ({
    text: t.string(),
    furigana: t.string(),
    segmentedText: t.string({ required: false }),
    segmentedFurigana: t.string({ required: false }),
  }),
});

builder.queryField("transliterate", (t) =>
  t.field({
    type: TransliterationResultRef,
    args: {
      text: t.arg.string(),
      furigana: t.arg({ type: [[FuriganaLabelInput]] as any, defaultValue: [] }),
    },
    resolve: (_root, { text, furigana }) => ({
      text,
      furigana: (furigana ?? []) as { content: string; leftIndex: number; rightIndex: number }[][],
    }),
  })
);

builder.queryField("furiganaMappings", (t) =>
  t.field({
    type: [FuriganaMappingRef],
    resolve: async () => db.query.FuriganaMappings.findMany() as any,
  })
);

builder.queryField("computeFuriganaMappings", (t) =>
  t.field({
    type: [FuriganaMappingRef],
    args: { mapping: t.arg({ type: [FuriganaMappingInputRef] }) },
    resolve: (_root, { mapping }) =>
      mapping
        .map(({ text, furigana }) => {
          const [textGroups, furiganaGroups] = convertMonoruby(text, furigana);
          if (textGroups.length === 1 && furiganaGroups.length === 1)
            return null;
          return {
            text,
            furigana,
            segmentedText: textGroups.join(","),
            segmentedFurigana: furiganaGroups.join(","),
          };
        })
        .filter((a): a is NonNullable<typeof a> => !!a) as any,
  })
);

builder.mutationField("updateFuriganaMappings", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { mappings: t.arg({ type: [FuriganaMappingInputRef] }) },
    resolve: async (_root, { mappings }) => {
      let errors = "";
      for (const mapping of mappings) {
        if (!mapping.text) {
          errors += `${mapping.text}, ${mapping.furigana}: Text is required.\n`;
        }
        if (!mapping.furigana) {
          errors += `${mapping.text}, ${mapping.furigana}: Furigana is required.\n`;
        }
        if (
          (mapping.segmentedText && !mapping.segmentedFurigana) ||
          (!mapping.segmentedText && mapping.segmentedFurigana)
        ) {
          errors += `${mapping.text}, ${mapping.furigana}: Both segmentedText and segmentedFurigana are required.\n`;
        }
        if (
          mapping.segmentedText?.split(",").length !==
          mapping.segmentedFurigana?.split(",").length
        ) {
          errors += `${mapping.text}, ${mapping.furigana}: segmentedText and segmentedFurigana must have the same number of segments.\n`;
        }
      }
      if (errors) {
        throw new Error(errors);
      }
      for (const mapping of mappings) {
        await db
          .insert(FuriganaMappings)
          .values({
            text: mapping.text,
            furigana: mapping.furigana,
            segmentedText: mapping.segmentedText ?? null,
            segmentedFurigana: mapping.segmentedFurigana ?? null,
          })
          .onDuplicateKeyUpdate({
            set: {
              segmentedText: mapping.segmentedText ?? null,
              segmentedFurigana: mapping.segmentedFurigana ?? null,
            },
          });
      }
      return true;
    },
  })
);
