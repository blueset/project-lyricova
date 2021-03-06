import { Resolver, Query, ObjectType, Field, Arg, InputType, Int } from "type-graphql";
import { GraphQLString } from "graphql";
import { segmentedTransliteration, getLanguage } from "../utils/transliterate";
import { AnimatedWord, buildAnimationSequence } from "../utils/typingSequence";


@InputType({ description: "Furigana/romaji to words in a lyrics line." })
export class FuriganaLabel {
  @Field({ description: "Furigana/romaji content" })
  content: string;

  @Field(type => Int, { description: "Starting character per Extended Grapheme Cluster (including)" })
  leftIndex: number;

  @Field(type => Int, { description: "Ending character per Extended Grapheme Cluster (excluding)" })
  rightIndex: number;
}


const LanguageArgOptions = {
  nullable: true,
  description: "Language of the query, choose from \"ja\", \"zh\", and \"en\". Leave blank for auto detection."
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

  @Field()
  plain(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): string {
    return segmentedTransliteration(this.text, { language, type: "plain", furigana: this.furigana })
      .map(v => v.reduce((prev, curr) => {
        return prev + curr[1];
      }, ""))
      .join("\n");
  }

  @Field(type => [[[GraphQLString]]])
  plainSegmented(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): [string, string][][] {
    return segmentedTransliteration(this.text, { language, type: "plain", furigana: this.furigana });
  }

  @Field(type => [[[GraphQLString]]])
  karaoke(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): [string, string][][] {
    return segmentedTransliteration(this.text, { language, type: "karaoke", furigana: this.furigana });
  }

  @Field(type => [[[GraphQLString]]])
  typing(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): [string, string][][] {
    return segmentedTransliteration(this.text, { language, type: "typing", furigana: this.furigana });
  }

  @Field(type => [[AnimatedWord]])
  typingSequence(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): AnimatedWord[][] {
    language = language ?? getLanguage(this.text);
    const lines = segmentedTransliteration(this.text, { language, type: "typing", furigana: this.furigana });
    return lines.map(line => buildAnimationSequence(line, language));
  }

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
  @Query(returns => TransliterationResult)
  transliterate(
    @Arg("text") text: string,
    @Arg("furigana", type => [[FuriganaLabel]], { defaultValue: [] }) furigana: FuriganaLabel[][]
  ): TransliterationResult {
    return new TransliterationResult(text, furigana);
  }
}