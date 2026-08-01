import { expect, test } from "@playwright/test";

/**
 * Structural shaping coverage against the *real* WASM shaper loaded in the
 * browser (no Next.js). These assert the public `ParagraphLayout` /
 * `ShapedCluster` contract - safe-cluster grouping, source ranges, bidi visual
 * order/levels, and grapheme-aware font fallback - and mirror the native
 * `cargo test` layout fixtures so they stay green as the Rust engine evolves.
 */

const LATIN = ["mona-sans-latin-otf"];
const SOURCE_HAN = ["source-han-sans-vf-otf"];
const LATIN_KANA = ["mona-sans-latin-otf", ...SOURCE_HAN];

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
  await page.evaluate(() => window.__glyph.ready());
});

test("clusters a Latin ligature into one safe cluster spanning both characters", async ({
  page,
}) => {
  const ligated = await page.evaluate(
    (chain) => window.__glyph.layout("ff", { fontChain: chain }),
    LATIN,
  );
  expect(ligated.clusters).toHaveLength(1);
  const cluster = ligated.clusters[0];
  expect([cluster.u16Start, cluster.u16End]).toEqual([0, 2]);
  expect(cluster.glyphCount).toBe(1);
  expect(cluster.script).toBe("Latn");
  expect(cluster.isWhitespace).toBe(false);
  // Non-degenerate ink for a visible ligature.
  expect(cluster.ink.xMax).toBeGreaterThan(cluster.ink.xMin);
  expect(ligated.missing).toEqual([]);

  // Disabling `liga` splits it back into two per-character clusters.
  const split = await page.evaluate(
    (chain) =>
      window.__glyph.layout("ff", { fontChain: chain, features: ["-liga"] }),
    LATIN,
  );
  expect(split.clusters).toHaveLength(2);
  expect([split.clusters[0].u16Start, split.clusters[0].u16End]).toEqual([
    0, 1,
  ]);
  expect([split.clusters[1].u16Start, split.clusters[1].u16End]).toEqual([
    1, 2,
  ]);
});

test("keeps a base + combining mark as one grapheme cluster", async ({
  page,
}) => {
  // "e" + U+0301 COMBINING ACUTE ACCENT -> one extended grapheme cluster.
  const layout = await page.evaluate(
    (chain) => window.__glyph.layout("e\u0301", { fontChain: chain }),
    LATIN,
  );
  expect(layout.clusters).toHaveLength(1);
  const cluster = layout.clusters[0];
  // Two UTF-16 units (base + mark), one atomic cluster, one glyph.
  expect([cluster.u16Start, cluster.u16End]).toEqual([0, 2]);
  expect(cluster.isWhitespace).toBe(false);
  expect(cluster.script).toBe("Latn");
  // Mona Sans covers both e and the acute mark -> nothing degraded.
  expect(layout.missing).toEqual([]);
});

test("reorders a mixed LTR/RTL paragraph into visual order with bidi levels", async ({
  page,
}) => {
  // "ab" + Hebrew "אבג" (U+05D0..05D2) + "cd", base LTR.
  const layout = await page.evaluate(
    (chain) =>
      window.__glyph.layout("ab\u05D0\u05D1\u05D2cd", { fontChain: chain }),
    LATIN,
  );
  expect(layout.baseDirection).toBe("ltr");

  // Visual (left-to-right) order: a b [gimel bet alef] c d — the Hebrew run
  // is reversed relative to logical order.
  expect(layout.clusters.map((c) => c.u16Start)).toEqual([0, 1, 4, 3, 2, 5, 6]);
  expect(layout.clusters.map((c) => c.direction)).toEqual([
    "ltr",
    "ltr",
    "rtl",
    "rtl",
    "rtl",
    "ltr",
    "ltr",
  ]);
  expect(layout.clusters.map((c) => c.level)).toEqual([0, 0, 1, 1, 1, 0, 0]);

  // x-positions increase monotonically across the visual line.
  const xs = layout.clusters.map((c) => c.x);
  for (let i = 1; i < xs.length; i += 1) {
    expect(xs[i]).toBeGreaterThan(xs[i - 1]);
  }

  // The uncovered Hebrew run is reported as degraded coverage (UTF-16 [2,5)).
  expect(layout.missing).toEqual([{ u16Start: 2, u16End: 5 }]);
});

