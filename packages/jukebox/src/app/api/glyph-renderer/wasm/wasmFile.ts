import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Server-only resolver for the built `@lyricova/glyph-renderer` WASM binary.
 *
 * The browser loader ({@link file://../../../../components/public/lyrics/glyph/fontLoader.ts})
 * fetches these bytes from `/api/glyph-renderer/wasm` and hands the `Response`
 * to wasm-bindgen, instead of relying on the default
 * `new URL('glyph_renderer_bg.wasm', import.meta.url)` asset resolution (which
 * is not dependable across Next.js bundling modes). This never copies or
 * embeds the binary - it serves the one already built inside the package.
 *
 * Never import this from client code; it touches the filesystem.
 */

let cachedPath: string | undefined;
let cachedBytes: LoadedWasm | undefined;

export interface LoadedWasm {
  bytes: Buffer;
  etag: string;
}

/**
 * Locates `pkg/glyph_renderer_bg.wasm`. Prefers Node module resolution (works
 * when `@lyricova/glyph-renderer` is installed as a dependency), then falls
 * back to walking up from `process.cwd()` to the monorepo's
 * `packages/glyph-renderer/pkg` (robust to the process starting in the repo
 * root or the package directory).
 */
export function resolveGlyphWasmPath(): string {
  if (cachedPath) return cachedPath;

  try {
    const require = createRequire(import.meta.url);
    const pkgJson = require.resolve("@lyricova/glyph-renderer/package.json");
    const candidate = path.join(
      path.dirname(pkgJson),
      "pkg",
      "glyph_renderer_bg.wasm",
    );
    if (existsSync(candidate)) {
      cachedPath = candidate;
      return candidate;
    }
  } catch {
    // Fall through to the filesystem walk below.
  }

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(
      dir,
      "packages",
      "glyph-renderer",
      "pkg",
      "glyph_renderer_bg.wasm",
    );
    if (existsSync(candidate)) {
      cachedPath = candidate;
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "Could not locate packages/glyph-renderer/pkg/glyph_renderer_bg.wasm. " +
      "Build the glyph-renderer package (npm run build -w @lyricova/glyph-renderer).",
  );
}

/** Reads (and memoizes) the WASM bytes plus a strong ETag. */
export async function loadGlyphWasm(): Promise<LoadedWasm> {
  if (cachedBytes) return cachedBytes;
  const bytes = await readFile(resolveGlyphWasmPath());
  const etag = `"${createHash("sha1").update(bytes).digest("hex")}"`;
  cachedBytes = { bytes, etag };
  return cachedBytes;
}

/** Clears the in-memory caches. Exposed for tests only. */
export function __clearGlyphWasmCacheForTests(): void {
  cachedPath = undefined;
  cachedBytes = undefined;
}
