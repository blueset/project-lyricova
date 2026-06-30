import { Arg, Authorized, Query, Resolver } from "type-graphql";
import { translationAlignment } from "../utils/translationAlignment";

@Resolver()
export class LLMResolver {
  @Authorized("ADMIN")
  @Query((returns) => String)
  async translationAlignment(
    @Arg("original") original: string,
    @Arg("translation") translation: string
  ): Promise<string> {
    return translationAlignment(original, translation);
  }
}
