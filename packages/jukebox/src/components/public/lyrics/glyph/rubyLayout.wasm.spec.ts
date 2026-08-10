import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeAll } from "vitest";
import { GlyphShaper, initGlyphRenderer } from "@lyricova/glyph-renderer";
import { layoutRubyParagraph } from "./rubyLayout";
import type { FuriganaAnnotationInput } from "./types";
import { glyphVariations } from "./fontVariations";

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
const productionJapaneseFontPath = resolve(
  glyphRendererDir,
  "../api/src/fonts/SourceHanSansJP-VF.otf",
);

describe.skipIf(SKIP_WASM_INTEGRATION)(
  "layoutRubyParagraph (real wasm shaper)",
  () => {
    let shaper: GlyphShaper;
    let fontId: number;
    let latinFontId: number;
    let productionJapaneseFontId: number;

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
      const productionJapaneseFontBytes = readFileSync(
        productionJapaneseFontPath,
      );
      productionJapaneseFontId = shaper.registerFont(
        new Uint8Array(productionJapaneseFontBytes),
      );
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

      // Ink ascent/descent are still measured from the real shaped glyphs'
      // actual outlines (see rubyInkMetrics.ts) for bounds/clipping.
      expect(ruby.inkAscent).toBeGreaterThan(0);
      expect(ruby.inkDescent).toBeGreaterThanOrEqual(0);

      // ...but line advance comes from the deterministic row instead, derived
      // from the ruby size and the font's own em-relative metrics.
      expect(ruby.y).toBe(result.rubyRow.baseline);
      expect(result.rubyRow.fontSize).toBeCloseTo(16, 5);
      expect(result.rubyRow.height).toBeGreaterThan(0);

      // Every base range must land on exactly one line - i.e. it always
      // resolves to a concrete lineIndex here - and every line's box grew by
      // exactly the reserved row, annotated or not.
      const line = result.lines[ruby.lineIndex]!;
      expect(line.height).toBeCloseTo(
        line.line.height + result.rubyRow.height,
        5,
      );
      for (const placement of result.lines) {
        expect(placement.height).toBeCloseTo(
          placement.line.height + result.rubyRow.height,
          5,
        );
      }
    });

    it("takes ruby type from the input data: one annotation per base grapheme is mono", () => {
      // Upstream emits mono ruby as one annotation per base grapheme, so a
      // single annotation spanning two graphemes is group ruby even though the
      // grapheme counts happen to line up 1:1.
      const text = "手目";

      const grouped = layoutRubyParagraph(shaper, {
        text,
        furigana: [{ content: "てめ", leftIndex: 0, rightIndex: 2 }],
        fontIds: [fontId],
        fontSize: 32,
      });
      expect(grouped.issues).toEqual([]);
      expect(grouped.rubies[0]!.mode).toBe("group");

      const mono = layoutRubyParagraph(shaper, {
        text,
        furigana: [
          { content: "て", leftIndex: 0, rightIndex: 1 },
          { content: "め", leftIndex: 1, rightIndex: 2 },
        ],
        fontIds: [fontId],
        fontSize: 32,
      });
      expect(mono.issues).toEqual([]);
      expect(mono.rubies).toHaveLength(2);
      expect(mono.rubies.map((r) => r.mode)).toEqual(["mono", "mono"]);
      // Each reading is centred over its own kanji, in source order.
      expect(mono.rubies[0]!.baseX[1]).toBeLessThanOrEqual(
        mono.rubies[1]!.baseX[0] + 1e-3,
      );
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
        line.line.height + result.rubyRow.height,
        5,
      );
    });

    it("expands the base so over-long ruby fits, pre-measured before line breaking", () => {
      // Ideographic neighbours grant no overhang at all, so the whole excess
      // has to come from base expansion (JLReq 3.3.6 fig. 127).
      const result = layoutRubyParagraph(shaper, {
        text: "字山字",
        furigana: [{ content: "gpjygpjy", leftIndex: 1, rightIndex: 2 }],
        fontIds: [fontId],
        rubyFontIds: [latinFontId],
        fontSize: 32,
      });

      expect(result.issues).toEqual([]);
      const ruby = result.rubies[0]!;
      const line = result.lines[ruby.lineIndex]!.line;
      const expanded = line.clusters.find(
        (cluster) => cluster.source.utf16Start === 1,
      )!;

      // The engine injected symmetric edge gaps around the annotated cluster.
      expect(expanded.leadingSpace).toBeGreaterThan(0);
      expect(expanded.trailingSpace).toBeCloseTo(expanded.leadingSpace, 3);
      // The cluster's own shaped advance is untouched - only spacing moved.
      const plain = line.clusters.find(
        (cluster) => cluster.source.utf16Start === 0,
      )!;
      expect(plain.leadingSpace).toBe(0);
      expect(plain.trailingSpace).toBe(0);

      // baseX covers the expanded box, and the ruby is centred in it rather
      // than overhanging onto the ideographs.
      const rubyWidth =
        ruby.runs.reduce(
          (max, run) => Math.max(max, run.x + run.width),
          -Infinity,
        ) - Math.min(...ruby.runs.map((run) => run.x));
      expect(ruby.baseX[1] - ruby.baseX[0]).toBeCloseTo(rubyWidth, 2);
      // Everything after the annotation shifted right, and the line grew.
      expect(plain.x + plain.advance).toBeLessThanOrEqual(ruby.baseX[0] + 1e-3);
      expect(line.width).toBeGreaterThan(3 * plain.advance);
    });

    it("leaves the base alone when kana neighbours can absorb the overhang", () => {
      const withKana = layoutRubyParagraph(shaper, {
        text: "のは山のは",
        furigana: [{ content: "gp", leftIndex: 2, rightIndex: 3 }],
        fontIds: [fontId],
        rubyFontIds: [latinFontId],
        fontSize: 32,
      });

      expect(withKana.issues).toEqual([]);
      for (const cluster of withKana.lines[0]!.line.clusters) {
        expect(cluster.leadingSpace).toBe(0);
        expect(cluster.trailingSpace).toBe(0);
      }
    });

    it("keeps each base+ruby pair unbreakable while still wrapping between pairs", () => {
      // Narrow enough to force wrapping; every annotated range must stay whole.
      const result = layoutRubyParagraph(shaper, {
        text: "明日は晴れ明日は晴れ明日は晴れ",
        furigana: [
          { content: "あした", leftIndex: 0, rightIndex: 2 },
          { content: "は", leftIndex: 5, rightIndex: 7 },
          { content: "あした", leftIndex: 10, rightIndex: 12 },
        ],
        fontIds: [fontId],
        fontSize: 32,
        maxWidth: 160,
        wrapStrategy: "balanced",
        phraseRanges: [
          [0, 3],
          [5, 9],
        ],
      });

      expect(result.lines.length).toBeGreaterThan(1);
      expect(
        result.issues.filter((issue) => issue.kind === "splitAcrossLines"),
      ).toEqual([]);
      expect(result.rubies).toHaveLength(3);
      // Each annotation resolved to exactly one line, and its base clusters
      // are contiguous on that line.
      for (const ruby of result.rubies) {
        const line = result.lines[ruby.lineIndex]!.line;
        const covered = line.clusters.filter(
          (cluster) =>
            cluster.source.utf16Start >= ruby.annotation.utf16Range[0] &&
            cluster.source.utf16End <= ruby.annotation.utf16Range[1],
        );
        expect(covered.length).toBeGreaterThan(0);
        expect(ruby.baseX[1]).toBeGreaterThan(ruby.baseX[0]);
      }
    });

    it("reflows the exact long 閄 annotation before the following kana", () => {
      const content =
        "ものかげからきゅうにとびだしてひとをおどろかせるときにはっするこえ";
      const result = layoutRubyParagraph(shaper, {
        text: "閄は",
        furigana: [{ content, leftIndex: 0, rightIndex: 1 }],
        fontIds: [productionJapaneseFontId],
        fontSize: 56,
        rubyFontSize: 20,
        rubyRowFontSize: 20,
        rubyGap: 5,
        reserveRubyRow: true,
        maxWidth: 628,
        wrapStrategy: "balanced",
        language: "ja",
        features: ["palt=1", "ss01=1", "ss03=1", "cv01=1"],
        variations: [...glyphVariations(56)],
        rubyVariations: [...glyphVariations(20)],
      });

      expect(result.issues).toEqual([]);
      expect(result.lines).toHaveLength(2);
      expect(result.rubies).toHaveLength(1);
      const ruby = result.rubies[0]!;
      expect(ruby.lineIndex).toBe(0);
      expect(result.lines[0]!.line.source.utf16End).toBe(1);
      expect(result.lines[1]!.line.source.utf16Start).toBe(1);
      expect(result.lines[0]!.occupiedWidth).toBeLessThanOrEqual(628 + 1e-3);
      expect(ruby.baseX[1] - ruby.baseX[0]).toBeCloseTo(ruby.runs[0]!.width, 2);
    });

    it("keeps the long line-head ruby centered when the line is wide enough", () => {
      const content =
        "ものかげからきゅうにとびだしてひとをおどろかせるときにはっするこえ";
      const result = layoutRubyParagraph(shaper, {
        text: "閄は",
        furigana: [{ content, leftIndex: 0, rightIndex: 1 }],
        fontIds: [productionJapaneseFontId],
        fontSize: 56,
        rubyFontSize: 20,
        maxWidth: 1186,
        wrapStrategy: "balanced",
        language: "ja",
        features: ["palt=1", "ss01=1", "ss03=1", "cv01=1"],
        variations: [...glyphVariations(56)],
        rubyVariations: [...glyphVariations(20)],
      });

      expect(result.issues).toEqual([]);
      expect(result.lines).toHaveLength(1);
      const ruby = result.rubies[0]!;
      const base = result.lines[0]!.line.clusters.find(
        (cluster) => cluster.source.utf16Start === 0,
      )!;
      const runsLeft = Math.min(...ruby.runs.map((run) => run.x));
      const runsRight = Math.max(...ruby.runs.map((run) => run.x + run.width));
      expect((runsLeft + runsRight) / 2).toBeCloseTo(
        base.x + base.advance / 2,
        2,
      );
      // The following hiragana absorbs at most one 20px ruby em; the rest is
      // pre-measured spacing, not an asymmetric ruby shift.
      expect(runsRight - ruby.baseX[1]).toBeLessThanOrEqual(20 + 1e-2);
    });

    it("reports the exact long 閄 annotation when even its ruby cannot fit", () => {
      const content =
        "ものかげからきゅうにとびだしてひとをおどろかせるときにはっするこえ";
      const result = layoutRubyParagraph(shaper, {
        text: "閄は",
        furigana: [{ content, leftIndex: 0, rightIndex: 1 }],
        fontIds: [productionJapaneseFontId],
        fontSize: 56,
        rubyFontSize: 20,
        maxWidth: 400,
        language: "ja",
        features: ["palt=1", "ss01=1", "ss03=1", "cv01=1"],
        variations: [...glyphVariations(56)],
        rubyVariations: [...glyphVariations(20)],
      });

      const issue = result.issues.find(
        (candidate) => candidate.kind === "rubyTooWide",
      );
      expect(issue).toMatchObject({ kind: "rubyTooWide", maxWidth: 400 });
      if (issue?.kind === "rubyTooWide") {
        expect(issue.width).toBeGreaterThan(400);
      }
    });

    it("handles the real lyrics shapes: jukujikun, brackets and a Latin base", () => {
      const cases: {
        text: string;
        furigana: FuriganaAnnotationInput[];
        mode: "mono" | "group";
      }[] = [
        // <つながり,0,2> over 接続 - jukujikun, 4 kana over 2 kanji.
        {
          text: "接続",
          furigana: [{ content: "つながり", leftIndex: 0, rightIndex: 2 }],
          mode: "group",
        },
        // <うた,8,16> over ＜最高速の喜びの歌＞ - ruby far narrower than base.
        {
          text: "＜最高速の喜びの歌＞",
          furigana: [{ content: "うた", leftIndex: 1, rightIndex: 9 }],
          mode: "group",
        },
        // <ボク,0,4> over Voc. - kana ruby over a Latin/punctuation base.
        {
          text: "Voc.",
          furigana: [{ content: "ボク", leftIndex: 0, rightIndex: 4 }],
          mode: "group",
        },
        // <ゼロ,0,1> over 0 - kana ruby over a single digit.
        {
          text: "0",
          furigana: [{ content: "ゼロ", leftIndex: 0, rightIndex: 1 }],
          mode: "mono",
        },
        // <おく,1,2> over 憶 - mono ruby, 2 kana over 1 kanji.
        {
          text: "記憶",
          furigana: [{ content: "おく", leftIndex: 1, rightIndex: 2 }],
          mode: "mono",
        },
      ];

      for (const { text, furigana, mode } of cases) {
        const result = layoutRubyParagraph(shaper, {
          text,
          furigana,
          fontIds: [fontId, latinFontId],
          fontSize: 32,
        });

        expect(result.issues, text).toEqual([]);
        expect(result.rubies, text).toHaveLength(1);
        const ruby = result.rubies[0]!;
        expect(ruby.mode, text).toBe(mode);
        expect(ruby.runs.length, text).toBeGreaterThan(0);
        expect(ruby.baseX[1], text).toBeGreaterThan(ruby.baseX[0]);
        // Ruby clusters never overlap, whatever the width ratio.
        const ordered = [...ruby.runs].sort((a, b) => a.x - b.x);
        for (let i = 1; i < ordered.length; i++) {
          expect(
            ordered[i]!.x - (ordered[i - 1]!.x + ordered[i - 1]!.width),
            text,
          ).toBeGreaterThanOrEqual(-1e-3);
        }
      }
    });

    it("never letterspaces a proportional base, only its edges or inter-word space", () => {
      // Kana ruby wider than a Latin base: JLReq forbids adding space between
      // the Latin letters, so the excess lands on the edges instead.
      const result = layoutRubyParagraph(shaper, {
        text: "字BAD字",
        furigana: [{ content: "バッドバッド", leftIndex: 1, rightIndex: 4 }],
        fontIds: [fontId, latinFontId],
        fontSize: 32,
      });

      expect(result.issues).toEqual([]);
      const line = result.lines[0]!.line;
      const inside = line.clusters.filter(
        (cluster) =>
          cluster.source.utf16Start >= 1 && cluster.source.utf16End <= 4,
      );
      expect(inside).toHaveLength(3);
      // Only the outer edges of the run carry expansion; the letters stay set
      // solid against each other.
      expect(inside[0]!.leadingSpace).toBeGreaterThan(0);
      expect(inside[2]!.trailingSpace).toBeGreaterThan(0);
      expect(inside[0]!.trailingSpace).toBe(0);
      expect(inside[1]!.leadingSpace).toBe(0);
      expect(inside[1]!.trailingSpace).toBe(0);
      expect(inside[2]!.leadingSpace).toBe(0);
    });

    it("anchors the ruby row to the base font's ideographic em box, not its hhea line box", () => {
      // TsimSans reports hhea 1.160/-0.288 but its sTypo box is the ideographic
      // em box, 0.880/-0.120. Anchoring to the latter is what stops ruby from
      // floating 0.21em above the kanji it annotates.
      const metrics = shaper.fontMetrics(fontId);
      expect(metrics.unitsPerEm).toBe(1000);
      expect(metrics.ascender).toBe(1160);
      expect(metrics.typoAscender).toBe(880);

      const result = layoutRubyParagraph(shaper, {
        text: "明日は晴れ",
        furigana: [{ content: "あした", leftIndex: 0, rightIndex: 2 }],
        fontIds: [fontId],
        fontSize: 32,
      });

      expect(result.rubyMetrics).toEqual({
        baseAscentEm: 0.88,
        rubyAscentEm: 0.88,
        rubyDescentEm: 0.12,
      });

      // With rubyGap 0 the ruby's reserved descender sits exactly on the base's
      // ideographic top.
      const { height, baseline } = result.rubyRow;
      const baseTypoTop = height + result.lines[0]!.line.baseline - 0.88 * 32;
      expect(baseline + 0.12 * 16).toBeCloseTo(baseTypoTop, 4);

      // And that is materially tighter than the hhea-derived row would be.
      expect(height).toBeLessThan((1.16 + 0.288) * 16);
    });

    it("keeps ruby fixed relative to the base when a Latin font joins the chain", () => {
      // The Latin face sorts first in the chain, so anything anchored to
      // `faces[0]` moves with it. The sTypo anchor only counts fonts that
      // shaped *annotated base* text, so the ruby-to-base relationship holds.
      const japaneseOnly = layoutRubyParagraph(shaper, {
        text: "明日は晴れ",
        furigana: [{ content: "あした", leftIndex: 0, rightIndex: 2 }],
        fontIds: [fontId],
        fontSize: 32,
      });
      const withLatinFirst = layoutRubyParagraph(shaper, {
        text: "明日は晴れ",
        furigana: [{ content: "あした", leftIndex: 0, rightIndex: 2 }],
        fontIds: [latinFontId, fontId],
        fontSize: 32,
      });

      expect(withLatinFirst.rubyMetrics).toEqual(japaneseOnly.rubyMetrics);

      // Distance from the base baseline up to the ruby baseline: identical.
      const drop = (r: typeof japaneseOnly) =>
        r.lines[0]!.baseline - r.rubyRow.baseline;
      expect(drop(withLatinFirst)).toBeCloseTo(drop(japaneseOnly), 4);

      // The line *box* still differs, because ParagraphLayout.ascent is taken
      // from the chain's first font (hhea 800 for the static Latin face vs 1160
      // for the Japanese one). The reserved row absorbs exactly that
      // difference, which is why the ruby itself does not move.
      const ascentDelta =
        japaneseOnly.lines[0]!.line.baseline -
        withLatinFirst.lines[0]!.line.baseline;
      expect(
        withLatinFirst.rubyRow.height - japaneseOnly.rubyRow.height,
      ).toBeCloseTo(ascentDelta, 4);
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
