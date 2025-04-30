import { NextFunction, Router, Request, Response } from "express";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";
import { YOHANE_SERVER_URL } from "../utils/secret";
import { MusicFile } from "../models/MusicFile";
import fetch from "node-fetch";
import { Readable } from "stream";
import FormData from "form-data";
import { existsSync, createReadStream } from "fs";
import { basename } from "path";

export class AlignmentController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post("/align", adminOnlyMiddleware, this.align);
    this.router.post("/custom", adminOnlyMiddleware, this.customAlign);
  }

  public align = async (req: Request, res: Response, next: NextFunction) => {
    if (!YOHANE_SERVER_URL) {
      return res.status(500).json({ error: "Yohane server URL is not set" });
    }

    const fileId = req.body.fileId;
    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid fileId" });
    }
    const musicFile = await MusicFile.findByPk(parseInt(fileId));
    if (!musicFile) {
      return res.status(404).json({ error: "Music file not found" });
    }
    const path = musicFile.fullPath;
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
        new URL("/api/ping", YOHANE_SERVER_URL).toString()
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

      // --- Proxy Logic ---
      const formData = new FormData();
      const fileStream = createReadStream(path);
      formData.append("audio", fileStream, {
        filename: basename(path),
        filepath: path,
      });
      formData.append("lyrics", lyricsText);

      const targetUrl = new URL("/api/align", YOHANE_SERVER_URL).toString();

      // Use form-data's getHeaders() for Content-Type with boundary
      const formHeaders = formData.getHeaders();

      const proxyRes = await fetch(targetUrl, {
        method: "POST",
        body: formData,
        headers: {
          // Pass headers from form-data
          ...formHeaders,
        },
      });

      // Check if the proxy request itself failed
      if (!proxyRes.ok) {
        const errorBody = await proxyRes.text();
        console.error(
          `Yohane server alignment error: (${proxyRes.status}) ${errorBody}`
        );
        // Forward the status code and error from the downstream server if possible
        return res.status(proxyRes.status).json({
          error: `Alignment request failed on Yohane server: ${errorBody}`,
        });
      }

      // Check if the response is SSE
      const contentType = proxyRes.headers.get("content-type");
      if (!contentType || !contentType.includes("text/event-stream")) {
        const responseBody = await proxyRes.text();
        console.error(
          `Yohane server returned unexpected content type: ${contentType}. Body: ${responseBody}`
        );
        return res.status(500).json({
          error: `Yohane server returned unexpected response type. Expected text/event-stream, got ${contentType}.`,
        });
      }

      // Stream the SSE response back to the client
      res.writeHead(proxyRes.status, {
        // Use status from proxy response (likely 200)
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Pipe the response body stream using Node.js streams API
      if (proxyRes.body) {
        // Ensure proxyRes.body is a Node.js Readable stream before piping
        const bodyStream = Readable.from(proxyRes.body as any);
        bodyStream.on("data", (chunk: any) => {
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
          // Try to end the response gracefully if possible, though the connection might already be broken
          if (!res.writableEnded) {
            res.end();
          }
        });
      } else {
        console.error("Proxy response body was null, ending response.");
        res.end(); // End the response if there's no body to pipe
      }
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
          })}\n\n`
        );
        res.flush(); // Ensure the error message is sent immediately
        res.end(); // End the stream
      }
    }
  };

  public customAlign = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!YOHANE_SERVER_URL) {
      return res.status(500).json({ error: "Alignment server URL is not set" });
    }

    const fileId = req.body.fileId;
    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({ error: "Invalid fileId" });
    }
    const musicFile = await MusicFile.findByPk(parseInt(fileId));
    if (!musicFile) {
      return res.status(404).json({ error: "Music file not found" });
    }
    const path = musicFile.fullPath;
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
        new URL("/api/ping", YOHANE_SERVER_URL).toString()
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

      // --- Proxy Logic ---
      const formData = new FormData();
      const fileStream = createReadStream(path);
      formData.append("audio", fileStream, {
        filename: basename(path),
        filepath: path,
      });
      formData.append("lyrics", lyricsText);

      const targetUrl = new URL("/api/custom", YOHANE_SERVER_URL).toString();

      // Use form-data's getHeaders() for Content-Type with boundary
      const formHeaders = formData.getHeaders();

      const proxyRes = await fetch(targetUrl, {
        method: "POST",
        body: formData,
        headers: {
          // Pass headers from form-data
          ...formHeaders,
        },
      });

      // Check if the proxy request itself failed
      if (!proxyRes.ok) {
        const errorBody = await proxyRes.text();
        console.error(
          `Alignment server alignment error: (${proxyRes.status}) ${errorBody}`
        );
        // Forward the status code and error from the downstream server if possible
        return res.status(proxyRes.status).json({
          error: `Alignment request failed on Alignment server: ${errorBody}`,
        });
      }

      // Check if the response is SSE
      const contentType = proxyRes.headers.get("content-type");
      if (!contentType || !contentType.includes("text/event-stream")) {
        const responseBody = await proxyRes.text();
        console.error(
          `Yohane server returned unexpected content type: ${contentType}. Body: ${responseBody}`
        );
        return res.status(500).json({
          error: `Yohane server returned unexpected response type. Expected text/event-stream, got ${contentType}.`,
        });
      }

      // Stream the SSE response back to the client
      res.writeHead(proxyRes.status, {
        // Use status from proxy response (likely 200)
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Pipe the response body stream using Node.js streams API
      if (proxyRes.body) {
        // Ensure proxyRes.body is a Node.js Readable stream before piping
        const bodyStream = Readable.from(proxyRes.body as any);
        bodyStream.on("data", (chunk: any) => {
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
          // Try to end the response gracefully if possible, though the connection might already be broken
          if (!res.writableEnded) {
            res.end();
          }
        });
      } else {
        console.error("Proxy response body was null, ending response.");
        res.end(); // End the response if there's no body to pipe
      }
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
          })}\n\n`
        );
        res.flush(); // Ensure the error message is sent immediately
        res.end(); // End the stream
      }
    }
  };
}
