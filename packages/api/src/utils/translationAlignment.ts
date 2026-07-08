import { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL } from "./secret.js";
import { createOpenAI } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";
import { generateText } from "ai";
import { getTranslationAlignmentLLMPrompt } from "./llmPrompt.js";

/**
 * Align a translation to the original text via an LLM, returning the aligned
 * translation lines joined by newlines. Shared by the GraphQL `translationAlignment`
 * query.
 */
export async function translationAlignment(
  original: string,
  translation: string,
): Promise<string> {
  if (!OPENAI_BASE_URL || !OPENAI_API_KEY || !OPENAI_MODEL) {
    throw new Error("OpenAI credentials are not set");
  }
  const model = OPENAI_BASE_URL.includes("openai.azure.com")
    ? createAzure({
        baseURL: OPENAI_BASE_URL,
        apiKey: OPENAI_API_KEY,
        apiVersion: "2024-10-01-preview",
      })(OPENAI_MODEL)
    : createOpenAI({
        baseURL: OPENAI_BASE_URL,
        apiKey: OPENAI_API_KEY,
      })(OPENAI_MODEL);

  const messages = getTranslationAlignmentLLMPrompt(original, translation);
  console.log("messages", JSON.stringify(messages, undefined, 2));

  const { text } = await generateText({
    model,
    messages,
    maxOutputTokens: 4096,
  });

  console.log("response", text);
  const parsedResponse = JSON.parse(text);
  if (!Array.isArray(parsedResponse)) {
    throw new Error(`Invalid response format: ${text}`);
  }
  return (parsedResponse as { original: string; aligned: string }[])
    .map((item) => item.aligned)
    .join("\n");
}
