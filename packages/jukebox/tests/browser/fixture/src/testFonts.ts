/**
 * Resolves a browser-fetchable URL for a whitelisted font ID inside the
 * isolated Vite browser fixture (`tests/browser`).
 *
 * By default this points at the `/test-fonts/:fontId` middleware registered
 * in `tests/browser/vite.config.ts`, which mirrors the API package's
 * `/api/fonts/:fontId` route without requiring the API server or copying font
 * binaries into the fixture.
 *
 * Specs that need to exercise the real proxied API route can override the
 * base URL with the `VITE_FONT_BASE_URL` env var, which Vite exposes to
 * client code as `import.meta.env.VITE_FONT_BASE_URL` (see
 * https://vitejs.dev/guide/env-and-mode.html). For example, running:
 *
 *   VITE_FONT_BASE_URL=http://127.0.0.1:8082/api/fonts npx playwright test
 *
 * makes `resolveTestFontUrl("mona-sans-latin-otf")` resolve to
 * `http://127.0.0.1:8082/api/fonts/mona-sans-latin-otf`, i.e. a real
 * Jukebox instance (with the API server running), instead of the fixture's
 * own middleware.
 *
 * The API manifest at `packages/api/src/fonts/manifest.ts` is the single
 * source of truth for which font IDs are whitelisted.
 */
export function resolveTestFontUrl(fontId: string): string {
  const base = import.meta.env.VITE_FONT_BASE_URL ?? "/test-fonts";
  return `${base.replace(/\/$/, "")}/${encodeURIComponent(fontId)}`;
}