test("assigns each script run to its covering font (Japanese fallback)", async ({
  page,
}) => {
  // "A" (Latin) + "あ" (Hiragana) + "B" (Latin) over [Latin, kana] chain.
  const layout = await page.evaluate(
    (chain) => window.__glyph.layout("A\u3042B", { fontChain: chain }),
    LATIN_KANA,
  );
  expect(layout.clusters).toHaveLength(3);
  const [a, kana, b] = layout.clusters;
  expect(a.script).toBe("Latn");
  expect(kana.script).toBe("Hira");
  expect(b.script).toBe("Latn");
  // Latin clusters resolve to the first font; the kana cluster falls through
  // to the second — a real, deterministic fallback, no absolute ids assumed.
  expect(a.fontId).toBe(b.fontId);
  expect(kana.fontId).not.toBe(a.fontId);
  // Every character is covered by some font in the chain.
  expect(layout.missing).toEqual([]);
});

test("balances wrapped line widths without changing the greedy line count", async ({
  page,
}) => {
  const result = await page.evaluate(async (chain) => {
    const text = "alpha beta gamma delta epsilon zeta eta theta";
    const spread = (widths: number[]) =>
      Math.max(...widths) - Math.min(...widths);

    for (let maxWidth = 160; maxWidth <= 360; maxWidth += 8) {
      const greedy = await window.__glyph.layout(text, {
        fontChain: chain,
        maxWidth,
        wrapStrategy: "greedy",
      });
      if (greedy.lineCount < 2) continue;

      const balanced = await window.__glyph.layout(text, {
        fontChain: chain,
        maxWidth,
        wrapStrategy: "balanced",
      });
      if (
        balanced.lineCount === greedy.lineCount &&
        spread(balanced.lineWidths) + 1 < spread(greedy.lineWidths)
      ) {
        return { maxWidth, greedy, balanced };
      }
    }
    return null;
  }, LATIN);

  expect(result).not.toBeNull();
  expect(result!.balanced.lineCount).toBe(result!.greedy.lineCount);
  const greedySpread =
    Math.max(...result!.greedy.lineWidths) -
    Math.min(...result!.greedy.lineWidths);
  const balancedSpread =
    Math.max(...result!.balanced.lineWidths) -
    Math.min(...result!.balanced.lineWidths);
  expect(balancedSpread).toBeLessThan(greedySpread);
  expect(
    result!.balanced.lineWidths.every((width) => width <= result!.maxWidth),
  ).toBe(true);
});

test("applies Source Han palt and variable weight settings", async ({
  page,
}) => {
  const widths = await page.evaluate(async (chain) => {
    const text = "「テスト」、";
    const normal = await window.__glyph.layout(text, {
      fontChain: chain,
      features: ["palt=0"],
      variations: ["wght=600"],
    });
    const proportional = await window.__glyph.layout(text, {
      fontChain: chain,
      features: ["palt=1"],
      variations: ["wght=600"],
    });
    return { normal: normal.width, proportional: proportional.width };
  }, SOURCE_HAN);
  expect(widths.proportional).not.toBeCloseTo(widths.normal, 3);

  const ink = await page.evaluate(async (chain) => {
    window.__glyph.resetProbeCache();
    await window.__glyph.render({
      text: "永",
      fontChain: chain,
      variations: ["wght=250"],
      width: 120,
      height: 100,
      fillFraction: 1,
      activeColor: "#ffffff",
      inactiveColor: "#ffffff",
    });
    const thin = window.__glyph.analyze({
      activeColor: "#ffffff",
    }).ink;

    await window.__glyph.render({
      text: "永",
      fontChain: chain,
      variations: ["wght=600"],
      width: 120,
      height: 100,
      fillFraction: 1,
      activeColor: "#ffffff",
      inactiveColor: "#ffffff",
    });
    const semibold = window.__glyph.analyze({
      activeColor: "#ffffff",
    }).ink;
    return { thin, semibold };
  }, SOURCE_HAN);
  expect(ink.semibold).toBeGreaterThan(ink.thin);
});
