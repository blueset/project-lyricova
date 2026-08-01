import { expect, test } from "@playwright/test";

/**
 * Proves the coverage-aware lazy font path (`GlyphFontManager` +
 * `GET /test-fonts/coverage`): a line downloads only the font(s) its own text
 * needs, so a Latin-only line never fetches the multi-megabyte Source Han
 * subsets, while a Japanese line lazily pulls just the JP subset — not the
 * ~29 MiB full variable OTF catch-all.
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
  expect(latin.fontManifestIds).toEqual(["mona-sans-latin-otf"]);

  let loaded = (
    await page.evaluate(() => window.__glyph.payloads())
  ).loadedFonts.map((f) => f.id);
  expect(loaded).toContain("mona-sans-latin-otf");
  // None of the Han members were touched by a Latin-only line.
  for (const cjk of [...CJK_SUBSETS, FULL_VF]) {
    expect(loaded).not.toContain(cjk);
  }

  // A Japanese line (kanji + kana) then lazily pulls just the JP subset.
  const japanese = await page.evaluate(() =>
    window.__glyph.prepareText("桜あア"),
  );
  expect(japanese.fontManifestIds).toEqual(["source-han-sans-jp-vf"]);
  // The full ~29 MiB VF catch-all is never selected for coverable Japanese.
  expect(japanese.fontManifestIds).not.toContain(FULL_VF);

  loaded = (
    await page.evaluate(() => window.__glyph.payloads())
  ).loadedFonts.map((f) => f.id);
  expect(loaded).toContain("source-han-sans-jp-vf");
  expect(loaded).not.toContain(FULL_VF);
  // The other-region subsets stay untouched too.
  expect(loaded).not.toContain("source-han-sans-sc-vf");
  expect(loaded).not.toContain("source-han-sans-tc-vf");
});
