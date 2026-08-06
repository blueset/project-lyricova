import { NextResponse, type NextRequest } from "next/server";

import { loadGlyphWasm } from "./wasmFile";

/**
 * Serves the built `@lyricova/glyph-renderer` WASM binary with the
 * `application/wasm` MIME type so wasm-bindgen can stream-instantiate it
 * (`WebAssembly.instantiateStreaming`).
 *
 * This is the whitelisted local WASM byte route the Glyph Canvas renderer
 * fetches from (see `fontLoader.ts`), used because the default
 * `new URL('glyph_renderer_bg.wasm', import.meta.url)` asset resolution is not
 * dependable across Next.js bundling modes. The binary is read from the
 * already-built package - never copied or embedded.
 */
export const runtime = "nodejs";

const CACHE_CONTROL = "public, no-cache, must-revalidate";

function normalizeEtag(etag: string): string {
  return etag.replace(/^W\//, "");
}

function matchesIfNoneMatch(
  ifNoneMatch: string | null,
  currentEtag: string,
): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || normalizeEtag(value) === currentEtag);
}

export async function GET(request: NextRequest) {
  let loaded;
  try {
    loaded = await loadGlyphWasm();
  } catch (error) {
    return NextResponse.json(
      { error: `Glyph renderer WASM unavailable: ${String(error)}` },
      { status: 500 },
    );
  }

  if (matchesIfNoneMatch(request.headers.get("if-none-match"), loaded.etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: loaded.etag,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  return new NextResponse(new Uint8Array(loaded.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/wasm",
      "Content-Length": String(loaded.bytes.byteLength),
      "Cache-Control": CACHE_CONTROL,
      ETag: loaded.etag,
    },
  });
}
