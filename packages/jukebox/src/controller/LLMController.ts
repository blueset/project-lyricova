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
import { CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai"
import { azure } from '@ai-sdk/azure';
import { openrouter } from '@openrouter/ai-sdk-provider';

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

    const client = openrouter(model || OPENAI_MODEL || "gpt-4o");

    const messages = getTranslationAlignmentLLMPrompt(original, translation) as CoreMessage[];
  
    const result = await streamText({
      model: client,
      messages,
      onError: (error) => {
        console.error("Error:", error);
        res.write(
          `data: ${JSON.stringify({ error: error })}\n\n`
        );
        res.flush();
      },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let fullContent = "";

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        res.write(`data: ${JSON.stringify({chunk: chunk.textDelta})}\n\n`);
        res.flush();
      }
      if (chunk.type === "reasoning") {
        res.write(`data: ${JSON.stringify({reasoning: chunk.textDelta})}\n\n`);
        res.flush();
      }
    }
    
    const response: string = await result.text;
    console.log("response", response);
    const parsedResponse = (() => {
      let currentPos = 0;
      while (currentPos < response.length) {
        try {
          const arrayStart = response.indexOf('[', currentPos);
          if (arrayStart === -1) break;
          
          let bracketCount = 1;
          let pos = arrayStart + 1;
          
          while (bracketCount > 0 && pos < response.length) {
            if (response[pos] === '[') bracketCount++;
            if (response[pos] === ']') bracketCount--;
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
      throw new Error('No valid JSON array found in response');
    })();

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
