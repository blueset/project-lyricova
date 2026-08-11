import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { FontsController } from "./FontsController.js";
import { FONT_MANIFEST } from "../fonts/manifest.js";
import { __clearFontCacheForTests } from "../fonts/server.js";
import { __clearCoverageCacheForTests } from "../fonts/coverage.js";

/**
 * Spins up a real (ephemeral, localhost-only) Express server hosting just
 * `FontsController`, mounted at `/api/fonts` exactly like `routes.ts`
 * does. Exercising it over real HTTP (rather than structural req/res
 * fakes) verifies header casing, status codes, and body delivery exactly
 * as a real client would observe them, without adding a new test
 * framework (no supertest) or a persistent listening port.
 */
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  const controller = new FontsController();
  apiRouter.use("/fonts", controller.router);

  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/api/fonts`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  __clearFontCacheForTests();
  __clearCoverageCacheForTests();
});

describe("GET /api/fonts", () => {
  it("lists every whitelisted font with a working url and metadata", async () => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    const body = (await response.json()) as {
      fonts: Array<{
        id: string;
        url: string;
        contentType: string;
        family: string;
        script: string;
        rawSfnt: boolean;
        eagerFetch: boolean;
        sizeBytes: number | null;
      }>;
    };
    expect(body.fonts).toHaveLength(FONT_MANIFEST.length);
    for (const font of body.fonts) {
      expect(font.url).toBe(`/api/fonts/${font.id}`);
      expect(font.sizeBytes).toBeGreaterThan(0);
      const entry = FONT_MANIFEST.find((e) => e.id === font.id)!;
      expect(font.contentType).toBe(entry.contentType);
      expect(font.family).toBe(entry.family);
      expect(font.script).toBe(entry.script);
      expect(font.rawSfnt).toBe(entry.rawSfnt);
      expect(font.eagerFetch).toBe(entry.eagerFetch);
    }
  });

  it("never exposes Jukebox-owned WOFF2 font ids", async () => {
    const response = await fetch(baseUrl);
    const body = (await response.json()) as {
      fonts: Array<{ id: string }>;
    };
    const ids = body.fonts.map((f) => f.id);
    expect(ids).not.toContain("inter-variable");
    expect(ids).not.toContain("source-han-sans");
    expect(ids).not.toContain("source-han-serif-jp");
  });
});

describe("GET /api/fonts/:fontId", () => {
  it("serves a whitelisted font with correct MIME/cache/ETag/length headers", async () => {
    const entry = FONT_MANIFEST.find((e) => e.id === "mona-sans-latin-otf")!;
    const response = await fetch(`${baseUrl}/${entry.id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(entry.contentType);
    expect(response.headers.get("cache-control")).toBe(
      "public, no-cache, must-revalidate",
    );
    expect(response.headers.get("etag")).toMatch(/^"[0-9a-f]{40}"$/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String(response.headers.get("content-length"))).toBe(
      String(bytes.byteLength),
    );
    expect(bytes.byteLength).toBeGreaterThan(0);
    // glyf-flavored TrueType magic (0x00010000).
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0, 1, 0, 0]);
  });

  it("serves the full Japanese variable OTF", async () => {
    const entry = FONT_MANIFEST.find((e) => e.id === "source-han-sans-vf-otf")!;
    const response = await fetch(`${baseUrl}/${entry.id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/otf");
    expect(Number(response.headers.get("content-length"))).toBeGreaterThan(
      20 * 1024 * 1024,
    );
  });

  it.each([
    "noto-sans-thai-looped-vf-ttf",
    "noto-sans-lao-looped-vf-ttf",
    "noto-sans-devanagari-vf-ttf",
    "noto-sans-hebrew-vf-ttf",
    "noto-sans-arabic-vf-ttf",
  ])("serves the script fallback %s as a raw TTF", async (id) => {
    const response = await fetch(`${baseUrl}/${id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/ttf");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0, 1, 0, 0]);
  });

  it.each(["plangothic-p1-regular-ttf", "plangothic-p2-regular-ttf"])(
    "serves the terminal Han fallback %s as a raw TTF",
    async (id) => {
      const response = await fetch(`${baseUrl}/${id}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("font/ttf");
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Array.from(bytes.subarray(0, 4))).toEqual([0, 1, 0, 0]);
      expect(bytes.byteLength).toBeGreaterThan(10 * 1024 * 1024);
    },
  );

  it.each([
    "source-han-sans-jp-vf",
    "source-han-sans-sc-vf",
    "source-han-sans-tc-vf",
  ])("serves the region subset %s as a raw OTTO OTF", async (id) => {
    const response = await fetch(`${baseUrl}/${id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/otf");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("OTTO");
    expect(bytes.byteLength).toBeGreaterThan(1024 * 1024);
  });

  it("returns 404 with a JSON error for unknown ids without leaking filesystem details", async () => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Unknown font id: does-not-exist" });
  });

  it.each([
    "..%2F..%2F..%2F..%2Fetc%2Fpasswd",
    "..%2F..%2Fetc%2Fpasswd",
    "%2Fetc%2Fpasswd",
    "..%5C..%5Cwindows%5Cwin.ini",
  ])("rejects path traversal payload %s with 404", async (payload) => {
    const response = await fetch(`${baseUrl}/${payload}`);
    expect(response.status).toBe(404);
  });

  it("returns 304 with no body when If-None-Match matches the current ETag", async () => {
    const entry = FONT_MANIFEST.find((e) => e.id === "mona-sans-latin-otf")!;
    const first = await fetch(`${baseUrl}/${entry.id}`);
    const etag = first.headers.get("etag")!;

    const second = await fetch(`${baseUrl}/${entry.id}`, {
      headers: { "If-None-Match": etag },
    });
    expect(second.status).toBe(304);
    const body = await second.arrayBuffer();
    expect(body.byteLength).toBe(0);
    expect(second.headers.get("etag")).toBe(etag);
    expect(second.headers.get("cache-control")).toBe(
      "public, no-cache, must-revalidate",
    );
  });

  it("returns 200 when If-None-Match does not match", async () => {
    const entry = FONT_MANIFEST.find((e) => e.id === "mona-sans-latin-otf")!;
    const response = await fetch(`${baseUrl}/${entry.id}`, {
      headers: { "If-None-Match": '"stale-etag"' },
    });
    expect(response.status).toBe(200);
  });

  it("honors a weak (W/) validator in If-None-Match", async () => {
    const entry = FONT_MANIFEST.find((e) => e.id === "mona-sans-latin-otf")!;
    const first = await fetch(`${baseUrl}/${entry.id}`);
    const etag = first.headers.get("etag")!;

    const second = await fetch(`${baseUrl}/${entry.id}`, {
      headers: { "If-None-Match": `W/${etag}` },
    });
    expect(second.status).toBe(304);
  });

  it("honors a comma-separated If-None-Match list", async () => {
    const entry = FONT_MANIFEST.find((e) => e.id === "mona-sans-latin-otf")!;
    const first = await fetch(`${baseUrl}/${entry.id}`);
    const etag = first.headers.get("etag")!;

    const second = await fetch(`${baseUrl}/${entry.id}`, {
      headers: { "If-None-Match": `"stale", ${etag}` },
    });
    expect(second.status).toBe(304);
  });
});

describe("GET /api/fonts/coverage", () => {
  it("returns per-font coverage ranges with a revalidating ETag, not a 404", async () => {
    const response = await fetch(`${baseUrl}/coverage`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe(
      "public, no-cache, must-revalidate",
    );
    expect(response.headers.get("etag")).toMatch(/^"[0-9a-f]{40}"$/);

    const body = (await response.json()) as {
      fonts: Array<{ id: string; ranges: Array<[number, number]> }>;
    };
    expect(body.fonts.map((f) => f.id)).toEqual(FONT_MANIFEST.map((e) => e.id));
    for (const font of body.fonts) {
      expect(font.ranges.length).toBeGreaterThan(0);
      let previousEnd = Number.NEGATIVE_INFINITY;
      for (const [start, end] of font.ranges) {
        expect(start).toBeLessThanOrEqual(end);
        expect(start).toBeGreaterThan(previousEnd + 1);
        previousEnd = end;
      }
    }
  });

  it("reports the region subsets' representative characters", async () => {
    const response = await fetch(`${baseUrl}/coverage`);
    const body = (await response.json()) as {
      fonts: Array<{ id: string; ranges: Array<[number, number]> }>;
    };
    const rangesFor = (id: string) =>
      body.fonts.find((f) => f.id === id)!.ranges;
    const covers = (id: string, ch: string) =>
      rangesFor(id).some(
        ([s, e]) => ch.codePointAt(0)! >= s && ch.codePointAt(0)! <= e,
      );

    for (const ch of "桜あア") {
      expect(covers("source-han-sans-jp-vf", ch)).toBe(true);
    }
    for (const ch of "简体汉") {
      expect(covers("source-han-sans-sc-vf", ch)).toBe(true);
    }
    for (const ch of "繁體漢") {
      expect(covers("source-han-sans-tc-vf", ch)).toBe(true);
    }
  });

  it("returns 304 with no body when If-None-Match matches the coverage ETag", async () => {
    const first = await fetch(`${baseUrl}/coverage`);
    const etag = first.headers.get("etag")!;

    const second = await fetch(`${baseUrl}/coverage`, {
      headers: { "If-None-Match": etag },
    });
    expect(second.status).toBe(304);
    const body = await second.arrayBuffer();
    expect(body.byteLength).toBe(0);
    expect(second.headers.get("etag")).toBe(etag);
    expect(second.headers.get("cache-control")).toBe(
      "public, no-cache, must-revalidate",
    );
  });

  it("returns 200 when If-None-Match does not match", async () => {
    const response = await fetch(`${baseUrl}/coverage`, {
      headers: { "If-None-Match": '"stale-etag"' },
    });
    expect(response.status).toBe(200);
  });
});
