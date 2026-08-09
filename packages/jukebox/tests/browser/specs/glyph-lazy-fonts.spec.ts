import { expect, test } from "@playwright/test";

/**
 * Proves the coverage-aware lazy font path (`GlyphFontManager` +
 * `GET /test-fonts/coverage`): a line downloads only the font(s) its own text
 * needs, so a Latin-only line never fetches the multi-megabyte Source Han
 * subsets, while a Japanese line lazily pulls just the JP subset — not the
 * ~29 MiB full variable OTF or either terminal PlanGothic fallback.
 *
 * `window.__glyph.prepareText` drives the real production manager against the
 * fixture's byte + coverage routes; `payloads().loadedFonts` reports which
 * fonts were actually downloaded (its injected `fetchBytes` records them).
 */

const CJK_SUBSETS = [
  "source-han-sans-jp-vf",
  "source-han-sans-sc-vf",
  "source-han-sans-tc-vf",
];
const FULL_VF = "source-han-sans-vf-otf";
const PLANGOTHIC = ["plangothic-p1-regular-ttf", "plangothic-p2-regular-ttf"];

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
});

test("downloads only the fonts each line needs (Latin vs Japanese)", async ({
  page,
}) => {
  // A Latin-only line selects — and fetches — only the small Latin font.
  const latin = await page.evaluate(() =>
    window.__glyph.prepareText("Hello world"),
  );
  expect(latin.fontManifestIds).toEqual(["inter-variable-ttf"]);

  let loaded = (
    await page.evaluate(() => window.__glyph.payloads())
  ).loadedFonts.map((f) => f.id);
  expect(loaded).toContain("inter-variable-ttf");
  // None of the Han members were touched by a Latin-only line.
  for (const cjk of [...CJK_SUBSETS, FULL_VF, ...PLANGOTHIC]) {
    expect(loaded).not.toContain(cjk);
  }

  // A Japanese line (kanji + kana) then lazily pulls just the JP subset.
  const japanese = await page.evaluate(() =>
    window.__glyph.prepareText("桜あア"),
  );
  expect(japanese.fontManifestIds).toEqual(["source-han-sans-jp-vf"]);
  // The full ~29 MiB VF is never selected for coverable Japanese.
  expect(japanese.fontManifestIds).not.toContain(FULL_VF);

  loaded = (
    await page.evaluate(() => window.__glyph.payloads())
  ).loadedFonts.map((f) => f.id);
  expect(loaded).toContain("source-han-sans-jp-vf");
  expect(loaded).not.toContain(FULL_VF);
  // The other-region subsets stay untouched too.
  expect(loaded).not.toContain("source-han-sans-sc-vf");
  expect(loaded).not.toContain("source-han-sans-tc-vf");
  for (const fallback of PLANGOTHIC) {
    expect(loaded).not.toContain(fallback);
  }
});

test("selects each dedicated script fallback", async ({ page }) => {
  const samples = [
    ["วันนี้อากาศดี", "noto-sans-thai-looped-vf-ttf"],
    ["ສະບາຍດີ", "noto-sans-lao-looped-vf-ttf"],
    ["שלום", "noto-sans-hebrew-vf-ttf"],
    ["مرحبا", "noto-sans-arabic-vf-ttf"],
  ] as const;

  for (const [text, expectedFont] of samples) {
    const selection = await page.evaluate(
      (value) => window.__glyph.prepareText(value),
      text,
    );
    expect(selection.fontManifestIds).toEqual([expectedFont]);
  }

  const loaded = (
    await page.evaluate(() => window.__glyph.payloads())
  ).loadedFonts.map((font) => font.id);
  for (const [, expectedFont] of samples) {
    expect(loaded).toContain(expectedFont);
  }
});

test("uses PlanGothic only for Han extensions Source Han misses", async ({
  page,
}) => {
  const samples = [
    ["𠀀", "plangothic-p1-regular-ttf"],
    ["𰀀", "plangothic-p2-regular-ttf"],
  ] as const;

  for (const [text, expectedFont] of samples) {
    const selection = await page.evaluate(
      (value) => window.__glyph.prepareText(value),
      text,
    );
    expect(selection.fontManifestIds).toEqual([expectedFont]);

    const layout = await page.evaluate(
      ({ value, font }) =>
        window.__glyph.layout(value, {
          fontChain: [font],
          maxWidth: 180,
          features: ["palt=1"],
          variations: ["wght=600", "opsz=40"],
        }),
      { value: text, font: expectedFont },
    );
    expect(layout.missing).toEqual([]);
    expect(layout.clusters.length).toBeGreaterThan(0);
  }
});
