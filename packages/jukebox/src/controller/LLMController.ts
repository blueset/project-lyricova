import { Router } from "express";
import type { Request, Response } from "express";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import {
  OPENAI_BASE_URL,
  OPENAI_API_KEY,
  OPENAI_MODEL,
} from "lyricova-common/utils/secret";
import OpenAI from "openai";
import { getTranslationAlignmentLLMPrompt } from "../utils/llmPrompt";

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
    const { original, translation } = req.body;
    if (!original || !translation) {
      return res
        .status(400)
        .json({ error: "Original and translation are required." });
    }

    if (!OPENAI_BASE_URL || !OPENAI_API_KEY || !OPENAI_MODEL) {
      // throw new Error("OpenAI credentials are not set");
      return res
        .status(500)
        .json({ error: "OpenAI credentials are not set" });
    }
    const client = new OpenAI({
      baseURL: OPENAI_BASE_URL,
      apiKey: OPENAI_API_KEY,
    });

    const messages = getTranslationAlignmentLLMPrompt(original, translation);
    console.log("messages", JSON.stringify(messages, undefined, 2));

    const stream = await client.beta.chat.completions.stream(
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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0].delta.content;
      if (chunkContent) {
        res.write(`data: ${JSON.stringify({chunk: chunkContent})}\n\n`);
        res.flush();
      }
    }

    const response = await stream.finalChatCompletion();
    
    console.log("response", response.choices[0].message.content);
    const parsedResponse = JSON.parse(response.choices[0].message.content);
    if (!Array.isArray(parsedResponse)) {
      // throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
      res.write(
        `data: ${JSON.stringify({ error: `Invalid response format: ${JSON.stringify(response)}` })}\n\n`
      );
      res.flush();
      res.end();
      return;
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
  }
}
