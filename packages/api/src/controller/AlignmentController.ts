import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import { YOHANE_SERVER_URL } from "../utils/secret";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { MusicFiles } from "../drizzle/schema";
import { fullPathOf } from "../utils/musicFileScan";
import { Readable } from "stream";
import { existsSync, openAsBlob } from "fs";
import { basename } from "path";

export class AlignmentController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post("/align", adminOnlyMiddleware, this.align);
    this.router.post("/custom", adminOnlyMiddleware, this.customAlign);
  }

  private streamAlignmentProxy = async (
    res: Response,
    path: string,
    lyricsText: string,
    endpoint: string,
    serverLabel: string,
  ): Promise<void> => {
    // Build a native multipart body: global FormData + a Blob backed by the
    // audio file (fs.openAsBlob streams it lazily). Do NOT set Content-Type —
    // undici sets the multipart boundary itself.
    const formData = new FormData();
    const audioBlob = await openAsBlob(path);
    formData.append("audio", audioBlob, basename(path));
    formData.append("lyrics", lyricsText);

    const targetUrl = new URL(endpoint, YOHANE_SERVER_URL!).toString();

    const proxyRes = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });

    // Check if the proxy request itself failed
    if (!proxyRes.ok) {
      const errorBody = await proxyRes.text();
      console.error(
        `${serverLabel} alignment error: (${proxyRes.status}) ${errorBody}`,
      );
      res.status(proxyRes.status).json({
        error: `Alignment request failed on ${serverLabel}: ${errorBody}`,
      });
      return;
    }

    // Check if the response is SSE
    const contentType = proxyRes.headers.get("content-type");
    if (!contentType || !contentType.includes("text/event-stream")) {
      const responseBody = await proxyRes.text();
      console.error(
        `Yohane server returned unexpected content type: ${contentType}. Body: ${responseBody}`,
      );
      res.status(500).json({
        error: `Yohane server returned unexpected response type. Expected text/event-stream, got ${contentType}.`,
      });
      return;
    }

    // Stream the SSE response back to the client
    res.writeHead(proxyRes.status, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // proxyRes.body is a WHATWG ReadableStream under native fetch; bridge it to
    // a Node stream and forward each chunk, flushing to defeat buffering.
    if (proxyRes.body) {
      // Response.body is typed as the DOM ReadableStream; cast to the
      // node:stream/web type that Readable.fromWeb expects (they are runtime
      // compatible but nominally distinct in TS).
      const bodyStream = Readable.fromWeb(
        proxyRes.body as unknown as Parameters<typeof Readable.fromWeb>[0],
      );
      bodyStream.on("data", (chunk: Buffer) => {
        res.write(chunk);
        if (typeof res.flush === "function") {
          res.flush();
        }
      });
      bodyStream.on("end", () => {
        res.end();
      });
      bodyStream.on("error", (streamError: Error) => {
        console.error("Error piping SSE stream:", streamError);
        if (!res.writableEnded) {
          res.end();
        }
      });
    } else {
      console.error("Proxy response body was null, ending response.");
      res.end();
    }
  };

  public align = async (req: Request, res: Response, next: NextFunction) => {
    if (!YOHANE_SERVER_URL) {
      return res.status(500).json({ error: "Yohane server URL is not set" });
    }

    const fileId = req.body.fileId;
    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid fileId" });
    }
    const musicFile = await db.query.MusicFiles.findFirst({
      where: eq(MusicFiles.id, parseInt(fileId)),
    });
    if (!musicFile) {
      return res.status(404).json({ error: "Music file not found" });
    }
    if (musicFile.path === null) {
      return res.status(404).json({ status: 404, message: "File not found" });
    }
    const path = fullPathOf(musicFile.path);
    if (!existsSync(path)) {
      return res.status(404).json({ status: 404, message: "File not found" });
    }

    const lyricsText = req.body.lyrics;
    if (!lyricsText) {
      return res.status(400).json({ error: "Lyrics text is required" });
    }

    try {
      // Optional: Ping check (already exists)
      const pingResponse = await fetch(
        new URL("/api/ping", YOHANE_SERVER_URL).toString(),
      );
      if (!pingResponse.ok) {
        // More robust check
        const pingData = await pingResponse.text();
        return res.status(500).json({
          error: `Yohane server ping failed: (${pingResponse.status}) ${pingData}`,
        });
      }
      const pingData = await pingResponse.text();
      if (pingData !== "OK") {
        // Handle cases where status is 200 but body is not "OK"
        return res.status(500).json({
          error: `Yohane server ping response invalid: ${pingData}`,
        });
      }

      // --- Proxy Logic (native fetch + FormData; see streamAlignmentProxy) ---
      await this.streamAlignmentProxy(
        res,
        path,
        lyricsText,
        "/api/align",
        "Yohane server",
      );
    } catch (error) {
      console.error("Error during alignment request proxy:", error);
      // Avoid sending detailed internal errors to the client unless necessary
      if (!res.headersSent) {
        // Only send response if headers haven't been sent (e.g., during initial fetch or setup)
        return res.status(500).json({
          error: `Internal server error processing alignment request: ${error}`,
        });
      } else {
        // If headers are sent (meaning streaming started), we can't send a JSON error.
        console.error("Error occurred after SSE stream started.");
        res.write(
          `data: ${JSON.stringify({
            error: `Internal server error during streaming: ${error}`,
          })}\n\n`,
        );
        res.flush(); // Ensure the error message is sent immediately
        res.end(); // End the stream
      }
    }
  };

  public customAlign = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (!YOHANE_SERVER_URL) {
      return res.status(500).json({ error: "Alignment server URL is not set" });
    }

    const fileId = req.body.fileId;
    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid fileId" });
    }
    const musicFile = await db.query.MusicFiles.findFirst({
      where: eq(MusicFiles.id, parseInt(fileId)),
    });
    if (!musicFile) {
      return res.status(404).json({ error: "Music file not found" });
    }
    if (musicFile.path === null) {
      return res.status(404).json({ status: 404, message: "File not found" });
    }
    const path = fullPathOf(musicFile.path);
    if (!existsSync(path)) {
      return res.status(404).json({ status: 404, message: "File not found" });
    }

    const lyricsText = req.body.lyrics;
    if (!lyricsText) {
      return res.status(400).json({ error: "Lyrics text is required" });
    }

    try {
      // Optional: Ping check (already exists)
      const pingResponse = await fetch(
        new URL("/api/ping", YOHANE_SERVER_URL).toString(),
      );
      if (!pingResponse.ok) {
        // More robust check
        const pingData = await pingResponse.text();
        return res.status(500).json({
          error: `Alignment server ping failed: (${pingResponse.status}) ${pingData}`,
        });
      }
      const pingData = await pingResponse.text();
      if (pingData !== "OK") {
        // Handle cases where status is 200 but body is not "OK"
        return res.status(500).json({
          error: `Alignment server ping response invalid: ${pingData}`,
        });
      }

      // --- Proxy Logic (native fetch + FormData; see streamAlignmentProxy) ---
      await this.streamAlignmentProxy(
        res,
        path,
        lyricsText,
        "/api/custom",
        "Alignment server",
      );
    } catch (error) {
      console.error("Error during alignment request proxy:", error);
      // Avoid sending detailed internal errors to the client unless necessary
      if (!res.headersSent) {
        // Only send response if headers haven't been sent (e.g., during initial fetch or setup)
        return res.status(500).json({
          error: `Internal server error processing alignment request: ${error}`,
        });
      } else {
        // If headers are sent (meaning streaming started), we can't send a JSON error.
        console.error("Error occurred after SSE stream started.");
        res.write(
          `data: ${JSON.stringify({
            error: `Internal server error during streaming: ${error}`,
          })}\n\n`,
        );
        res.flush(); // Ensure the error message is sent immediately
        res.end(); // End the stream
      }
    }
  };
}
