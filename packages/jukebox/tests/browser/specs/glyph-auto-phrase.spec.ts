import { expect, test } from "@playwright/test";

const KANA = ["source-han-sans-vf-otf"] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
});

test("leaves non-CJT text untouched and segments mixed Japanese text only", async ({
  page,
}) => {
  const nonCjt = await page.evaluate(() =>
    window.__glyph.autoPhrase("Hello world 123 😀"),
  );
  expect(nonCjt).toEqual({ phraseRanges: [], runs: [] });

  const mixed = await page.evaluate(() =>
    window.__glyph.autoPhrase("今日は Hatsune Miku です"),
  );
  expect(mixed.runs.map((run) => [run.language, run.text])).toEqual([
    ["ja", "今日は"],
    ["ja", "です"],
  ]);
  const latinStart = "今日は ".length;
  const latinEnd = "今日は Hatsune Miku".length;
  expect(
    mixed.phraseRanges.every(
      ([start, end]) => end <= latinStart || start >= latinEnd,
    ),
  ).toBe(true);
});

test("uses Japanese for Han-only text in the MVP", async ({ page }) => {
  const result = await page.evaluate(() => window.__glyph.autoPhrase("東京"));
  expect(result.runs).toEqual([
    { language: "ja", utf16Range: [0, 2], text: "東京" },
  ]);
});

test("segments and renders Thai without missing glyph coverage", async ({
  page,
}) => {
  const text = "วันนี้อากาศดี";
  const phrase = await page.evaluate(
    (value) => window.__glyph.autoPhrase(value),
    text,
  );
  expect(phrase.runs).toHaveLength(1);
  expect(phrase.runs[0]?.language).toBe("th");

  const layout = await page.evaluate(
    ({ value, phraseRanges }) =>
      window.__glyph.layout(value, {
        fontChain: ["noto-sans-thai-vf-ttf", "mona-sans-latin-otf"],
        phraseRanges,
        maxWidth: 180,
        wrapStrategy: "balanced",
      }),
    { value: text, phraseRanges: phrase.phraseRanges },
  );
  expect(layout.missing).toEqual([]);
  expect(layout.clusters.length).toBeGreaterThan(0);
});

test("prefers BudouX phrase boundaries but still wraps overlong text", async ({
  page,
}) => {
  const result = await page.evaluate(async (chain) => {
    const text = "これはテストです";
    const phrase = window.__glyph.autoPhrase(text);
    const insidePhrase = (offset: number) =>
      phrase.phraseRanges.some(
        ([start, end]) => start < offset && offset < end,
      );

    for (let maxWidth = 48; maxWidth <= 240; maxWidth += 4) {
      const plain = await window.__glyph.layout(text, {
        fontChain: chain,
        maxWidth,
        wrapStrategy: "balanced",
      });
      const phrased = await window.__glyph.layout(text, {
        fontChain: chain,
        maxWidth,
        wrapStrategy: "balanced",
        phraseRanges: phrase.phraseRanges,
      });
      const plainBreaksInside = plain.lineRanges
        .slice(0, -1)
        .some(([, end]) => insidePhrase(end));
      const phraseBreaksInside = phrased.lineRanges
        .slice(0, -1)
        .some(([, end]) => insidePhrase(end));
      if (plainBreaksInside && !phraseBreaksInside) {
        return { maxWidth, phrase, plain, phrased };
      }
    }
    return null;
  }, KANA);

  expect(result).not.toBeNull();
  expect(result!.phrase.phraseRanges).toEqual([
    [0, 3],
    [3, 8],
  ]);
  expect(
    result!.phrased.lineWidths.every(
      (width) => width <= result!.maxWidth + 0.01,
    ),
  ).toBe(true);
});
