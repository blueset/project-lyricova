import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "fixture"),
  plugins: [react()],
  server: {
    port: 4173,
    strictPort: true,
    fs: {
      allow: [path.resolve(import.meta.dirname, "../..")],
    },
  },
});
