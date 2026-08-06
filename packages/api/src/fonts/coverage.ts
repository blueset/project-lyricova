import { createHash } from "node:crypto";
import { open } from "node:fs/promises";

import { FONT_MANIFEST } from "./manifest.js";
import { resolveFontFilePath } from "./server.js";

/**
 * Server-only cmap parser + coverage index backing
 * `GET /api/fonts/coverage`. Like `./server.ts`, this module touches the
 * filesystem and must only be imported from server-side code.
 *
 * The coverage endpoint lets a browser client decide, purely from the
 * text it needs to shape, which whitelisted font(s) to lazily fetch —
 * without downloading any font just to inspect its `cmap`. The ranges are
 * derived from each font's *real* `cmap` table (not any published or
 * assumed repertoire for a subset), so they always reflect the actual
 * shipped bytes.
 *
 * To stay cheap even for the ~30 MB full variable OTF, we never read a
 * whole font here: we read only the sfnt table directory and then the
 * single `cmap` table, and we parse just enough of it (formats 4, 6, and
 * 12 — the ones these fonts actually use) to recover the set of mapped
 * code points. The result is memoized as a JSON string + strong ETag so
 * repeated requests are served from memory with conditional-GET support,
 * exactly like the byte route.
 */

/** An inclusive `[startCodepoint, endCodepoint]` UTF-32 range. */
export type CodepointRange = [number, number];

export interface FontCoverage {
  id: string;
  ranges: CodepointRange[];
}

export interface CoveragePayload {
  fonts: FontCoverage[];
}

export interface CoverageResult {
  payload: CoveragePayload;
  json: string;
  etag: string;
}

/**
 * `getBestCmap` preference order (platformID, encodingID), matching
 * fontTools: prefer full-repertoire Unicode subtables over BMP-only ones.
 */
const CMAP_PREFERENCES: ReadonlyArray<readonly [number, number]> = [
  [3, 10],
  [0, 6],
  [0, 4],
  [3, 1],
  [0, 3],
  [0, 2],
  [0, 1],
  [0, 0],
];

interface CmapSubtableRecord {
  platformID: number;
  encodingID: number;
  offset: number;
}

/**
 * Reads only the sfnt table directory and the single `cmap` table from a
 * font file, without loading the (potentially multi-megabyte) rest of the
 * font. Returns the raw `cmap` table bytes.
 */
/**
 * Locates the `cmap` table within a full font buffer and returns its byte
 * offset and length by walking the sfnt table directory.
 */
function locateCmapTable(sfntHeader: Buffer): {
  offset: number;
  length: number;
} {
  const sfntVersion = sfntHeader.readUInt32BE(0);
  // 0x74746366 === "ttcf": font collections are not used by this
  // package's whitelist, so reject them explicitly rather than
  // misparsing.
  if (sfntVersion === 0x74746366) {
    throw new Error("Font collections (ttcf) are not supported");
  }
  const numTables = sfntHeader.readUInt16BE(4);
  for (let i = 0; i < numTables; i += 1) {
    const base = 12 + i * 16;
    const tag = sfntHeader.toString("latin1", base, base + 4);
    if (tag === "cmap") {
      return {
        offset: sfntHeader.readUInt32BE(base + 8),
        length: sfntHeader.readUInt32BE(base + 12),
      };
    }
  }
  throw new Error("Font has no cmap table");
}

/**
 * Reads only the sfnt table directory and the single `cmap` table from a
 * font file, without loading the (potentially multi-megabyte) rest of the
 * font. Returns the raw `cmap` table bytes.
 */
async function readCmapTable(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, "r");
  try {
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    const numTables = header.readUInt16BE(4);

    const directory = Buffer.alloc(12 + numTables * 16);
    header.copy(directory, 0);
    await handle.read(directory, 12, numTables * 16, 12);

    const { offset, length } = locateCmapTable(directory);
    const cmap = Buffer.alloc(length);
    await handle.read(cmap, 0, length, offset);
    return cmap;
  } finally {
    await handle.close();
  }
}

/** Picks the best Unicode cmap subtable offset per `CMAP_PREFERENCES`. */
function selectBestSubtableOffset(cmap: Buffer): number | undefined {
  const numTables = cmap.readUInt16BE(2);
  const records: CmapSubtableRecord[] = [];
  for (let i = 0; i < numTables; i += 1) {
    const base = 4 + i * 8;
    records.push({
      platformID: cmap.readUInt16BE(base),
      encodingID: cmap.readUInt16BE(base + 2),
      offset: cmap.readUInt32BE(base + 4),
    });
  }
  for (const [platformID, encodingID] of CMAP_PREFERENCES) {
    const match = records.find(
      (r) => r.platformID === platformID && r.encodingID === encodingID,
    );
    if (match) return match.offset;
  }
  return undefined;
}

