import { expect, test } from "@playwright/test";

test("uses native wheel scrolling behind a sticky lyrics viewport", async ({
  page,
}) => {
  await page.goto("/");

  const scroller = page.getByTestId("native-scroller");
  const viewport = page.getByTestId("sticky-lyrics-viewport");
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollTop))
    .toBe(150);
  const initialViewportTop = await viewport.evaluate(
    (node) => node.getBoundingClientRect().top,
  );

  await scroller.hover();
  await page.mouse.wheel(0, 60);

  await expect
    .poll(() => scroller.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(150);
  const nativeScrollTop = await scroller.evaluate((node) => node.scrollTop);
  await expect(page.getByTestId("native-scroll-offset")).toHaveText(
    String(nativeScrollTop - 100),
  );
  await expect(scroller).toHaveAttribute("data-active-scroll", "true");
  await expect
    .poll(() => viewport.evaluate((node) => node.getBoundingClientRect().top))
    .toBe(initialViewportTop);

  await expect(scroller).toHaveAttribute("data-user-scrolling", "false");
  const activeOffset = Number(
    await page.getByTestId("native-scroll-offset").textContent(),
  );
  const resizedOffset = Math.min(activeOffset, 100);
  await page.getByRole("button", { name: "resize-native-scroller" }).click();

  await expect(page.getByTestId("native-scroll-offset")).toHaveText(
    String(resizedOffset),
  );
  await expect
    .poll(() => scroller.evaluate((node) => node.scrollTop))
    .toBe(resizedOffset + 150);
  await expect(scroller).toHaveAttribute("data-user-scrolling", "false");
});

test("synchronizes late mounts, seeks, rates, and replacements", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");

  await page.getByRole("button", { name: "seek-six" }).click();
  await expect(page.getByTestId("frame")).toHaveText("second");
  await expect
    .poll(() =>
      page
        .getByTestId("gsap-target")
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none");

  await page.getByRole("button", { name: "toggle-animation" }).click();
  const animationState = () =>
    page.getByTestId("waapi-target").evaluate((element) => {
      const animations = element.getAnimations();
      return {
        count: animations.length,
        currentTime: animations[0]?.currentTime,
        id: animations[0]?.id,
        playbackRate: animations[0]?.playbackRate,
        playState: animations[0]?.playState,
      };
    });
  await expect.poll(async () => (await animationState()).count).toBe(1);
  await expect
    .poll(async () => Number((await animationState()).currentTime))
    .toBeCloseTo(6000, -1);

  await page.getByRole("button", { name: "rate-two" }).click();
  await expect.poll(async () => (await animationState()).playbackRate).toBe(2);

  await page.getByRole("button", { name: "play", exact: true }).click();
  await expect
    .poll(async () => (await animationState()).playState)
    .toBe("running");
  await page.getByRole("button", { name: "pause", exact: true }).click();
  await expect
    .poll(async () => (await animationState()).playState)
    .toBe("paused");

  await page.getByRole("button", { name: "replace-animation" }).click();
  await expect.poll(async () => (await animationState()).id).toBe("waapi-2");
  await expect.poll(async () => (await animationState()).count).toBe(1);
  await expect
    .poll(async () => Number((await animationState()).currentTime))
    .toBeCloseTo(6000, -1);

  await page.getByRole("button", { name: "seek-before" }).click();
  await expect(page.getByTestId("frame")).toHaveText("none");
  expect(pageErrors).toEqual([]);
});
