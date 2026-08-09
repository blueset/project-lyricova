import { describe, expect, it, beforeEach } from "vitest";

import { FONT_MANIFEST } from "./manifest.js";
import { __clearFontCacheForTests, loadFontById } from "./server.js";
import {
  __clearCoverageCacheForTests,
  coverageRangesFromFontBuffer,
  getFontCoverage,
  type CodepointRange,
} from "./coverage.js";

beforeEach(() => {
  __clearFontCacheForTests();
  __clearCoverageCacheForTests();
});

function inRanges(ranges: CodepointRange[], codepoint: number): boolean {
  return ranges.some(([start, end]) => codepoint >= start && codepoint <= end);
}

function coverageFor(
  id: string,
  fonts: { id: string; ranges: CodepointRange[] }[],
) {
  const font = fonts.find((f) => f.id === id);
  if (!font) throw new Error(`No coverage for ${id}`);
  return font.ranges;
}

const REGION_SAMPLES: Record<string, string> = {
  "source-han-sans-jp-vf": "桜あア",
  "source-han-sans-sc-vf": "简体汉",
  "source-han-sans-tc-vf": "繁體漢",
};

const SCRIPT_SAMPLES: Record<string, string> = {
  "noto-sans-thai-looped-vf-ttf": "วันนี้อากาศดี",
  "noto-sans-lao-looped-vf-ttf": "ສະບາຍດີ",
  "noto-sans-hebrew-vf-ttf": "שלום",
  "noto-sans-arabic-vf-ttf": "مرحبا",
};

const PLANGOTHIC_SAMPLES: Record<string, string> = {
  "plangothic-p1-regular-ttf": "𠀀",
  "plangothic-p2-regular-ttf": "𰀀",
};

describe("region subset binaries", () => {
  it("ships each region subset as a raw CFF OpenType (OTTO) SFNT", async () => {
    for (const id of Object.keys(REGION_SAMPLES)) {
      const loaded = await loadFontById(id);
      expect(loaded).toBeDefined();
      expect(loaded!.entry.contentType).toBe("font/otf");
      expect(loaded!.entry.rawSfnt).toBe(true);
      expect(loaded!.buffer.subarray(0, 4).toString("latin1")).toBe("OTTO");
    }
  });
});

