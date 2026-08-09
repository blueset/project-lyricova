import { Router } from "express";
import type { Request, Response } from "express";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware.js";
import { OPENAI_MODEL } from "../utils/secret.js";
import {
  getFuriganaMappingLLMPrompt,
  getTranslationAlignmentLLMPrompt,
  type FuriganaMappingPromptInput,
} from "../utils/llmPrompt.js";
import { streamText } from "ai";
import type { ModelMessage } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { openrouter } from "@openrouter/ai-sdk-provider";

interface FuriganaMappingResult extends FuriganaMappingPromptInput {
  segmentedText: string;
  segmentedFurigana: string;
}

function getErrorMessage(error: unknown, seen = new Set<unknown>()): string {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (!error || typeof error !== "object" || seen.has(error)) {
    return String(error);
  }

  seen.add(error);
  const value = error as Record<string, unknown>;
  if (value.error) return getErrorMessage(value.error, seen);
  if (typeof value.message === "string") return value.message;
  if (typeof value.responseBody === "string") {
    try {
      return getErrorMessage(JSON.parse(value.responseBody), seen);
    } catch {
      return value.responseBody;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function extractJsonArray(response: string): unknown[] {
  let currentPos = 0;
  while (currentPos < response.length) {
    try {
      const arrayStart = response.indexOf("[", currentPos);
      if (arrayStart === -1) break;

      let bracketCount = 1;
      let pos = arrayStart + 1;
      let inString = false;
      let escaped = false;

      while (bracketCount > 0 && pos < response.length) {
        const char = response[pos];
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = !inString;
        } else if (!inString && char === "[") {
          bracketCount++;
        } else if (!inString && char === "]") {
          bracketCount--;
        }
        pos++;
      }

      if (bracketCount === 0) {
        const parsed = JSON.parse(response.substring(arrayStart, pos));
        if (Array.isArray(parsed)) return parsed;
      }
      currentPos = arrayStart + 1;
    } catch {
      currentPos++;
    }
  }
  throw new Error("No valid JSON array found in response");
}

async function streamLLMResponse(
  req: Request,
  res: Response,
  messages: ModelMessage[],
  modelName: string,
  formatResult: (parsed: unknown[]) => Record<string, unknown>,
) {
  const client = modelName.includes("/")
    ? openrouter(modelName)
    : createAzure({ apiVersion: "2025-03-01-preview" })(modelName);
  const abortController = new AbortController();
  const { signal } = abortController;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let streamFailure: unknown;

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const promptMessages = messages.filter(
    (message) => message.role !== "system",
  );

  req.on("close", () => abortController.abort());
  res.on("close", () => {
    abortController.abort();
    if (heartbeat) clearInterval(heartbeat);
  });

  try {
    const result = await streamText({
      model: client,
      system: system || undefined,
      messages: promptMessages,
      abortSignal: signal,
      onError: (error) => {
        streamFailure = error;
        console.error("Error:", error);
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({ error: getErrorMessage(error) })}\n\n`,
          );
          res.flush();
        }
      },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(": streaming started\n\n");
    res.flush();

    heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
      res.flush();
    }, 1000);

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        res.write(`data: ${JSON.stringify({ chunk: chunk.text })}\n\n`);
        res.flush();
      } else if (chunk.type === "reasoning-delta") {
        res.write(`data: ${JSON.stringify({ reasoning: chunk.text })}\n\n`);
        res.flush();
      }
    }

    clearInterval(heartbeat);
    heartbeat = undefined;
    const response = await result.text;
    const parsed = extractJsonArray(response);
    res.write(`data: ${JSON.stringify(formatResult(parsed))}\n\n`);
    res.flush();
    res.end();
  } catch (error) {
    if (!streamFailure) {
      console.error("Error during LLM streaming:", error);
    }
    if (heartbeat) clearInterval(heartbeat);
    const errorMessage = getErrorMessage(streamFailure ?? error);
    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
      return;
    }
    if (!res.writableEnded) {
      if (!streamFailure) {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      }
      res.end();
    }
  }
}

export class LLMController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post(
      "/translation-alignment",
      adminOnlyMiddleware,
      this.translationAlignment,
    );
    this.router.post(
      "/furigana-mapping",
      adminOnlyMiddleware,
      this.furiganaMapping,
    );
  }

  private async translationAlignment(req: Request, res: Response) {
    const { original, translation, model } = req.body;
    if (!original || !translation) {
      return res
        .status(400)
        .json({ error: "Original and translation are required." });
    }

    const effectiveModel = model || OPENAI_MODEL || "gpt-4o";
    const messages = getTranslationAlignmentLLMPrompt(original, translation);

    await streamLLMResponse(
      req,
      res,
      messages,
      effectiveModel,
      (parsedResponse) => ({
        aligned: (
          parsedResponse as {
            original: string;
            aligned: string;
          }[]
        )
          .map((item) => item.aligned)
          .join("\n"),
      }),
    );
  }

  private async furiganaMapping(req: Request, res: Response) {
    const { mappings, model } = req.body as {
      mappings?: FuriganaMappingPromptInput[];
      model?: string;
    };
    if (
      !Array.isArray(mappings) ||
      mappings.length === 0 ||
      mappings.some(
        (mapping) =>
          !mapping ||
          typeof mapping.text !== "string" ||
          !mapping.text ||
          typeof mapping.furigana !== "string" ||
          !mapping.furigana,
      )
    ) {
      res.status(400).json({ error: "Valid furigana mappings are required." });
      return;
    }

    const effectiveModel = model || OPENAI_MODEL || "gpt-4o";
    await streamLLMResponse(
      req,
      res,
      getFuriganaMappingLLMPrompt(mappings),
      effectiveModel,
      (parsedResponse) => {
        if (parsedResponse.length !== mappings.length) {
          throw new Error(
            `Expected ${mappings.length} mappings, received ${parsedResponse.length}.`,
          );
        }

        const results = parsedResponse as FuriganaMappingResult[];
        results.forEach((result, index) => {
          const input = mappings[index];
          if (
            result.text !== input.text ||
            result.furigana !== input.furigana ||
            typeof result.segmentedText !== "string" ||
            typeof result.segmentedFurigana !== "string" ||
            result.segmentedText.replaceAll(",", "") !== input.text ||
            result.segmentedFurigana.replaceAll(",", "") !== input.furigana ||
            result.segmentedText.split(",").length !==
              result.segmentedFurigana.split(",").length
          ) {
            throw new Error(`Invalid mapping returned for ${input.text}.`);
          }
        });

        return {
          mappings: results
            .map(
              ({ segmentedText, segmentedFurigana }) =>
                `${segmentedText};${segmentedFurigana}`,
            )
            .join("\n"),
        };
      },
    );
  }
}
