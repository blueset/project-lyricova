import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll } from "vitest";
import { GlyphShaper, initGlyphRenderer } from "@lyricova/glyph-renderer";
import { layoutRubyParagraph } from "./rubyLayout";
import type { FuriganaAnnotationInput } from "./types";

/**
 * Real (non-fake) integration smoke test: exercises `layoutRubyParagraph`
 * against the actual wasm-backed `GlyphShaper`, not a structural fake.
 *
 * This is the guardrail requested when `@lyricova/glyph-renderer`'s
 * shaping/layout implementation is being hardened (control characters,
 * per-paragraph bidi, script itemization, RTL `shape()` visual order,
 * degraded-coverage/missing-mark reporting, numeric input validation): this
 * ruby layer only consumes the *public* `ParagraphLayout`/`ShapedCluster`/
 * `ShapeResult` contract (see `rubyLayout.ts`, `rubyPlacement.ts`,
 * `linePlacement.ts` - no reaching into wasm/Rust internals, no
 * bug-specific workarounds), so it should keep working unmodified as those
 * fixes land. Re-run this file after rebuilding the wasm package
 * (`npm run build:wasm` in `packages/glyph-renderer`) to confirm.
 *
 * Also covers the ruby-metrics fix: real ink ascent/descent are measured
 * per annotation from the actual `glyphOutline` outlines of the glyphs it
 * shaped (see `rubyInkMetrics.ts`) - including Latin descenders (e.g. "g")
 * and a distinct ruby fallback font's own metrics - rather than
 * approximated from the base paragraph's font metrics.
 *
 * Deliberately **not** wrapped in a broad try/catch that silently skips on
 * any error: a missing/broken wasm binary, a missing test font, or a
 * shaper-thrown error must fail this suite, not pass green. The *only*
 * sanctioned way to skip is the predeclared
 * `LYRICOVA_SKIP_GLYPH_WASM_TESTS=1` environment flag, for environments that
 * are known in advance to be unable to run wasm (e.g. no `WebAssembly`
 * global) - never an ad hoc reaction to whatever exception happened to be
 * thrown.
 */

const SKIP_WASM_INTEGRATION =
  process.env.LYRICOVA_SKIP_GLYPH_WASM_TESTS === "1";

const glyphRendererDir = fileURLToPath(
  new URL(".", import.meta.resolve("@lyricova/glyph-renderer/package.json")),
);
const wasmPath = `${glyphRendererDir}pkg/glyph_renderer_bg.wasm`;
const japaneseFontPath = resolve(
  glyphRendererDir,
  "../api/src/fonts/TsimSans-J-Regular-Palt.otf",
);
const latinFontPath = resolve(
  glyphRendererDir,
  "../api/src/fonts/Mona-Sans-Regular.otf",
);