describe("getFontCoverage", () => {
  it("reports coverage for every whitelisted font, in manifest order", async () => {
    const { payload } = await getFontCoverage();
    expect(payload.fonts.map((f) => f.id)).toEqual(
      FONT_MANIFEST.map((e) => e.id),
    );
  });

  it("produces sorted, non-overlapping, well-formed ranges for every font", async () => {
    const { payload } = await getFontCoverage();
    for (const font of payload.fonts) {
      expect(font.ranges.length).toBeGreaterThan(0);
      let previousEnd = Number.NEGATIVE_INFINITY;
      for (const [start, end] of font.ranges) {
        expect(start).toBeLessThanOrEqual(end);
        // Ascending and non-overlapping; adjacent ranges are merged, so a
        // gap of at least one code point must separate consecutive ranges.
        expect(start).toBeGreaterThan(previousEnd + 1);
        previousEnd = end;
      }
    }
  });

  it("exactly matches the coverage of the served font bytes", async () => {
    const { payload } = await getFontCoverage();
    for (const entry of FONT_MANIFEST) {
      const loaded = await loadFontById(entry.id);
      const fromBytes = coverageRangesFromFontBuffer(loaded!.buffer);
      const fromEndpoint = coverageFor(entry.id, payload.fonts);
      expect(fromEndpoint).toEqual(fromBytes);
    }
  });

  it("covers the representative characters of each region subset", async () => {
    const { payload } = await getFontCoverage();
    for (const [id, samples] of Object.entries(REGION_SAMPLES)) {
      const ranges = coverageFor(id, payload.fonts);
      for (const ch of samples) {
        expect(inRanges(ranges, ch.codePointAt(0)!)).toBe(true);
      }
    }
  });

  it("covers representative characters for every script fallback", async () => {
    const { payload } = await getFontCoverage();
    for (const [id, samples] of Object.entries(SCRIPT_SAMPLES)) {
      const ranges = coverageFor(id, payload.fonts);
      for (const ch of samples) {
        expect(inRanges(ranges, ch.codePointAt(0)!)).toBe(true);
      }
    }
  });

  it("covers Han extensions missing from every earlier CJK fallback", async () => {
    const { payload } = await getFontCoverage();
    const earlierCjk = [
      "source-han-sans-jp-vf",
      "source-han-sans-sc-vf",
      "source-han-sans-tc-vf",
      "source-han-sans-vf-otf",
    ].map((id) => coverageFor(id, payload.fonts));
    const p1 = coverageFor("plangothic-p1-regular-ttf", payload.fonts);

    for (const [id, samples] of Object.entries(PLANGOTHIC_SAMPLES)) {
      const ranges = coverageFor(id, payload.fonts);
      for (const ch of samples) {
        const codepoint = ch.codePointAt(0)!;
        expect(inRanges(ranges, codepoint)).toBe(true);
        for (const earlierRanges of earlierCjk) {
          expect(inRanges(earlierRanges, codepoint)).toBe(false);
        }
        if (id === "plangothic-p2-regular-ttf") {
          expect(inRanges(p1, codepoint)).toBe(false);
        }
      }
    }
  });

  it("distinguishes the region subsets by their real coverage differences", async () => {
    const { payload } = await getFontCoverage();
    const jp = coverageFor("source-han-sans-jp-vf", payload.fonts);
    const sc = coverageFor("source-han-sans-sc-vf", payload.fonts);
    const tc = coverageFor("source-han-sans-tc-vf", payload.fonts);
    const full = coverageFor("source-han-sans-vf-otf", payload.fonts);

    // Adobe's official region subsets share a large common Han repertoire and
    // differ mainly in region-specific glyph *forms*, so coverage is only
    // partially exclusive. These are genuine differences in the shipped files.

    // 简 (U+7B80) is a simplified-only form: CN yes, JP/TW no.
    expect(inRanges(sc, 0x7b80)).toBe(true);
    expect(inRanges(jp, 0x7b80)).toBe(false);
    expect(inRanges(tc, 0x7b80)).toBe(false);

    // 桜 (U+685C) is the Japanese form of 櫻: JP yes, TW no.
    expect(inRanges(jp, 0x685c)).toBe(true);
    expect(inRanges(tc, 0x685c)).toBe(false);

    // 汉 (U+6C49): CN/TW yes, JP no.
    expect(inRanges(sc, 0x6c49)).toBe(true);
    expect(inRanges(tc, 0x6c49)).toBe(true);
    expect(inRanges(jp, 0x6c49)).toBe(false);

    // Hangul is in none of the three region subsets, only the full VF — this
    // is exactly the case the lazy loader escalates to the full font for.
    for (const ranges of [jp, sc, tc]) {
      expect(inRanges(ranges, 0xd55c)).toBe(false); // 한
    }
    expect(inRanges(full, 0xd55c)).toBe(true);
  });

  it("includes the shared Latin/kana core in every region subset", async () => {
    const { payload } = await getFontCoverage();
    for (const id of Object.keys(REGION_SAMPLES)) {
      const ranges = coverageFor(id, payload.fonts);
      expect(inRanges(ranges, 0x41)).toBe(true); // 'A'
      expect(inRanges(ranges, 0x3042)).toBe(true); // 'あ'
      expect(inRanges(ranges, 0x30a2)).toBe(true); // 'ア'
      expect(inRanges(ranges, 0x3000)).toBe(true); // ideographic space
    }
  });

  it("memoizes a stable, content-derived ETag and parseable JSON", async () => {
    const first = await getFontCoverage();
    const second = await getFontCoverage();
    expect(second).toBe(first);
    expect(first.etag).toMatch(/^"[0-9a-f]{40}"$/);
    expect(JSON.parse(first.json)).toEqual(first.payload);
  });

  it("deduplicates concurrent cold computations", async () => {
    const [a, b, c] = await Promise.all([
      getFontCoverage(),
      getFontCoverage(),
      getFontCoverage(),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
