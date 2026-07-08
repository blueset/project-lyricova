import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Only run the TypeScript sources under src (not compiled output in dist/);
    // mirrors the old Jest `roots: ["<rootDir>/src"]`.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
