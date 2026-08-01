import { describe, expect, it, beforeEach } from "vitest";

import { GET } from "./route";
import {
  __clearGlyphWasmCacheForTests,
  loadGlyphWasm,
  resolveGlyphWasmPath,
} from "./wasmFile";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/glyph-renderer/wasm", { headers });
}

describe("glyph renderer WASM byte route", () => {
  beforeEach(() => {
    __clearGlyphWasmCacheForTests();
  });

  it("resolves the built package wasm to an existing .wasm file", () => {
    const wasmPath = resolveGlyphWasmPath();
    expect(wasmPath).toMatch(/glyph_renderer_bg\.wasm$/);
  });

  it("loads real wasm bytes with the correct magic header", async () => {
    const { bytes, etag } = await loadGlyphWasm();
    // '\0asm' magic number.
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x00, 0x61, 0x73, 0x6d]);
    expect(etag).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it("serves the wasm with application/wasm and revalidation caching", async () => {
    const response = await GET(makeRequest() as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/wasm");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, no-cache, must-revalidate",
    );
    expect(response.headers.get("ETag")).toMatch(/^"[0-9a-f]{40}"$/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("returns 304 when If-None-Match matches the current ETag", async () => {
    const first = await GET(makeRequest() as never);
    const etag = first.headers.get("ETag")!;
    const second = await GET(
      makeRequest({ "if-none-match": etag }) as never,
    );
    expect(second.status).toBe(304);
    expect(second.headers.get("Cache-Control")).toBe(
      "public, no-cache, must-revalidate",
    );
  });

  it("treats weak or comma-separated If-None-Match values as matches", async () => {
    const first = await GET(makeRequest() as never);
    const etag = first.headers.get("ETag")!;
    const weakEtag = `W/${etag}`;

    const second = await GET(
      makeRequest({ "if-none-match": `"stale", ${weakEtag}` }) as never,
    );

    expect(second.status).toBe(304);
  });
});
