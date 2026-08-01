import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
});

test("wraps a long Latin translation within the available width", async ({
  page,
}) => {
  const maxWidth = 180;
  const layout = await page.evaluate(
    ({ text, width }) => window.__glyph.wrapTranslation(text, width, "en"),
    {
      text: "This translation should wrap naturally across several words.",
      width: maxWidth,
    },
  );

  expect(layout.lines.length).toBeGreaterThan(1);
  expect(layout.lines.every((line) => line.width <= maxWidth + 0.01)).toBe(
    true,
  );
  expect(layout.height).toBe(layout.lines.length * layout.lineHeight);
});

test("wraps a Chinese translation using its BudouX phrase hint", async ({
  page,
}) => {
  const maxWidth = 120;
  const text = "是今天的天气。是今天的天气。";
  const layout = await page.evaluate(
    ({ value, width }) =>
      window.__glyph.wrapTranslation(value, width, "zh-Hans"),
    { value: text, width: maxWidth },
  );

  expect(layout.lines.length).toBeGreaterThan(1);
  expect(layout.lines.every((line) => line.width <= maxWidth + 0.01)).toBe(
    true,
  );
  expect(layout.lines.map((line) => line.text).join("")).toBe(text);
});

test("preserves RTL base direction and strips mandatory NEL separators", async ({
  page,
}) => {
  const rtl = await page.evaluate(() =>
    window.__glyph.wrapTranslation("שלום, world!", 240, "he"),
  );
  expect(rtl.lines).toHaveLength(1);
  expect(rtl.lines[0]?.direction).toBe("rtl");
  expect(rtl.lines[0]?.text).toBe("שלום, world!");

  const nel = await page.evaluate(() =>
    window.__glyph.wrapTranslation("ab\u0085cd", 240, "en"),
  );
  expect(nel.lines.map((line) => line.text)).toEqual(["ab", "cd"]);
});
