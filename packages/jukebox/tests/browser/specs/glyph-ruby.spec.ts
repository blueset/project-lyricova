import { expect, test } from "@playwright/test";

/**
 * Horizontal Japanese ruby (furigana) placement + metrics against the real
 * WASM shaper in the browser, following the JLReq-derived specification:
 * data-driven mono/group selection, the deterministic document-level ruby row,
 * class-budgeted overhang, JLReq base expansion pre-measured into paragraph
 * layout, and ruby-aligned line heads. Mirrors the native/vitest ruby fixtures.
 */

const KANA = ["source-han-sans-vf-otf"];
const LATIN = ["mona-sans-latin-otf"];

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
  await page.evaluate(() => window.__glyph.ready());
});

test("places group ruby over an atomic base range and reserves one deterministic row", async ({
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
  // The annotation spans two base graphemes, so it is group ruby.
  expect(ruby.mode).toBe("group");
  expect(ruby.runCount).toBeGreaterThan(0);
  expect(ruby.glyphCount).toBeGreaterThan(0);
  expect(ruby.baseX[1]).toBeGreaterThan(ruby.baseX[0]);
  // Default ratio: half the base size, uncapped.
  expect(ruby.fontSize).toBeCloseTo(16, 3);
  expect(result.rubyRow.fontSize).toBeCloseTo(16, 3);
  // Ink metrics are still measured from the real glyph outlines...
  expect(ruby.inkAscent).toBeGreaterThan(0);
  expect(ruby.inkDescent).toBeGreaterThanOrEqual(0);
  // ...but the shared baseline comes from the deterministic row instead.
  expect(ruby.y).toBeCloseTo(result.rubyRow.baseline, 3);
  expect(result.rubyRow.height).toBeGreaterThan(0);

  // Every line grows by exactly the same reserved row.
  for (const line of result.lines) {
    expect(line.height).toBeCloseTo(
      line.lineBoxHeight + result.rubyRow.height,
      2,
    );
  }
});

test("takes ruby type from the input data rather than re-deriving it", async ({
  page,
}) => {
  const grouped = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "手目",
        furigana: [{ content: "てめ", leftIndex: 0, rightIndex: 2 }],
        fontChain: chain,
        fontSize: 32,
      }),
    KANA,
  );
  expect(grouped.issues).toEqual([]);
  // Grapheme counts line up 1:1, but upstream chose not to split it, so this
  // stays group ruby.
  expect(grouped.rubies[0].mode).toBe("group");

  const mono = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "手目",
        furigana: [
          { content: "て", leftIndex: 0, rightIndex: 1 },
          { content: "め", leftIndex: 1, rightIndex: 2 },
        ],
        fontChain: chain,
        fontSize: 32,
      }),
    KANA,
  );
  expect(mono.issues).toEqual([]);
  expect(mono.rubies.map((r) => r.mode)).toEqual(["mono", "mono"]);
  expect(mono.rubies.every((r) => r.runCount === 1)).toBe(true);
});

test("reserves the ruby row uniformly, and not at all when the document has none", async ({
  page,
}) => {
  const reserved = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "明日は晴れ",
        furigana: [],
        fontChain: chain,
        fontSize: 32,
        reserveRubyRow: true,
      }),
    KANA,
  );
  expect(reserved.rubies).toHaveLength(0);
  expect(reserved.rubyRow.height).toBeGreaterThan(0);
  expect(reserved.lines[0].height).toBeCloseTo(
    reserved.lines[0].lineBoxHeight + reserved.rubyRow.height,
    2,
  );

  const bare = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "明日は晴れ",
        furigana: [{ content: "あした", leftIndex: 0, rightIndex: 2 }],
        fontChain: chain,
        fontSize: 32,
        reserveRubyRow: false,
      }),
    KANA,
  );
  expect(bare.rubyRow.height).toBe(0);
  expect(bare.lines[0].height).toBeCloseTo(bare.lines[0].lineBoxHeight, 2);
});

test("caps the ruby size with a caller-supplied absolute maximum", async ({
  page,
}) => {
  const capped = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "明日は晴れ",
        furigana: [{ content: "あした", leftIndex: 0, rightIndex: 2 }],
        fontChain: chain,
        fontSize: 96,
        rubyFontSizeMax: 20,
      }),
    KANA,
  );
  // The ratio alone would give 48; the absolute cap takes precedence.
  expect(capped.rubies[0].fontSize).toBe(20);
});