describe.skipIf(SKIP_WASM_INTEGRATION)(
  "layoutRubyParagraph (real wasm shaper)",
  () => {
    let shaper: GlyphShaper;
    let fontId: number;
    let latinFontId: number;

    beforeAll(async () => {
      // No try/catch: a missing/broken wasm binary or font asset must fail
      // this suite loudly, not silently report false-green.
      const wasmBytes = readFileSync(wasmPath);
      await initGlyphRenderer({ module_or_path: wasmBytes });
      shaper = new GlyphShaper();
      const fontBytes = readFileSync(japaneseFontPath);
      fontId = shaper.registerFont(new Uint8Array(fontBytes));
      const latinFontBytes = readFileSync(latinFontPath);
      latinFontId = shaper.registerFont(new Uint8Array(latinFontBytes));
    });

    it("shapes and places real Japanese furigana without relying on shaper internals", () => {
      // Same base/ruby pair used by furiganaHighlights.ts's contextual rules.
      const text = "明日は晴れ";
      const furigana: FuriganaAnnotationInput[] = [
        { content: "あした", leftIndex: 0, rightIndex: 2 },
      ];

      const result = layoutRubyParagraph(shaper, {
        text,
        furigana,
        fontIds: [fontId],
        fontSize: 32,
      });

      expect(result.issues).toEqual([]);
      expect(result.lines.length).toBeGreaterThanOrEqual(1);
      expect(result.rubies).toHaveLength(1);

      const ruby = result.rubies[0]!;
      // "明日" (2 graphemes) vs "あした" (3 graphemes) can't map 1:1.
      expect(ruby.mode).toBe("group");
      expect(ruby.runs.length).toBeGreaterThan(0);
      expect(ruby.baseX[1]).toBeGreaterThan(ruby.baseX[0]);
      expect(ruby.fontSize).toBeCloseTo(16, 5); // default: fontSize * 0.5

      // Ink ascent/descent are measured from the real shaped glyphs' actual
      // outlines (see rubyInkMetrics.ts), not approximated from the base
      // paragraph's font metrics.
      expect(ruby.inkAscent).toBeGreaterThan(0);
      expect(ruby.inkDescent).toBeGreaterThanOrEqual(0);
      expect(ruby.y).toBe(ruby.inkAscent);

      // Every base range must land on exactly one line - i.e. it always
      // resolves to a concrete lineIndex here, and the annotated line's box
      // grew to reserve room for the ruby row above it (ink ascent + ink
      // descent + gap).
      const line = result.lines[ruby.lineIndex]!;
      expect(line.height).toBeGreaterThan(line.line.height);
      expect(line.height).toBeCloseTo(
        line.line.height + ruby.inkAscent + ruby.inkDescent,
        5,
      );
      expect(result.height).toBeGreaterThan(
        result.lines.reduce((sum, l) => sum + l.line.height, 0) - 1,
      );
    });

    it("shapes a clean mono-ruby pair 1:1 over two base graphemes", () => {
      // Two single-kanji, single-mora readings: base and ruby grapheme
      // counts both equal 2, so this maps cleanly to mono-ruby (one ruby
      // grapheme centered per base cluster) rather than group ruby.
      const text = "手目";
      const furigana: FuriganaAnnotationInput[] = [
        { content: "てめ", leftIndex: 0, rightIndex: 2 },
      ];

      const result = layoutRubyParagraph(shaper, {
        text,
        furigana,
        fontIds: [fontId],
        fontSize: 32,
      });

      expect(result.issues).toEqual([]);
      expect(result.rubies).toHaveLength(1);
      const ruby = result.rubies[0]!;
      expect(ruby.mode).toBe("mono");
      expect(ruby.runs).toHaveLength(2);
    });

    it("reserves real ink descent for a distinct Latin ruby fallback font with descenders", () => {
      // Base is a single Japanese kanji; the ruby fallback font is switched
      // to a Latin font and the ruby content is all-descender Latin letters
      // ("g", "p", "j", "y" all drop below the baseline) - this could never
      // be measured correctly from the (Japanese) base paragraph's own
      // ascent/descent metrics.
      const text = "山";
      const furigana: FuriganaAnnotationInput[] = [
        { content: "gpjy", leftIndex: 0, rightIndex: 1 },
      ];

      const result = layoutRubyParagraph(shaper, {
        text,
        furigana,
        fontIds: [fontId],
        rubyFontIds: [latinFontId],
        fontSize: 32,
      });

      expect(result.issues).toEqual([]);
      const ruby = result.rubies[0]!;
      expect(ruby.fontIds).toEqual([latinFontId]);
      expect(ruby.inkAscent).toBeGreaterThan(0);
      // The descenders must be measured and reserved, not clipped to 0.
      expect(ruby.inkDescent).toBeGreaterThan(0);

      const line = result.lines[ruby.lineIndex]!;
      expect(line.height).toBeCloseTo(
        line.line.height + ruby.inkAscent + ruby.inkDescent,
        5,
      );
    });

    it("measures different ink metrics for the same ruby content shaped with a different fallback font", () => {
      const text = "山";
      const contentSameFont: FuriganaAnnotationInput[] = [
        { content: "さん", leftIndex: 0, rightIndex: 1 },
      ];

      const withJapaneseRubyFont = layoutRubyParagraph(shaper, {
        text,
        furigana: contentSameFont,
        fontIds: [fontId],
        rubyFontIds: [fontId],
        fontSize: 32,
      });
      const withLatinRubyFont = layoutRubyParagraph(shaper, {
        text,
        furigana: [{ content: "gpjy", leftIndex: 0, rightIndex: 1 }],
        fontIds: [fontId],
        rubyFontIds: [latinFontId],
        fontSize: 32,
      });

      // Different fonts/content produce different measured ink metrics -
      // proving the metrics come from the actual shaped ruby font/glyphs,
      // not a fixed base-paragraph-derived constant.
      expect(withLatinRubyFont.rubies[0]!.inkDescent).toBeGreaterThan(
        withJapaneseRubyFont.rubies[0]!.inkDescent,
      );
    });
  },
);
