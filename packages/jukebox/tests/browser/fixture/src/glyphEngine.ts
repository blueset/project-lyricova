import {
  GlyphShaper,
  type ShapedCluster,
  type ParagraphLayout,
} from "@lyricova/glyph-renderer";
import {
  fetchFontBytes,
  initGlyphRuntime,
  loadGlyphFonts,
} from "@/components/public/lyrics/glyph/fontLoader";
import { GlyphFontManager } from "@/components/public/lyrics/glyph/glyphFontManager";
import { GlyphPathCache } from "@/components/public/lyrics/glyph/glyphOutlineCache";

/**
 * Browser-fixture glyph engine: a thin singleton that drives the *real*
 * production WASM/font loaders ({@link initGlyphRuntime}, {@link fetchFontBytes},
 * {@link loadGlyphFonts}) and the real {@link GlyphShaper}, pointed at the Vite
 * fixture's own byte routes (`/test-wasm`, `/test-fonts`) instead of the
 * Next.js API routes. No Next.js server is involved.
 *
 * Fonts are registered lazily/incrementally into a single shared shaper so a
 * spec that only needs Latin never pays to download the multi-megabyte Kanji
 * base font.
 */

/** The fixture's whitelisted byte routes (mirror the Next.js API routes). */
const WASM_URL = "/test-wasm";
const FONT_BASE_URL = "/test-fonts";

/** Light default chain for tests that only need Latin shaping. */
export const LIGHT_CHAIN = ["mona-sans-latin-otf"] as const;

export interface FontListEntry {
  id: string;
  url: string;
  contentType: string;
  family: string;
  script: string;
  rawSfnt: boolean;
  /** Byte size reported by the route's stat-only listing (`fs.stat`). */
  sizeBytes: number | null;
}

export interface PayloadReport {
  wasmBytes: number;
  fonts: FontListEntry[];
  loadedFonts: { id: string; bytes: number }[];
}

let runtimePromise: Promise<void> | undefined;
let shaper: GlyphShaper | undefined;
let fontManager: GlyphFontManager | undefined;
const fontIdByManifestId = new Map<string, number>();
const fontByteLengths = new Map<string, number>();
let wasmByteLength = 0;
let listing: FontListEntry[] = [];

export async function ensureRuntime(): Promise<void> {
  await (runtimePromise ??= (async () => {
    // Record the served WASM payload size (a separate GET; wasm-bindgen
    // consumes its own streamed response inside initGlyphRuntime).
    try {
      const head = await fetch(WASM_URL);
      wasmByteLength = (await head.arrayBuffer()).byteLength;
    } catch {
      wasmByteLength = 0;
    }
    await initGlyphRuntime({ wasmUrl: WASM_URL });
    shaper = new GlyphShaper();
    try {
      const res = await fetch(FONT_BASE_URL);
      const json = (await res.json()) as { fonts: FontListEntry[] };
      listing = json.fonts;
    } catch {
      listing = [];
    }
  })());
}

/** Registers (idempotently) each manifest id and returns its {@link GlyphShaper} font id chain. */
export async function ensureFonts(
  manifestIds: readonly string[],
): Promise<number[]> {
  await ensureRuntime();
  const ids: number[] = [];
  for (const manifestId of manifestIds) {
    let fontId = fontIdByManifestId.get(manifestId);
    if (fontId === undefined) {
      const bytes = await fetchFontBytes(manifestId, {
        baseUrl: FONT_BASE_URL,
        fetchImpl: fetch,
      });
      fontByteLengths.set(manifestId, bytes.byteLength);
      fontId = shaper!.registerFont(bytes);
      fontIdByManifestId.set(manifestId, fontId);
    }
    ids.push(fontId);
  }
  return ids;
}

/**
 * The production coverage-aware {@link GlyphFontManager}, pointed at the
 * fixture's own byte + coverage routes. Its injected `fetchBytes` records each
 * downloaded font's size into the same {@link fontByteLengths} map that backs
 * {@link payloads}, so a spec can assert *which* fonts a given line actually
 * pulled — e.g. that a Latin-only line never fetches the CJK subsets.
 */