test("expands the base for over-long ruby that its neighbours cannot absorb", async ({
  page,
}) => {
  const result = await page.evaluate(
    ({ base, latin }) =>
      window.__glyph.ruby({
        text: "字山字",
        furigana: [{ content: "gpjygpjy", leftIndex: 1, rightIndex: 2 }],
        fontChain: base,
        rubyFontChain: latin,
        fontSize: 32,
      }),
    { base: KANA, latin: LATIN },
  );

  expect(result.issues).toEqual([]);
  const spacing = result.lines[0].spacing;
  // Ideographic neighbours grant zero overhang, so the annotated cluster gets
  // symmetric JLReq edge gaps and everything after it shifts right.
  expect(spacing[1].leadingSpace).toBeGreaterThan(0);
  expect(spacing[1].trailingSpace).toBeCloseTo(spacing[1].leadingSpace, 2);
  expect(spacing[0].leadingSpace).toBe(0);
  expect(spacing[0].trailingSpace).toBe(0);
  expect(spacing[2].leadingSpace).toBe(0);

  // The ruby fills the expanded box instead of overhanging onto the ideographs.
  const ruby = result.rubies[0];
  expect(ruby.inkLeft).toBeGreaterThanOrEqual(ruby.baseX[0] - 1);
  expect(ruby.inkRight).toBeLessThanOrEqual(ruby.baseX[1] + 1);
});

test("leaves the base undisturbed when kana neighbours grant enough overhang", async ({
  page,
}) => {
  const result = await page.evaluate(
    ({ base, latin }) =>
      window.__glyph.ruby({
        text: "のは山のは",
        furigana: [{ content: "gp", leftIndex: 2, rightIndex: 3 }],
        fontChain: base,
        rubyFontChain: latin,
        fontSize: 32,
      }),
    { base: KANA, latin: LATIN },
  );

  expect(result.issues).toEqual([]);
  for (const cluster of result.lines[0].spacing) {
    expect(cluster.leadingSpace).toBe(0);
    expect(cluster.trailingSpace).toBe(0);
  }
});

test("aligns ruby with the line head instead of clipping its overhang", async ({
  page,
}) => {
  const result = await page.evaluate(
    ({ base, latin }) =>
      window.__glyph.ruby({
        text: "山のは",
        furigana: [{ content: "gpjygpjy", leftIndex: 0, rightIndex: 1 }],
        fontChain: base,
        rubyFontChain: latin,
        fontSize: 32,
      }),
    { base: KANA, latin: LATIN },
  );

  const line = result.lines[0];
  const ruby = result.rubies[0];
  // At the paragraph edge the ruby hangs out left of the base, and the line's
  // content is inset by exactly that much so nothing is clipped.
  expect(ruby.inkLeft).toBeLessThan(0);
  expect(line.contentOffsetX).toBeCloseTo(-ruby.inkLeft, 3);
  expect(line.occupiedWidth).toBeGreaterThan(line.lineWidth);
  expect(result.width).toBeGreaterThanOrEqual(line.occupiedWidth - 1e-3);
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
  // "g/p/j/y" all drop below the baseline: descent must be measured, not 0.
  expect(ruby.inkDescent).toBeGreaterThan(0);
  const line = result.lines[ruby.lineIndex];
  expect(line.height).toBeCloseTo(
    line.lineBoxHeight + result.rubyRow.height,
    2,
  );
});

test("keeps each base+ruby pair unbreakable while wrapping between pairs", async ({
  page,
}) => {
  const result = await page.evaluate(
    (chain) =>
      window.__glyph.ruby({
        text: "明日は晴れ明日は晴れ明日は晴れ",
        furigana: [
          { content: "あした", leftIndex: 0, rightIndex: 2 },
          { content: "あした", leftIndex: 5, rightIndex: 7 },
          { content: "あした", leftIndex: 10, rightIndex: 12 },
        ],
        fontChain: chain,
        fontSize: 32,
        maxWidth: 160,
      }),
    KANA,
  );

  expect(result.issues).toEqual([]);
  expect(result.lines.length).toBeGreaterThan(1);
  expect(result.rubies).toHaveLength(3);
  // Line advance stays constant even though only some lines carry ruby.
  const advances = result.lines
    .slice(1)
    .map((line, index) => line.top - result.lines[index].top);
  for (const advance of advances) {
    expect(advance).toBeCloseTo(advances[0], 3);
  }
});
