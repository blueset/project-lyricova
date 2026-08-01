import { expect, test } from "@playwright/test";

/**
 * Critical smoke + performance-budget case. Tagged `@smoke` so it runs on every
 * project INCLUDING the emulated `mobile-chromium` (Pixel 5) viewport — the one
 * case exercised on the mobile form factor. (Real Android/ADB coverage is not
 * available in CI; see `tests/browser/DEVICE-TESTING.md`.)
 *
 * Budgets are deliberately generous so they assert real invariants without
 * being flaky:
 *  - shaping/layout runs once, not per frame;
 *  - the glyph-outline cache stops missing after the first frame and its hits
 *    keep climbing across frames;
 *  - repeated drawing stays well under a generous per-frame threshold;
 *  - the served WASM / whitelisted font payload sizes are recorded.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
  await page.evaluate(() => window.__glyph.ready());
});

test("end-to-end shape + Canvas2D render smoke @smoke", async ({ page }) => {
  // Real WASM shaping produces safe clusters covering the whole string.
  const layout = await page.evaluate(() =>
    window.__glyph.layout("Glyph PoC", {
      fontChain: ["mona-sans-latin-otf"],
    }),
  );
  expect(layout.lineCount).toBe(1);
  expect(layout.clusters.length).toBeGreaterThan(3);
  expect(layout.missing).toEqual([]);

  // Real Path2D rendering actually paints ink onto the canvas.
  const analysis = await page.evaluate(async () => {
    await window.__glyph.render({
      text: "Glyph PoC",
      fontChain: ["mona-sans-latin-otf"],
      fontSize: 48,
      fillFraction: 1,
      activeColor: "#ffffff",
      inactiveColor: "#ffffff",
    });
    return window.__glyph.analyze({
      activeColor: "#ffffff",
      inactiveColor: "#ffffff",
    });
  });
  expect(analysis.ink).toBeGreaterThan(300);
});

test("performance budgets: one shaping pass, growing cache, fast frames @smoke", async ({
  page,
}, testInfo) => {
  const bench = await page.evaluate(() =>
    window.__glyph.benchmark({
      text: "hello glyph world",
      fontChain: ["mona-sans-latin-otf"],
      fontSize: 44,
      frames: 150,
    }),
  );

  testInfo.annotations.push({
    type: "perf",
    description: JSON.stringify(bench),
  });

  // Layout/shaping happens once for all 150 frames.
  expect(bench.shapeCalls).toBe(1);
  // After the first frame every glyph outline is cached: no further misses.
  expect(bench.missesFinal).toBe(bench.missesAfterFirst);
  expect(bench.missesFinal).toBeGreaterThan(0);
  // Cache hits keep increasing across frames (paths reused every frame).
  expect(bench.hitsFinal).toBeGreaterThan(bench.hitsAfterFirst);
  expect(bench.hitsFinal).toBeGreaterThan(bench.frames);
  // Generous frame-time budget (measured ~0.1ms/frame; threshold is 8ms).
  expect(bench.avgMs).toBeLessThan(8);
  expect(bench.maxFrameMs).toBeLessThan(100);
});

test("records served WASM + whitelisted font payload sizes @smoke", async ({
  page,
}, testInfo) => {
  const payloads = await page.evaluate(() => window.__glyph.payloads());

  testInfo.annotations.push({
    type: "payloads",
    description: JSON.stringify({
      wasmBytes: payloads.wasmBytes,
      loadedFonts: payloads.loadedFonts,
      manifest: payloads.fonts.map((f) => ({
        id: f.id,
        sizeBytes: f.sizeBytes,
        rawSfnt: f.rawSfnt,
      })),
    }),
  });

  // The served WASM binary is a real, sensibly-sized module.
  expect(payloads.wasmBytes).toBeGreaterThan(100_000);
  expect(payloads.wasmBytes).toBeLessThan(5_000_000);

  // Every whitelisted font's byte size is recorded (stat-only listing).
  expect(payloads.fonts.length).toBeGreaterThan(0);
  for (const font of payloads.fonts) {
    expect(font.sizeBytes ?? 0).toBeGreaterThan(0);
  }

  // The fonts actually pulled into the shaper are the small raw-SFNT ones
  // (the multi-megabyte base font is never eagerly loaded here).
  const loadedIds = payloads.loadedFonts.map((f) => f.id);
  expect(loadedIds).toContain("mona-sans-latin-otf");
  for (const font of payloads.loadedFonts) {
    expect(font.bytes).toBeLessThan(2_000_000);
  }
});