/** Parses a format 4 (segment mapping to delta values) subtable. */
function parseFormat4(cmap: Buffer, offset: number, out: Set<number>): void {
  const segCountX2 = cmap.readUInt16BE(offset + 6);
  const segCount = segCountX2 / 2;
  const endCodesBase = offset + 14;
  const startCodesBase = endCodesBase + segCountX2 + 2; // +2 reservedPad
  const idDeltaBase = startCodesBase + segCountX2;
  const idRangeOffsetBase = idDeltaBase + segCountX2;

  for (let i = 0; i < segCount; i += 1) {
    const endCode = cmap.readUInt16BE(endCodesBase + i * 2);
    const startCode = cmap.readUInt16BE(startCodesBase + i * 2);
    const idDelta = cmap.readUInt16BE(idDeltaBase + i * 2);
    const idRangeOffset = cmap.readUInt16BE(idRangeOffsetBase + i * 2);
    if (startCode === 0xffff) continue; // sentinel final segment

    for (let c = startCode; c <= endCode; c += 1) {
      let glyphId: number;
      if (idRangeOffset === 0) {
        glyphId = (c + idDelta) & 0xffff;
      } else {
        // Address of the glyph id, per the OpenType format 4 spec.
        const glyphIndexOffset =
          idRangeOffsetBase + i * 2 + idRangeOffset + (c - startCode) * 2;
        if (glyphIndexOffset + 2 > cmap.length) continue;
        const rawGlyphId = cmap.readUInt16BE(glyphIndexOffset);
        glyphId = rawGlyphId === 0 ? 0 : (rawGlyphId + idDelta) & 0xffff;
      }
      if (glyphId !== 0) out.add(c);
    }
  }
}

/** Parses a format 6 (trimmed table mapping) subtable. */
function parseFormat6(cmap: Buffer, offset: number, out: Set<number>): void {
  const first = cmap.readUInt16BE(offset + 6);
  const count = cmap.readUInt16BE(offset + 8);
  for (let i = 0; i < count; i += 1) {
    const glyphId = cmap.readUInt16BE(offset + 10 + i * 2);
    if (glyphId !== 0) out.add(first + i);
  }
}

/** Parses a format 12 (segmented coverage) subtable. */
function parseFormat12(cmap: Buffer, offset: number, out: Set<number>): void {
  const nGroups = cmap.readUInt32BE(offset + 12);
  let groupBase = offset + 16;
  for (let g = 0; g < nGroups; g += 1) {
    const startCharCode = cmap.readUInt32BE(groupBase);
    const endCharCode = cmap.readUInt32BE(groupBase + 4);
    const startGlyphID = cmap.readUInt32BE(groupBase + 8);
    for (let c = startCharCode; c <= endCharCode; c += 1) {
      const glyphId = startGlyphID + (c - startCharCode);
      if (glyphId !== 0) out.add(c);
    }
    groupBase += 12;
  }
}

/** Collapses a set of code points into sorted, non-overlapping ranges. */
function toRanges(codepoints: Iterable<number>): CodepointRange[] {
  const sorted = Array.from(codepoints).sort((a, b) => a - b);
  const ranges: CodepointRange[] = [];
  for (const cp of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && cp === last[1] + 1) {
      last[1] = cp;
    } else {
      ranges.push([cp, cp]);
    }
  }
  return ranges;
}

/**
 * Parses a raw `cmap` table's best Unicode subtable into sorted,
 * non-overlapping code point ranges.
 */
function parseCmapCoverage(cmap: Buffer): CodepointRange[] {
  const subtableOffset = selectBestSubtableOffset(cmap);
  if (subtableOffset === undefined) {
    throw new Error("Font has no usable Unicode cmap subtable");
  }
  const format = cmap.readUInt16BE(subtableOffset);
  const codepoints = new Set<number>();
  switch (format) {
    case 4:
      parseFormat4(cmap, subtableOffset, codepoints);
      break;
    case 6:
      parseFormat6(cmap, subtableOffset, codepoints);
      break;
    case 12:
      parseFormat12(cmap, subtableOffset, codepoints);
      break;
    default:
      throw new Error(`Unsupported cmap subtable format ${format}`);
  }
  return toRanges(codepoints);
}

/**
 * Extracts the set of mapped Unicode code points from a font *file's* real
 * `cmap`, reading only the sfnt directory and the `cmap` table.
 */
export async function readFontCoverageRanges(
  filePath: string,
): Promise<CodepointRange[]> {
  return parseCmapCoverage(await readCmapTable(filePath));
}

/**
 * Extracts code point coverage from a complete in-memory font buffer
 * (e.g. the bytes served by the delivery route). Lets callers cross-check
 * the coverage endpoint against the very bytes a client would download.
 */
export function coverageRangesFromFontBuffer(buffer: Buffer): CodepointRange[] {
  const { offset, length } = locateCmapTable(buffer);
  return parseCmapCoverage(buffer.subarray(offset, offset + length));
}

let coverageCache: CoverageResult | undefined;
let coverageLoad: Promise<CoverageResult> | undefined;

/**
 * Computes (and memoizes) the coverage payload for every whitelisted
 * font, in manifest order. Concurrent cold calls are deduplicated, just
 * like `loadFontById`. The result carries a strong, content-derived ETag
 * for conditional-GET support.
 */
export async function getFontCoverage(): Promise<CoverageResult> {
  if (coverageCache) return coverageCache;
  if (coverageLoad) return coverageLoad;

  const load = (async () => {
    const fonts: FontCoverage[] = [];
    for (const entry of FONT_MANIFEST) {
      const ranges = await readFontCoverageRanges(resolveFontFilePath(entry));
      fonts.push({ id: entry.id, ranges });
    }
    const payload: CoveragePayload = { fonts };
    const json = JSON.stringify(payload);
    const etag = `"${createHash("sha1").update(json).digest("hex")}"`;
    const result: CoverageResult = { payload, json, etag };
    coverageCache = result;
    return result;
  })();
  coverageLoad = load;
  try {
    return await load;
  } finally {
    if (coverageLoad === load) coverageLoad = undefined;
  }
}

/** Clears the in-memory coverage cache. Exposed for tests only. */
export function __clearCoverageCacheForTests(): void {
  coverageCache = undefined;
  coverageLoad = undefined;
}
