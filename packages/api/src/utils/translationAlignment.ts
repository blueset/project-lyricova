import { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL } from "./secret";
import { OpenAI } from "openai";
import { getTranslationAlignmentLLMPrompt } from "./llmPrompt";

/**
 * Align a translation to the original text via an LLM, returning the aligned
 * translation lines joined by newlines. Shared by the GraphQL `translationAlignment`
 * query (TypeGraphQL today, Pothos during the migration).
 */
export async function translationAlignment(
  original: string,
  translation: string
): Promise<string> {
  if (!OPENAI_BASE_URL || !OPENAI_API_KEY || !OPENAI_MODEL) {
    throw new Error("OpenAI credentials are not set");
  }
  const client = new OpenAI({
    baseURL: OPENAI_BASE_URL,
    apiKey: OPENAI_API_KEY,
  });

  const messages = getTranslationAlignmentLLMPrompt(original, translation);
  console.log("messages", JSON.stringify(messages, undefined, 2));

  const response = await client.beta.chat.completions.parse(
    {
      messages,
      model: OPENAI_MODEL || "gpt-4o",
      max_tokens: 4096,
    },
    OPENAI_BASE_URL.includes("openai.azure.com")
      ? {
          headers: {
            "Api-Key": OPENAI_API_KEY,
            Authorization: "",
          },
          query: {
            "api-version": "2024-10-01-preview",
          },
        }
      : undefined
  );
  console.log("response", response.choices[0].message.content);
  const parsedResponse = JSON.parse(response.choices[0].message.content);
  if (!Array.isArray(parsedResponse)) {
    throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
  }
  return (parsedResponse as { original: string; aligned: string }[])
    .map((item) => item.aligned)
    .join("\n");
}
