import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { FONT_MANIFEST } from "../../../api/src/fonts/manifest";
import { loadFontById, statFontById } from "../../../api/src/fonts/server";
import { getFontCoverage } from "../../../api/src/fonts/coverage";
import { loadGlyphWasm } from "../../src/app/api/glyph-renderer/wasm/wasmFile";

/**
 * Cache-Control the API package now sends for font bytes and the coverage
 * contract (see `FontsController.REVALIDATE_CACHE_CONTROL`): cacheable but
 * always revalidated against the strong, content-derived ETag, so a changed
 * binary is never served stale. The fixture mirrors it, including conditional
 * `If-None-Match` → `304`, so browser-side cache behavior matches production.
 */
const REVALIDATE_CACHE_CONTROL = "public, no-cache, must-revalidate";

/**
 * Mirrors the API package's `/api/fonts` Express routes as Vite dev-server
 * middleware, so browser-side glyph shaping code can fetch the same
 * whitelisted font bytes without running the API server or copying binaries.
 *
 * Whitelisting is identical to the Next.js route: only IDs present in
 * `FONT_MANIFEST` are servable, looked up via `loadFontById`, and never used
 * to build a filesystem path directly.
 *
 * Exposed at `/test-fonts` (list) and `/test-fonts/:fontId` (bytes). Fixture
 * code should resolve font URLs through
 * `tests/browser/fixture/src/testFonts.ts`, which defaults to these paths
 * but honors a `VITE_FONT_BASE_URL` override (e.g. to point at a running
 * Jukebox instance that proxies `/api/fonts` to the API server).
 */
function testFontDeliveryPlugin(): Plugin {
  return {
    name: "lyricova-test-font-delivery",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/test-fonts") {
          // Mirror the API package's `/api/fonts` route exactly, including its
          // stat-only sizing: `statFontById` reports each whitelisted font's
          // byte size via `fs.stat` (metadata only) without reading or caching
          // the multi-megabyte binaries. Shape matches the production route
          // (`sizeBytes`, not a byte read).
          const fonts = await Promise.all(
            FONT_MANIFEST.map(async (entry) => {
              const stat = await statFontById(entry.id);
              return {
                id: entry.id,
                url: `/test-fonts/${entry.id}`,
                contentType: entry.contentType,
                family: entry.family,
                script: entry.script,
                rawSfnt: entry.rawSfnt,
                sizeBytes: stat?.sizeBytes ?? null,
              };
            }),
          );
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ fonts }));
          return;
        }

        const match = /^\/test-fonts\/([^/]+)$/.exec(url.pathname);
        if (!match) return next();

        // Mirror the API package's `GET /api/fonts/coverage` contract so the
        // browser fixture can drive the coverage-aware lazy `GlyphFontManager`
        // (which decides, from a line's text alone, the minimal font subset to
        // fetch) without running the API server. `getFontCoverage` reads only
        // each font's sfnt directory + `cmap` table, so this never loads the
        // multi-megabyte binaries.
        if (match[1] === "coverage") {
          const coverage = await getFontCoverage();
          const ifNoneMatch = req.headers["if-none-match"];
          if (ifNoneMatch && ifNoneMatch === coverage.etag) {
            res.statusCode = 304;
            res.setHeader("ETag", coverage.etag);
            res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
            res.end();
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
          res.setHeader("ETag", coverage.etag);
          res.end(coverage.json);
          return;
        }

        const fontId = decodeURIComponent(match[1]);
        const loaded = await loadFontById(fontId);
        if (!loaded) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch && ifNoneMatch === loaded.etag) {
          res.statusCode = 304;
          res.setHeader("ETag", loaded.etag);
          res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
          res.end();
          return;
        }

        res.setHeader("Content-Type", loaded.entry.contentType);
        res.setHeader("Content-Length", String(loaded.buffer.byteLength));
        res.setHeader("Cache-Control", REVALIDATE_CACHE_CONTROL);
        res.setHeader("ETag", loaded.etag);
        res.end(loaded.buffer);
      });
    },
  };
}

/**
 * Mirrors the Next.js `/api/glyph-renderer/wasm` route (see
 * `src/app/api/glyph-renderer/wasm/route.ts`) as Vite dev-server middleware,
 * so the browser fixture can fetch and stream-instantiate the *built*
 * `@lyricova/glyph-renderer` WASM binary (`pkg/glyph_renderer_bg.wasm`)
 * without a Next.js server running and without copying/embedding the binary.
 *
 * The bytes are read straight from the already-built package via
 * `loadGlyphWasm()`; the fixture's `initGlyphRuntime({ wasmUrl: "/test-wasm" })`
 * hands the `application/wasm` response to wasm-bindgen, exactly like
 * production. Requires the package to be built first
 * (`npm run build -w @lyricova/glyph-renderer`).
 */
function testWasmDeliveryPlugin(): Plugin {
  return {
    name: "lyricova-test-wasm-delivery",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, "http://localhost");
        if (url.pathname !== "/test-wasm") return next();

        let loaded;
        try {
          loaded = await loadGlyphWasm();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: `Glyph renderer WASM unavailable: ${String(error)}`,
            }),
          );
          return;
        }

        const ifNoneMatch = req.headers["if-none-match"];
        if (ifNoneMatch && ifNoneMatch === loaded.etag) {
          // Mirror the Next.js route's conditional revalidation: an unchanged
          // binary revalidates to 304 instead of resending the bytes.
          res.statusCode = 304;
          res.setHeader("ETag", loaded.etag);
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.end();
          return;
        }

        res.setHeader("Content-Type", "application/wasm");
        res.setHeader("Content-Length", String(loaded.bytes.byteLength));
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("ETag", loaded.etag);
        res.end(loaded.bytes);
      });
    },
  };
}

export default defineConfig({
  root: path.resolve(import.meta.dirname, "fixture"),
  resolve: {
    alias: {
      // Mirrors the "@/*" -> "./src/*" mapping in tsconfig.json so the fixture
      // can import the real production glyph modules exactly as the app does.
      "@": path.resolve(import.meta.dirname, "../../src"),
    },
  },
  plugins: [react(), testFontDeliveryPlugin(), testWasmDeliveryPlugin()],
  // Pre-crawl BOTH fixture HTML entries at server start so Vite bundles every
  // dependency (React, the glyph modules, the WASM glue) up front. Without this
  // a cold start can discover a new dependency mid-session and force a full
  // page reload — which, under many parallel Playwright workers, occasionally
  // races the harness's `window.__glyph` install. Pre-optimizing removes that
  // reload race and keeps the suite non-flaky.
  optimizeDeps: {
    entries: ["index.html", "glyph.html"],
  },
  server: {
    port: 4173,
    strictPort: true,
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/glyphMain.tsx"],
    },
    fs: {
      // Allow serving the fixture's own package plus the sibling
      // `@lyricova/glyph-renderer` package (its `pkg/` WASM + `build/` JS).
      allow: [path.resolve(import.meta.dirname, "../../..")],
    },
  },
});
