import { Router } from "express";
import type { Request, Response } from "express";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import { OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL } from "../utils/secret";
import OpenAI from "openai";
import { getTranslationAlignmentLLMPrompt } from "../utils/llmPrompt";
import { CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";
import { openrouter } from "@openrouter/ai-sdk-provider";

export class LLMController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post(
      "/translation-alignment",
      adminOnlyMiddleware,
      this.translationAlignment
    );
  }

  private async translationAlignment(req: Request, res: Response) {
    const { original, translation, model } = req.body;
    if (!original || !translation) {
      return res
        .status(400)
        .json({ error: "Original and translation are required." });
    }

    // if (!OPENAI_BASE_URL || !OPENAI_API_KEY || !OPENAI_MODEL) {
    //   // throw new Error("OpenAI credentials are not set");
    //   return res
    //     .status(500)
    //     .json({ error: "OpenAI credentials are not set" });
    // }
    // const client = new OpenAI({
    //   baseURL: OPENAI_BASE_URL,
    //   apiKey: OPENAI_API_KEY,
    // });

    const effectiveModel = model || OPENAI_MODEL || "gpt-4o";
    const client = effectiveModel.includes("/")
      ? openrouter(effectiveModel)
      : createAzure({ apiVersion: "2025-03-01-preview" })(effectiveModel);
    const abortController = new AbortController();
    const { signal } = abortController;

    req.on("close", () => {
      console.log("Request aborted");
      abortController.abort();
    });
    res.on("close", () => {
      console.log("Response closed");
      abortController.abort();
    });

    const messages = getTranslationAlignmentLLMPrompt(
      original,
      translation
    ) as CoreMessage[];

    const result = await streamText({
      model: client,
      messages,
      abortSignal: signal,
      onError: (error) => {
        console.error("Error:", error);
        res.write(`data: ${JSON.stringify({ error: error })}\n\n`);
        res.flush();
      },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(": streaming started\n\n");
    res.flush();

    let counter = 0;
    const interval = setInterval(() => {
      res.write(`: heartbeat #${counter++}\n\n`);
      res.flush();
    }, 1000);
    abortController.signal.addEventListener("abort", () => {
      clearInterval(interval);
    });

    for await (const chunk of result.fullStream) {
      console.log("incoming chunk", chunk);
      if (chunk.type === "step-start") {
        res.write(
          `data: ${JSON.stringify({ reasoning: chunk.request.body })}\n\n`
        );
        res.flush();
      } else if (chunk.type === "text-delta") {
        res.write(`data: ${JSON.stringify({ chunk: chunk.textDelta })}\n\n`);
        res.flush();
      } else if (chunk.type === "reasoning") {
        res.write(
          `data: ${JSON.stringify({ reasoning: chunk.textDelta })}\n\n`
        );
        res.flush();
      } else {
        res.write(`: unknown chunk: ${JSON.stringify(chunk)}\n\n`);
        res.flush();
      }
    }

    res.write(": streaming ended, waiting for full text\n\n");
    res.flush();

    const response: string = await result.text;
    console.log("response", response);

    res.write(`: full text response: ${JSON.stringify(response)}\n\n`);
    res.flush();

    try {
      const parsedResponse = (() => {
        let currentPos = 0;
        while (currentPos < response.length) {
          try {
            const arrayStart = response.indexOf("[", currentPos);
            if (arrayStart === -1) break;

            let bracketCount = 1;
            let pos = arrayStart + 1;

            while (bracketCount > 0 && pos < response.length) {
              if (response[pos] === "[") bracketCount++;
              if (response[pos] === "]") bracketCount--;
              pos++;
            }

            if (bracketCount === 0) {
              const arrayStr = response.substring(arrayStart, pos);
              const parsed = JSON.parse(arrayStr);
              if (Array.isArray(parsed)) return parsed;
            }

            currentPos = arrayStart + 1;
          } catch (e) {
            currentPos++;
            continue;
          }
        }
        throw new Error("No valid JSON array found in response");
      })();

      if (!Array.isArray(parsedResponse)) {
        throw new Error("Parsed response is not an array");
      }

      const aligned = (
        parsedResponse as {
          original: string;
          aligned: string;
        }[]
      )
        .map((item) => item.aligned)
        .join("\n");

      res.write(`data: ${JSON.stringify({ aligned })}\n\n`);
      res.flush();
      res.end();
    } catch (e) {
      console.error("Error parsing response:", e);
      res.write(
        `data: ${JSON.stringify({
          error: `Error parsing response: ${e}`,
        })}\n\n`
      );
      res.flush();
      res.end();
      return;
    }
  }
}
