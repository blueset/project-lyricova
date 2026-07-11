import { expect, test } from "@playwright/test";

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
