import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser/specs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "line",
  // A single glyph test loads the WASM shaper + fetches fonts; give cold CI
  // runners headroom above the 30s default so a slow first paint is never a
  // false failure (steady-state runs finish in well under a second).
  timeout: 45_000,
  // The glyph fixture initializes the real WASM shaper and fetches whitelisted
  // font bytes on load, so give assertions a little more headroom than the 5s
  // default while keeping the suite non-flaky.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "vite --config tests/browser/vite.config.ts --host 127.0.0.1",
    cwd: __dirname,
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      // Emulated mobile Chromium viewport (Pixel 5). Runs only the critical
      // smoke/performance case (tagged `@smoke`) so the mobile form factor is
      // exercised without duplicating the whole desktop matrix. This is an
      // emulated viewport, NOT a real Android device — see
      // `tests/browser/DEVICE-TESTING.md` for the real-device acceptance
      // checklist and why real Android/ADB coverage is not run here.
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
      grep: /@smoke/,
    },
  ],
});