function getFontManager(): GlyphFontManager {
  if (!fontManager) {
    fontManager = new GlyphFontManager({
      shaper: getShaper(),
      baseUrl: FONT_BASE_URL,
      fetchBytes: async (manifestId: string) => {
        const bytes = await fetchFontBytes(manifestId, {
          baseUrl: FONT_BASE_URL,
          fetchImpl: fetch,
        });
        fontByteLengths.set(manifestId, bytes.byteLength);
        return bytes;
      },
    });
  }
  return fontManager;
}

/**
 * Resolves the minimal coverage-driven font selection for `text` through the
 * real {@link GlyphFontManager}, fetching (once) only the fonts that text
 * needs. Returns the selected manifest ids in fallback order.
 */
export async function prepareText(
  text: string,
): Promise<{ fontManifestIds: string[]; fontIds: number[] }> {
  await ensureRuntime();
  const selection = await getFontManager().ensureFontsFor(text);
  return {
    fontManifestIds: [...selection.fontManifestIds],
    fontIds: [...selection.fontIds],
  };
}

export function getShaper(): GlyphShaper {
  if (!shaper) throw new Error("Glyph engine runtime not initialized");
  return shaper;
}

export function newCache(): GlyphPathCache {
  const s = getShaper();
  return new GlyphPathCache({
    lookup: (fontId, glyphId, fontSize, variations) =>
      s.glyphOutline({
        fontId,
        glyphId,
        fontSize,
        variations: [...variations],
      }),
  });
}

export async function payloads(): Promise<PayloadReport> {
  await ensureRuntime();
  return {
    wasmBytes: wasmByteLength,
    fonts: listing,
    loadedFonts: [...fontByteLengths.entries()].map(([id, bytes]) => ({
      id,
      bytes,
    })),
  };
}

/**
 * Exercises the *full* production font loader end-to-end against the fixture
 * routes (fresh shaper, whole chain registered in one call). Used by specs
 * that validate `loadGlyphFonts` itself (including its error surface).
 */
export async function loadChainViaProductionLoader(
  manifestIds: readonly string[],
): Promise<{ fontIds: number[]; manifestIds: string[] }> {
  await ensureRuntime();
  const loaded = await loadGlyphFonts({
    fontManifestIds: manifestIds,
    baseUrl: FONT_BASE_URL,
    fetchImpl: fetch,
  });
  const result = {
    fontIds: [...loaded.fontIds],
    manifestIds: [...loaded.fontManifestIds],
  };
  loaded.shaper.free();
  return result;
}

/** A JSON-serializable summary of a shaped cluster, for structural assertions. */
export interface ClusterSummary {
  u16Start: number;
  u16End: number;
  fontId: number;
  direction: string;
  level: number;
  script: string;
  x: number;
  advance: number;
  glyphCount: number;
  isWhitespace: boolean;
  ink: { xMin: number; xMax: number; yMin: number; yMax: number };
}

export function summarizeCluster(cluster: ShapedCluster): ClusterSummary {
  return {
    u16Start: cluster.source.utf16Start,
    u16End: cluster.source.utf16End,
    fontId: cluster.fontId,
    direction: cluster.direction,
    level: cluster.level,
    script: cluster.script,
    x: cluster.x,
    advance: cluster.advance,
    glyphCount: cluster.glyphs.length,
    isWhitespace: cluster.isWhitespace,
    ink: {
      xMin: cluster.bounds.xMin,
      xMax: cluster.bounds.xMax,
      yMin: cluster.bounds.yMin,
      yMax: cluster.bounds.yMax,
    },
  };
}

export interface LayoutSummary {
  lineCount: number;
  lineWidths: number[];
  lineRanges: [number, number][];
  width: number;
  baseDirection: string;
  missing: { u16Start: number; u16End: number }[];
  clusters: ClusterSummary[];
}

export function summarizeLayout(layout: ParagraphLayout): LayoutSummary {
  return {
    lineCount: layout.lines.length,
    lineWidths: layout.lines.map((line) => line.width),
    lineRanges: layout.lines.map((line) => [
      line.source.utf16Start,
      line.source.utf16End,
    ]),
    width: layout.width,
    baseDirection: layout.baseDirection,
    missing: layout.missingFontRanges.map((r) => ({
      u16Start: r.utf16Start,
      u16End: r.utf16End,
    })),
    clusters: (layout.lines[0]?.clusters ?? []).map(summarizeCluster),
  };
}
