import {
  Resolver,
  Query,
  ObjectType,
  Field,
  Arg,
  InputType,
  Int,
  Authorized,
  Mutation,
} from "type-graphql";
import {
  segmentedTransliteration,
  getLanguage,
} from "../utils/transliterate";
import { buildAnimationSequence } from "../utils/typingSequence";
import { FuriganaMapping } from "../models/FuriganaMapping";
import { convertMonoruby } from "../utils/monoruby";

@ObjectType({ description: "Describes the animation sequence for a word." })
export class AnimatedWord {
  @Field({
    description:
      "True if the word shows a conversion-type of animation. False if it is just typing.",
  })
  convert: boolean;

  @Field((type) => [String], {
    description: "Actual sequence to show, one frame at a time.",
  })
  sequence: string[];
}

@InputType({ description: "Furigana/romaji to words in a lyrics line." })
export class FuriganaLabel {
  @Field({ description: "Furigana/romaji content" })
  content: string;

  @Field((type) => Int, {
    description: "Starting character per Extended Grapheme Cluster (including)",
  })
  leftIndex: number;

  @Field((type) => Int, {
    description: "Ending character per Extended Grapheme Cluster (excluding)",
  })
  rightIndex: number;
}

const LanguageArgOptions = {
  nullable: true,
  description:
    'Language of the query, choose from "ja", "zh", and "en". Leave blank for auto detection.',
};

@ObjectType({ description: "Result of a transliteration request." })
export class TransliterationResult {
  constructor(text: string, furigana: FuriganaLabel[][] = []) {
    this.text = text;
    this.furigana = furigana;
  }

  @Field({ description: "Original text." })
  text: string;
  furigana: FuriganaLabel[][];

  @Field((type) => String)
  async plain(
    @Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"
  ): Promise<string> {
    return (
      await segmentedTransliteration(this.text, {
        language,
        type: "plain",
        furigana: this.furigana,
        convertMonoruby,
      })
    )
      .map((v) =>
        v.reduce((prev, curr) => {
          return prev + curr[1];
        }, "")
      )
      .join("\n");
  }

  @Field((type) => [[[String]]])
  plainSegmented(
    @Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"
  ): Promise<[string, string][][]> {
    return segmentedTransliteration(this.text, {
      language,
      type: "plain",
      furigana: this.furigana,
      convertMonoruby,
    });
  }

  @Field((type) => [[[String]]])
  karaoke(
    @Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"
  ): Promise<[string, string][][]> {
    return segmentedTransliteration(this.text, {
      language,
      type: "karaoke",
      furigana: this.furigana,
      convertMonoruby,
    });
  }

  @Field((type) => [[[String]]])
  typing(
    @Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"
  ): Promise<[string, string][][]> {
    return segmentedTransliteration(this.text, {
      language,
      type: "typing",
      furigana: this.furigana,
      convertMonoruby,
    });
  }

  @Field((type) => [[AnimatedWord]])
  async typingSequence(
    @Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"
  ): Promise<AnimatedWord[][]> {
    language = language ?? getLanguage(this.text);
    const lines = await segmentedTransliteration(this.text, {
      language,
      type: "typing",
      furigana: this.furigana,
      convertMonoruby,
    });
    return lines.map((line) => buildAnimationSequence(line, language));
  }
}

@InputType()
class FuriganaMappingInput implements Partial<FuriganaMapping> {
  @Field()
  text: string;

  @Field()
  furigana: string;

  @Field({ nullable: true })
  segmentedText?: string;

  @Field({ nullable: true })
  segmentedFurigana?: string;
}

@Resolver()
export class TransliterationResolver {
  /**
   * Transliterate text with optional furigana.
   *
   * If this function doesn’t work, check if the following issue has been resolved.
   * https://github.com/MichalLytek/type-graphql/issues/734
   *
   * If not, try modify the following file for a quick fix.
   * node_modules/type-graphql/dist/resolvers/convert-args.js
   * Line 88: return value.map(itemValue => convertValuesToInstances(target, itemValue));
   *
   * @param text
   * @param furigana
   */
  @Query((returns) => TransliterationResult)
  transliterate(
    @Arg("text") text: string,
    @Arg("furigana", (type) => [[FuriganaLabel]], { defaultValue: [] })
    furigana: FuriganaLabel[][]
  ): TransliterationResult {
    return new TransliterationResult(text, furigana);
  }

  @Query((returns) => [FuriganaMapping])
  furiganaMappings(): Promise<FuriganaMapping[]> {
    return FuriganaMapping.findAll();
  }

  @Query((returns) => [FuriganaMapping])
  computeFuriganaMappings(
    @Arg("mapping", (type) => [FuriganaMappingInput]) input: [FuriganaMappingInput]
  ): Partial<FuriganaMapping>[] {
    return input.map(({text, furigana}) => {
      const [textGroups, furiganaGroups] = convertMonoruby(text, furigana);
      if (textGroups.length === 1 && furiganaGroups.length === 1) return null;
      return {
        text,
        furigana,
        segmentedText: textGroups.join(","),
        segmentedFurigana: furiganaGroups.join(","),
      };
    }).filter(a => !!a);
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean)
  async updateFuriganaMappings(
    @Arg("mappings", (type) => [FuriganaMappingInput])
    mappings: FuriganaMappingInput[]
  ): Promise<boolean> {
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
      await FuriganaMapping.upsert({
        text: mapping.text,
        furigana: mapping.furigana,
        segmentedText: mapping.segmentedText,
        segmentedFurigana: mapping.segmentedFurigana,
      });
    }
    return true;
  }
}
