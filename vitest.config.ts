import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Aggregate every workspace package's own vitest.config.ts so `vitest`
    // (or `vitest run`) at the repo root runs/watches the whole monorepo.
    // Per-package runs still happen through turbo (each package's `test`
    // script), which keeps task-level caching granular.
    projects: ["packages/*"],
  },
});
