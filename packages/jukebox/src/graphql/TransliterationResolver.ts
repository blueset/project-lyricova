import { Resolver, Query, ObjectType, Field, Arg } from "type-graphql";
import { GraphQLString } from "graphql";
import { segmentedTransliteration, getLanguage } from "../utils/transliterate";
import { AnimatedWord, buildAnimationSequence } from "../utils/typingSequence";

const LanguageArgOptions = {
  nullable: true,
  description: "Language of the query, choose from \"ja\", \"zh\", and \"en\". Leave blank for auto detection."
};

@ObjectType({ description: "Result of a transliteration request." })
export class TransliterationResult {
  constructor(text: string) {
    this.text = text;
  }

  @Field({ description: "Original text." })
  text: string;

  @Field()
  plain(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): string {
    return segmentedTransliteration(this.text, { language, type: "plain" })
      .map(v => v.reduce((prev, curr) => {
        return prev + curr[1];
      }, ""))
      .join("\n");
  }

  @Field(type => [[[GraphQLString]]])
  plainSegmented(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): [string, string][][] {
    return segmentedTransliteration(this.text, { language, type: "plain" });
  }

  @Field(type => [[[GraphQLString]]])
  karaoke(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): [string, string][][] {
    return segmentedTransliteration(this.text, { language, type: "karaoke" });
  }

  @Field(type => [[[GraphQLString]]])
  typing(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): [string, string][][] {
    return segmentedTransliteration(this.text, { language, type: "typing" });
  }

  @Field(type => [[AnimatedWord]])
  typingSequence(@Arg("language", LanguageArgOptions) language?: "zh" | "ja" | "en"): AnimatedWord[][] {
    language = language ?? getLanguage(this.text);
    const lines = segmentedTransliteration(this.text, { language, type: "typing" });
    return lines.map(line => buildAnimationSequence(line, language));
  }

}

@Resolver()
export class TextureResolver {
  @Query(returns => TransliterationResult)
  transliterate(@Arg("text") text: string): TransliterationResult {
    return new TransliterationResult(text);
  }
}