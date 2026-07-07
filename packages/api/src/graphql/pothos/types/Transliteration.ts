import { builder } from "../builder";
import { FuriganaMappingRef } from "./refs";
import {
  segmentedTransliteration,
  getLanguage,
} from "../../../utils/transliterate";
import { buildAnimationSequence } from "../../../utils/typingSequence";
import { convertMonoruby } from "../../../utils/monoruby";
import { kanaToHira, hiraToRoma } from "../../../utils/kanaUtils";

const LANGUAGE_DESC =
  'Language of the query, choose from "ja", "zh", and "en". Leave blank for auto detection.';

// Pothos type inference degrades under the api's non-strict tsconfig (the
// `notStrict` builder warning). Runtime output is reflected in the committed
// `schema.graphql` (`npm run pothos:emit`), so the localized casts below only
// satisfy tsc.
type Lang = "zh" | "ja" | "en" | undefined;
const asLang = (l?: string | null): Lang => (l ?? undefined) as Lang;

export interface FuriganaLabelShape {
  content: string;
  leftIndex: number;
  rightIndex: number;
}

interface AnimatedWordShape {
  convert: boolean;
  sequence: string[];
}

export const AnimatedWordRef =
  builder.objectRef<AnimatedWordShape>("AnimatedWord");
AnimatedWordRef.implement({
  description: "Describes the animation sequence for a word.",
  fields: (t) => ({
    convert: t.exposeBoolean("convert", {
      description:
        "True if the word shows a conversion-type of animation. False if it is just typing.",
    }),
    sequence: t.exposeStringList("sequence", {
      description: "Actual sequence to show, one frame at a time.",
    }),
  }),
});

export interface TransliterationResultShape {
  text: string;
  furigana: FuriganaLabelShape[][];
}

export const TransliterationResultRef =
  builder.objectRef<TransliterationResultShape>("TransliterationResult");

TransliterationResultRef.implement({
  description: "Result of a transliteration request.",
  fields: (t) => ({
    text: t.exposeString("text", { description: "Original text." }),
    plain: t.string({
      args: {
        language: t.arg.string({ description: LANGUAGE_DESC, required: false }),
      },
      resolve: async (parent, { language }) =>
        (
          await segmentedTransliteration(parent.text, {
            language: asLang(language),
            type: "plain",
            furigana: parent.furigana,
            convertMonoruby,
          })
        )
          .map((v) => v.reduce((prev, curr) => prev + curr[1], ""))
          .join("\n"),
    }),
    plainSegmented: t.field({
      type: t.listRef(t.listRef(t.listRef("String"))),
      args: {
        language: t.arg.string({ description: LANGUAGE_DESC, required: false }),
      },
      resolve: (parent, { language }) =>
        segmentedTransliteration(parent.text, {
          language: asLang(language),
          type: "plain",
          furigana: parent.furigana,
          convertMonoruby,
        }),
    }),
    karaoke: t.field({
      type: t.listRef(t.listRef(t.listRef("String"))),
      args: {
        language: t.arg.string({ description: LANGUAGE_DESC, required: false }),
      },
      resolve: (parent, { language }) =>
        segmentedTransliteration(parent.text, {
          language: asLang(language),
          type: "karaoke",
          furigana: parent.furigana,
          convertMonoruby,
        }),
    }),
    typing: t.field({
      type: t.listRef(t.listRef(t.listRef("String"))),
      args: {
        language: t.arg.string({ description: LANGUAGE_DESC, required: false }),
      },
      resolve: (parent, { language }) =>
        segmentedTransliteration(parent.text, {
          language: asLang(language),
          type: "typing",
          furigana: parent.furigana,
          convertMonoruby,
        }),
    }),
    romaji: t.stringList({
      args: {
        language: t.arg.string({ description: LANGUAGE_DESC, required: false }),
      },
      resolve: async (parent, { language }) => {
        const lines = await segmentedTransliteration(parent.text, {
          language: asLang(language),
          type: "romaji",
          furigana: parent.furigana,
          convertMonoruby,
        });
        return lines.map((line) =>
          line
            .reduce<string[]>((acc, [base, reading]) => {
              const roma = hiraToRoma(kanaToHira(reading));
              if (
                base === reading &&
                !base.match(/^[\s\p{Script=Hiragana}\p{Script=Katakana}ー]+$/gu)
              ) {
                if (acc.length > 0) {
                  acc[acc.length - 1] += roma;
                } else {
                  acc.push(roma);
                }
              } else {
                acc.push(roma);
              }
              return acc;
            }, [])
            .join(" ")
            .replaceAll(/\s+/gu, " "),
        );
      },
    }),
    typingSequence: t.field({
      type: t.listRef(t.listRef(AnimatedWordRef)),
      args: {
        language: t.arg.string({ description: LANGUAGE_DESC, required: false }),
      },
      resolve: async (parent, { language }) => {
        const lang = asLang(language) ?? getLanguage(parent.text);
        const lines = await segmentedTransliteration(parent.text, {
          language: lang,
          type: "typing",
          furigana: parent.furigana,
          convertMonoruby,
        });
        return lines.map((line) => buildAnimationSequence(line, lang));
      },
    }),
  }),
});

FuriganaMappingRef.implement({
  fields: (t) => ({
    furigana: t.exposeString("furigana"),
    segmentedFurigana: t.exposeString("segmentedFurigana", { nullable: true }),
    segmentedText: t.exposeString("segmentedText", { nullable: true }),
    text: t.exposeString("text"),
  }),
});
