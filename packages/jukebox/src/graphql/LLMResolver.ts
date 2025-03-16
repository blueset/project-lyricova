import {
  OPENAI_BASE_URL,
  OPENAI_API_KEY,
  OPENAI_MODEL,
} from "lyricova-common/utils/secret";
import { Arg, Authorized, Query, Resolver } from "type-graphql";
import { OpenAI } from "openai";
import { getTranslationAlignmentLLMPrompt } from "../utils/llmPrompt";

@Resolver()
export class LLMResolver {
  @Authorized("ADMIN")
  @Query((returns) => String)
  async translationAlignment(
    @Arg("original") original: string,
    @Arg("translation") translation: string
  ): Promise<string> {
    if (
      !OPENAI_BASE_URL ||
      !OPENAI_API_KEY ||
      !OPENAI_MODEL
    ) {
      throw new Error("OpenAI credentials are not set");
    }
    const client = new OpenAI({
      // endpoint: AZURE_OPENAI_ENDPOINT,
      // deployment: AZURE_OPENAI_DEPLOYMENT_ID,
      baseURL: OPENAI_BASE_URL,
      apiKey: OPENAI_API_KEY,
    });

    const messages = getTranslationAlignmentLLMPrompt(original, translation);
    console.log("messages", JSON.stringify(messages, undefined, 2));

    const response = await client.beta.chat.completions.parse({
      messages,
      model: OPENAI_MODEL || "gpt-4o",
      max_tokens: 4096,
    }, OPENAI_BASE_URL.includes("openai.azure.com") ? {
      headers: {
        "Api-Key": OPENAI_API_KEY,
        "Authorization": "",
      },
      query: {
        "api-version": "2024-10-01-preview",
      }
    } : undefined);
    console.log("response", response.choices[0].message.content);
    const parsedResponse = JSON.parse(response.choices[0].message.content);
    if (!Array.isArray(parsedResponse)) {
      throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
    }
    return (
      parsedResponse as {
        original: string;
        aligned: string;
      }[]
    )
      .map((item) => item.aligned)
      .join("\n");
  }
}
