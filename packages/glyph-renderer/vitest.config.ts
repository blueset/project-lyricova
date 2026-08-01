import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["ts/**/*.{test,spec}.ts"],
  },
});
