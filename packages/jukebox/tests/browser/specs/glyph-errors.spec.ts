import { expect, test } from "@playwright/test";

/**
 * Error *visibility* for bad font and bad timing input. The production loaders
 * surface typed, human-readable errors (`GlyphFontLoadError`,
 * `KaraokeTimingError`) rather than silently blanking — the same errors the
 * Glyph Canvas component renders as a visible overlay / warning banner. Here we
 * assert both the typed error surface and a real DOM-visible message.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
});

test("surfaces a typed error for an unknown / unparsable / missing-route font", async ({
  page,
}) => {
  const unknown = await page.evaluate(() =>
    window.__glyph.tryBadFont("unknown-id"),
  );
  expect(unknown.ok).toBe(false);
  expect(unknown.errorName).toBe("GlyphFontLoadError");
  expect(unknown.message).toContain("whitelisted font manifest");

  const unparsable = await page.evaluate(() =>
    window.__glyph.tryBadFont("not-a-font"),
  );
  expect(unparsable.ok).toBe(false);
  expect(unparsable.errorName).toBe("GlyphFontLoadError");
  expect(unparsable.message?.toLowerCase()).toContain("register");

  const missingRoute = await page.evaluate(() =>
    window.__glyph.tryBadFont("missing-route"),
  );
  expect(missingRoute.ok).toBe(false);
  expect(missingRoute.errorName).toBe("GlyphFontLoadError");
});

test("surfaces a typed error for invalid karaoke timing input", async ({
  page,
}) => {
  const outOfRange = await page.evaluate(() =>
    window.__glyph.validateTiming([{ index: 99, time: 1 }], 5),
  );
  expect(outOfRange.ok).toBe(false);
  expect(outOfRange.errorName).toBe("KaraokeTimingError");
  expect(outOfRange.message).toContain("out of range");

  const decreasing = await page.evaluate(() =>
    window.__glyph.validateTiming(
      [
        { index: 3, time: 1 },
        { index: 1, time: 2 },
      ],
      5,
    ),
  );
  expect(decreasing.ok).toBe(false);
  expect(decreasing.errorName).toBe("KaraokeTimingError");

  // Valid tags pass cleanly.
  const ok = await page.evaluate(() =>
    window.__glyph.validateTiming(
      [
        { index: 0, time: 0 },
        { index: 5, time: 2 },
      ],
      5,
    ),
  );
  expect(ok.ok).toBe(true);
});

test("shows a visible error banner for bad font and bad timing input", async ({
  page,
}) => {
  await page.getByRole("button", { name: "err-bad-font" }).click();
  const banner = page.getByTestId("err-msg");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("GlyphFontLoadError");

  await page.getByRole("button", { name: "err-bad-timing" }).click();
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("KaraokeTimingError");
});
