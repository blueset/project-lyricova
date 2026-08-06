import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  FONT_MANIFEST,
  getFontManifestEntry,
  type FontManifestEntry,
} from "./manifest.js";

/**
 * Server-only helpers backing `/api/fonts`. Only import this module from
 * Express route handlers (or equivalent server-side code) — it touches
 * the filesystem.
 *
 * Path resolution mirrors the existing convention in
 * `controller/LyricovaPublicController.ts`
 * (`resolve(import.meta.dirname, "../../src/fonts/<file>")`): since this
 * module itself lives in `src/fonts`, walking up two directories and back
 * into `src/fonts` lands on the very same directory when running from
 * source (`src/fonts/server.ts`, e.g. under Vitest) *and* lands on
 * `src/fonts` (not the nonexistent `dist/fonts`) when running the
 * compiled output (`dist/fonts/server.js`), because `tsc` mirrors
 * `src/fonts` to `dist/fonts` for the compiled `.js` files while the
 * binary font assets are never copied into `dist`. This makes resolution
 * static (no `process.cwd()` walk-up, no monorepo-root detection needed).
 */
export function resolveFontFilePath(entry: FontManifestEntry): string {
  return resolve(import.meta.dirname, "../../src/fonts", entry.fileName);
}

export interface LoadedFont {
  entry: FontManifestEntry;
  buffer: Buffer;
  etag: string;
}

const fontCache = new Map<string, LoadedFont>();
const fontLoads = new Map<string, Promise<LoadedFont>>();

/**
 * Reads (and memoizes) the bytes for a whitelisted font ID. Returns
 * `undefined` if `id` is not present in `FONT_MANIFEST` — this is the
 * only gate between request input and filesystem access, so unknown or
 * forged IDs (including path traversal payloads) never reach
 * `resolveFontFilePath`.
 */
export async function loadFontById(
  id: string,
): Promise<LoadedFont | undefined> {
  const cached = fontCache.get(id);
  if (cached) return cached;

  const entry = getFontManifestEntry(id);
  if (!entry) return undefined;

  const existingLoad = fontLoads.get(id);
  if (existingLoad) return existingLoad;

  const load = (async () => {
    const filePath = resolveFontFilePath(entry);
    const buffer = await readFile(filePath);
    const etag = `"${createHash("sha1").update(buffer).digest("hex")}"`;
    const loaded: LoadedFont = { entry, buffer, etag };
    fontCache.set(id, loaded);
    return loaded;
  })();
  fontLoads.set(id, load);
  try {
    return await load;
  } finally {
    if (fontLoads.get(id) === load) fontLoads.delete(id);
  }
}

/** Clears the in-memory byte cache. Exposed for tests only. */
export function __clearFontCacheForTests(): void {
  fontCache.clear();
  fontLoads.clear();
}

/**
 * Number of fonts whose bytes are currently cached in memory. Exposed for
 * tests only.
 */
export function __fontCacheSizeForTests(): number {
  return fontCache.size;
}

export interface FontStat {
  entry: FontManifestEntry;
  sizeBytes: number;
}

/**
 * Resolves a whitelisted font ID's byte size *without* reading or
 * caching its bytes. Backs `GET /api/fonts` (the listing route), which
 * otherwise had to call `loadFontById` for every manifest entry just to
 * report `sizeBytes` — reading and permanently caching every whitelisted
 * font (including the multi-megabyte lazily-loaded Kanji subset) on the
 * very first listing request, before any consumer actually needed the
 * bytes.
 *
 * Uses `fs.stat` (metadata only) instead of `fs.readFile`. If the font's
 * bytes already happen to be cached (e.g. a previous
 * `GET /api/fonts/:fontId` request), reuses that cached buffer's length
 * instead of doing a redundant `stat` call.
 *
 * Returns `undefined` for an unknown ID, same as `loadFontById`.
 */
export async function statFontById(id: string): Promise<FontStat | undefined> {
  const cached = fontCache.get(id);
  if (cached) {
    return { entry: cached.entry, sizeBytes: cached.buffer.byteLength };
  }

  const entry = getFontManifestEntry(id);
  if (!entry) return undefined;

  const filePath = resolveFontFilePath(entry);
  const { size } = await stat(filePath);
  return { entry, sizeBytes: size };
}

/**
 * Parses an `If-None-Match` header value into the set of ETags it
 * contains, per RFC 9110 §8.8.3.2 (comma-separated list, each either a
 * weak (`W/"..."`) or strong (`"..."`) validator, or the literal `*`).
 */
function parseIfNoneMatch(headerValue: string): string[] {
  return headerValue
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Strips a leading weak-validator prefix (`W/`) so strong and weak forms
 * of the same ETag compare equal, matching the weak-comparison semantics
 * `If-None-Match` is defined to use (RFC 9110 §13.1.2).
 */
function stripWeakPrefix(etag: string): string {
  return etag.startsWith("W/") ? etag.slice(2) : etag;
}

/**
 * Returns `true` if `ifNoneMatch` (the raw `If-None-Match` request header
 * value, possibly `undefined`) matches `etag` (the current resource's
 * ETag), meaning the client's cached copy is still fresh and a `304` can
 * be returned instead of the full body. Supports `*`, and
 * comma-separated, strong or weak validators.
 */
export function matchesIfNoneMatch(
  ifNoneMatch: string | undefined | null,
  etag: string,
): boolean {
  if (!ifNoneMatch) return false;
  const candidates = parseIfNoneMatch(ifNoneMatch);
  if (candidates.includes("*")) return true;
  const normalizedEtag = stripWeakPrefix(etag);
  return candidates.some(
    (candidate) => stripWeakPrefix(candidate) === normalizedEtag,
  );
}

/** Re-exported for convenience so callers only need one import. */
export { FONT_MANIFEST };
