import { expect, test } from "@playwright/test";

/**
 * Real Canvas2D `Path2D` rendering coverage: karaoke fill at 0 / partial / 1,
 * and independent per-cluster transforms. Because antialiasing differs across
 * browsers these use color-classified pixel readback (not exact screenshots)
 * for the dynamic cases, plus one stable per-browser screenshot of a static
 * white-on-black glyph render.
 */

const LATIN = ["mona-sans-latin-otf"];
const ACTIVE = "#ff2000";
const INACTIVE = "#0040ff";

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
  await page.evaluate(() => window.__glyph.ready());
});

test("karaoke fill reveals a cluster left-to-right at 0, partial, and 1", async ({
  page,
}) => {
  const analyzeAt = (fraction: number) =>
    page.evaluate(
      async ({ fraction, chain, active, inactive }) => {
        await window.__glyph.render({
          text: "A",
          fontChain: chain,
          fontSize: 72,
          fillFraction: fraction,
          activeColor: active,
          inactiveColor: inactive,
        });
        return window.__glyph.analyze({
          activeColor: active,
          inactiveColor: inactive,
        });
      },
      { fraction, chain: LATIN, active: ACTIVE, inactive: INACTIVE },
    );

  // Fraction 0: nothing sung -> essentially all inactive.
  const zero = await analyzeAt(0);
  expect(zero.ink).toBeGreaterThan(200);
  expect(zero.active).toBeLessThan(zero.ink * 0.03);
  expect(zero.inactive).toBeGreaterThan(zero.ink * 0.95);

  // Fraction 1: fully sung -> essentially all active.
  const one = await analyzeAt(1);
  expect(one.ink).toBeGreaterThan(200);
  expect(one.inactive).toBeLessThan(one.ink * 0.03);
  expect(one.active).toBeGreaterThan(one.ink * 0.95);

  // Fraction 0.5: the reveal front is inside the cluster -> the sung (active)
  // pixels are concentrated on the leading (left) side of the ink box.
  const half = await analyzeAt(0.5);
  expect(half.active).toBeGreaterThan(0);
  expect(half.inactive).toBeGreaterThan(0);
  expect(half.halves.leftActive).toBeGreaterThan(
    half.halves.rightActive * 3 + 5,
  );
  expect(half.halves.rightInactive).toBeGreaterThan(
    half.halves.leftInactive * 3 + 5,
  );
});

test("transforms one safe cluster independently of its neighbour", async ({
  page,
}) => {
  const shiftY = 24;

  // Baseline: two 'A's, no transform.
  const base = await page.evaluate(
    (chain) =>
      window.__glyph.render({ text: "A A", fontChain: chain, fontSize: 48 }),
    LATIN,
  );
  const inkClusters = base.layout.clusters.filter((c) => !c.isWhitespace);
  expect(inkClusters).toHaveLength(2);
  const originX = base.originX;
  const region = (i: number): [number, number] => {
    const c = inkClusters[i];
    return [
      Math.floor(originX + c.x - 2),
      Math.ceil(originX + c.x + c.advance + 2),
    ];
  };
  const [l0, l1] = region(0);
  const [r0, r1] = region(1);

  const baseLeft = await page.evaluate(
    ([a, b]) => window.__glyph.measureInk(a, b),
    [l0, l1],
  );
  const baseRight = await page.evaluate(
    ([a, b]) => window.__glyph.measureInk(a, b),
    [r0, r1],
  );
  expect(baseLeft.count).toBeGreaterThan(50);
  expect(baseRight.count).toBeGreaterThan(50);

  // Now translate ONLY the last cluster (second 'A') down by shiftY.
  await page.evaluate(
    ({ chain, shift }) =>
      window.__glyph.render({
        text: "A A",
        fontChain: chain,
        fontSize: 48,
        transforms: { 2: { translate: { x: 0, y: shift } } },
      }),
    { chain: LATIN, shift: shiftY },
  );

  const movedLeft = await page.evaluate(
    ([a, b]) => window.__glyph.measureInk(a, b),
    [l0, l1],
  );
  const movedRight = await page.evaluate(
    ([a, b]) => window.__glyph.measureInk(a, b),
    [r0, r1],
  );

  // The untouched neighbour is unchanged; the transformed cluster moved down
  // by ~shiftY (independent per-cluster transform, no re-shaping).
  expect(Math.abs(movedLeft.minY - baseLeft.minY)).toBeLessThanOrEqual(2);
  expect(Math.abs(movedLeft.maxY - baseLeft.maxY)).toBeLessThanOrEqual(2);
  expect(movedRight.minY - baseRight.minY).toBeGreaterThanOrEqual(shiftY - 3);
  expect(movedRight.minY - baseRight.minY).toBeLessThanOrEqual(shiftY + 3);
});

test("renders stable white-on-black glyphs (per-browser screenshot)", async ({
  page,
}) => {
  await page.evaluate(
    (chain) =>
      window.__glyph.render({
        text: "Ag",
        fontChain: chain,
        fontSize: 96,
        width: 220,
        height: 140,
        fillFraction: 1,
        activeColor: "#ffffff",
        inactiveColor: "#ffffff",
        background: "#000000",
      }),
    LATIN,
  );
  const canvas = page.getByTestId("probe-canvas");
  await expect(canvas).toHaveScreenshot("glyph-ag.png", {
    maxDiffPixelRatio: 0.02,
  });
});

test("draws every Latin letter of the production chain, including high-gvar glyphs", async ({
  page,
}) => {
  // Regression: `ttf-parser` keeps a glyph's `gvar` tuples in a fixed 32-slot
  // stack buffer unless its `gvar-alloc` feature is on, and silently outlines
  // nothing past that. Mona Sans VF needs 35 tuples for `e` and `f`, so both
  // used to vanish from rendered text while every other letter drew normally.
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const blank: string[] = [];

  for (const ch of letters) {
    const ink = await page.evaluate(async (letter) => {
      await window.__glyph.render({
        text: letter,
        fontChain: ["mona-sans-latin-otf"],
        fontSize: 96,
        width: 160,
        height: 160,
        originX: 20,
        baseline: 120,
        fillFraction: 1,
        activeColor: "#ffffff",
        inactiveColor: "#ffffff",
        background: "#000000",
        variations: ["wght=600"],
      });
      return window.__glyph.measureInk(0, 160).count;
    }, ch);
    if (ink === 0) blank.push(ch);
  }

  expect(blank).toEqual([]);
});
