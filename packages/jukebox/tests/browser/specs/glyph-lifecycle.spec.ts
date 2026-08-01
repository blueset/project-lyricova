import { expect, test, type Page } from "@playwright/test";

/**
 * Playback lifecycle through the shared media-clock seam
 * ({@link file://../../../src/hooks/useMediaClock.ts}): late readiness, seek,
 * playback-rate, and pause/play, plus the invariant that shaping/layout runs
 * only on layout inputs (size), never per animation frame. Driven by a fake
 * media element so it is fully deterministic.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/glyph.html");
  await page.waitForFunction(() => Boolean(window.__glyph));
});

async function start(page: Page) {
  await page.getByRole("button", { name: "lc-start" }).click();
  await expect(page.getByTestId("lc-status")).toHaveText("ready");
}

test("repaints the current snapshot on late readiness and follows seek/rate", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  // Seek BEFORE the glyph renderer is mounted: the media clock has no listener
  // yet, but the transport time advances to 5s (half of the 10s duration).
  await page.getByRole("button", { name: "lc-seek-mid" }).click();

  // Mount late: once fonts/layout become ready the renderer must paint whatever
  // the current (already-seeked) snapshot is — reveal ≈ 5/10 * 11 chars.
  await start(page);
  await expect.poll(() =>
    page.getByTestId("lc-time").textContent(),
  ).toBe("5.000");
  await expect
    .poll(async () => Number(await page.getByTestId("lc-reveal").textContent()))
    .toBeCloseTo(5.5, 1);

  // Seeking back to the start rewinds the reveal to 0.
  await page.getByRole("button", { name: "lc-seek-start" }).click();
  await expect
    .poll(async () => Number(await page.getByTestId("lc-reveal").textContent()))
    .toBeCloseTo(0, 5);

  // Rate change flows through the snapshot.
  await page.getByRole("button", { name: "lc-rate-two" }).click();
  await expect(page.getByTestId("lc-rate")).toHaveText("2");

  expect(pageErrors).toEqual([]);
});

test("shapes only on layout inputs (size), never per clock frame", async ({
  page,
}) => {
  await start(page);
  await expect(page.getByTestId("lc-shapes")).toHaveText("1");

  // A burst of clock activity: seeks + a rate change all repaint but must not
  // re-shape.
  await page.getByRole("button", { name: "lc-seek-mid" }).click();
  await page.getByRole("button", { name: "lc-seek-start" }).click();
  await page.getByRole("button", { name: "lc-seek-mid" }).click();
  await page.getByRole("button", { name: "lc-rate-two" }).click();
  await expect(page.getByTestId("lc-shapes")).toHaveText("1");

  // Resizing IS a layout input -> exactly one additional shaping pass.
  await page.getByRole("button", { name: "lc-resize" }).click();
  await expect(page.getByTestId("lc-shapes")).toHaveText("2");
});

test("play drives repaint frames and grows the outline cache; pause halts them", async ({
  page,
}) => {
  await start(page);

  const draws = () =>
    page.getByTestId("lc-draws").textContent().then((t) => Number(t));
  const before = await draws();

  // Play: the media clock's animation-frame loop repaints continuously.
  await page.getByRole("button", { name: "lc-play" }).click();
  await expect(page.getByTestId("lc-state")).toHaveText("playing");
  await expect.poll(draws).toBeGreaterThan(before + 3);

  // Repeated drawing reuses cached glyph outlines: hits accumulate well past
  // the fixed number of distinct-glyph misses.
  const hits = Number(await page.getByTestId("lc-hits").textContent());
  const misses = Number(await page.getByTestId("lc-misses").textContent());
  expect(misses).toBeGreaterThan(0);
  expect(hits).toBeGreaterThan(misses);

  // Pause: the frame loop stops, so the draw count stabilises.
  await page.getByRole("button", { name: "lc-pause" }).click();
  await expect(page.getByTestId("lc-state")).toHaveText("paused");
  await page.waitForTimeout(250);
  const settled = await draws();
  await page.waitForTimeout(250);
  expect(await draws()).toBe(settled);
});
