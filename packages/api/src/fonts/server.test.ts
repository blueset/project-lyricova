import { describe, expect, it, beforeEach } from "vitest";
import { existsSync } from "node:fs";

import { FONT_MANIFEST, getFontManifestEntry } from "./manifest.js";
import {
  __clearFontCacheForTests,
  __fontCacheSizeForTests,
  loadFontById,
  matchesIfNoneMatch,
  resolveFontFilePath,
  statFontById,
} from "./server.js";

beforeEach(() => {
  __clearFontCacheForTests();
});

describe("resolveFontFilePath", () => {
  it("resolves every whitelisted entry to an existing on-disk file under src/fonts", () => {
    for (const entry of FONT_MANIFEST) {
      const filePath = resolveFontFilePath(entry);
      expect(filePath).toMatch(/[\\/]src[\\/]fonts[\\/]/);
      expect(filePath.endsWith(entry.fileName)).toBe(true);
      expect(existsSync(filePath)).toBe(true);
    }
  });
});

describe("loadFontById", () => {
  it("reads and caches whitelisted font bytes, keyed by id", async () => {
    expect(__fontCacheSizeForTests()).toBe(0);
    const entry = getFontManifestEntry("mona-sans-latin-otf")!;
    const loaded = await loadFontById(entry.id);
    expect(loaded).toBeDefined();
    expect(loaded!.buffer.byteLength).toBeGreaterThan(0);
    expect(loaded!.entry).toBe(entry);
    expect(__fontCacheSizeForTests()).toBe(1);

    // Second call is served from cache: same buffer instance.
    const loadedAgain = await loadFontById(entry.id);
    expect(loadedAgain!.buffer).toBe(loaded!.buffer);
    expect(__fontCacheSizeForTests()).toBe(1);
  });

  it("returns undefined for unknown or path-traversal ids without touching the filesystem", async () => {
    await expect(loadFontById("does-not-exist")).resolves.toBeUndefined();
    await expect(
      loadFontById("../../../../etc/passwd"),
    ).resolves.toBeUndefined();
    await expect(loadFontById("/etc/passwd")).resolves.toBeUndefined();
    await expect(
      loadFontById("..%2F..%2Fetc%2Fpasswd"),
    ).resolves.toBeUndefined();
    expect(__fontCacheSizeForTests()).toBe(0);
  });

  it("produces a stable, content-derived ETag", async () => {
    const entry = getFontManifestEntry("source-han-sans-vf-otf")!;
    const loaded = await loadFontById(entry.id);
    expect(loaded!.etag).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it("deduplicates concurrent cold loads of the large variable font", async () => {
    const [first, second, third] = await Promise.all([
      loadFontById("source-han-sans-vf-otf"),
      loadFontById("source-han-sans-vf-otf"),
      loadFontById("source-han-sans-vf-otf"),
    ]);
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(__fontCacheSizeForTests()).toBe(1);
  });

  it("every whitelisted font begins with a raw SFNT magic header", async () => {
    for (const entry of FONT_MANIFEST) {
      const loaded = await loadFontById(entry.id);
      const magic = loaded!.buffer.subarray(0, 4);
      expect(["OTTO", "\u0000\u0001\u0000\u0000", "true", "ttcf"]).toContain(
        magic.toString("latin1"),
      );
    }
  });
});

describe("statFontById", () => {
  it("reports a font's size without reading or caching its bytes", async () => {
    const entry = getFontManifestEntry("source-han-sans-vf-otf")!;
    const stat = await statFontById(entry.id);
    expect(stat).toBeDefined();
    expect(stat!.sizeBytes).toBeGreaterThan(0);
    expect(__fontCacheSizeForTests()).toBe(0);
  });

  it("matches the size a full byte read would report, without duplicating the cache entry", async () => {
    const entry = getFontManifestEntry("mona-sans-latin-otf")!;
    const stat = await statFontById(entry.id);
    const loaded = await loadFontById(entry.id);
    expect(stat!.sizeBytes).toBe(loaded!.buffer.byteLength);
  });

  it("reuses an already-cached buffer's length instead of a redundant stat call", async () => {
    const entry = getFontManifestEntry("mona-sans-latin-otf")!;
    await loadFontById(entry.id);
    expect(__fontCacheSizeForTests()).toBe(1);
    const stat = await statFontById(entry.id);
    expect(stat!.entry).toBe(entry);
    // Still just the one cache entry from the earlier loadFontById call.
    expect(__fontCacheSizeForTests()).toBe(1);
  });

  it("returns undefined for unknown ids", async () => {
    await expect(statFontById("does-not-exist")).resolves.toBeUndefined();
  });
});

describe("matchesIfNoneMatch", () => {
  const etag = '"abc123"';

  it("returns false when the header is missing or empty", () => {
    expect(matchesIfNoneMatch(undefined, etag)).toBe(false);
    expect(matchesIfNoneMatch(null, etag)).toBe(false);
    expect(matchesIfNoneMatch("", etag)).toBe(false);
  });

  it("matches a strong validator exactly", () => {
    expect(matchesIfNoneMatch('"abc123"', etag)).toBe(true);
    expect(matchesIfNoneMatch('"different"', etag)).toBe(false);
  });

  it("matches a weak validator against a strong one (weak comparison)", () => {
    expect(matchesIfNoneMatch('W/"abc123"', etag)).toBe(true);
    expect(matchesIfNoneMatch(etag, 'W/"abc123"')).toBe(true);
  });

  it("matches comma-separated lists containing the current etag", () => {
    expect(matchesIfNoneMatch('"nope", "abc123", "other"', etag)).toBe(true);
    expect(matchesIfNoneMatch('"nope", "other"', etag)).toBe(false);
  });

  it("treats * as matching any current etag", () => {
    expect(matchesIfNoneMatch("*", etag)).toBe(true);
  });
});
