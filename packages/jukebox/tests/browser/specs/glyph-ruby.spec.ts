import { expect, test } from "@playwright/test";

/**
 * Horizontal Japanese ruby (furigana) placement + metrics against the real
 * WASM shaper in the browser. Mirrors the native/vitest ruby fixtures: group
 * vs mono selection, one-line base ranges, and per-annotation ink ascent/
 * descent measured from the *actual* shaped ruby glyphs (including a distinct
 * Latin ruby fallback font's real descenders).
 */

const KANA = ["source-han-sans-vf-otf"];
const LATIN = ["mona-sans-latin-otf"];

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
  await page.evaluate(() => window.__glyph.ready());
});

test("places group ruby over an atomic base range and reserves its ink row", async ({
  page,
}) => {
  const result = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "明日は晴れ",
        furigana: [{ content: "あした", leftIndex: 0, rightIndex: 2 }],
        fontChain: chain,
        fontSize: 32,
      }),
    KANA,
  );

  expect(result.issues).toEqual([]);
  expect(result.rubies).toHaveLength(1);
  const ruby = result.rubies[0];
  // "明日" (2 graphemes) vs "あした" (3 graphemes) can't map 1:1 -> group.
  expect(ruby.mode).toBe("group");
  expect(ruby.runCount).toBeGreaterThan(0);
  expect(ruby.glyphCount).toBeGreaterThan(0);
  // Base range spans a real, positive width.
  expect(ruby.baseX[1]).toBeGreaterThan(ruby.baseX[0]);
  // Default ruby font size is half the base.
  expect(ruby.fontSize).toBeCloseTo(16, 3);
  // Ink metrics are measured from the real glyph outlines.
  expect(ruby.inkAscent).toBeGreaterThan(0);
  expect(ruby.inkDescent).toBeGreaterThanOrEqual(0);
  // The ruby baseline sits at its measured ink ascent.
  expect(ruby.y).toBeCloseTo(ruby.inkAscent, 3);

  // The annotated line grew to reserve room for the ruby row above it.
  const line = result.lines[ruby.lineIndex];
  expect(line.height).toBeGreaterThan(line.lineBoxHeight);
  expect(line.height).toBeCloseTo(
    line.lineBoxHeight + ruby.inkAscent + ruby.inkDescent,
    2,
  );
});

test("selects mono ruby for a clean 1:1 base/ruby grapheme mapping", async ({
  page,
}) => {
  const result = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "手目",
        furigana: [{ content: "てめ", leftIndex: 0, rightIndex: 2 }],
        fontChain: chain,
        fontSize: 32,
      }),
    KANA,
  );
  expect(result.issues).toEqual([]);
  expect(result.rubies).toHaveLength(1);
  const ruby = result.rubies[0];
  // Two single-kanji / single-mora readings -> mono, one run per base cluster.
  expect(ruby.mode).toBe("mono");
  expect(ruby.runCount).toBe(2);
});

test("measures real descent from a distinct Latin ruby fallback font", async ({
  page,
}) => {
  const result = await page.evaluate(
    ({ base, latin }) =>
      window.__glyph.ruby({
        text: "山",
        furigana: [{ content: "gpjy", leftIndex: 0, rightIndex: 1 }],
        fontChain: base,
        rubyFontChain: latin,
        fontSize: 32,
      }),
    { base: KANA, latin: LATIN },
  );
  expect(result.issues).toEqual([]);
  const ruby = result.rubies[0];
  expect(ruby.inkAscent).toBeGreaterThan(0);
  // "g/p/j/y" all drop below the baseline: descent must be reserved, not 0.
  expect(ruby.inkDescent).toBeGreaterThan(0);
  const line = result.lines[ruby.lineIndex];
  expect(line.height).toBeCloseTo(
    line.lineBoxHeight + ruby.inkAscent + ruby.inkDescent,
    2,
  );
});
