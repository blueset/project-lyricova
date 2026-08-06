/**
 * Ambient typing so the glyph browser specs can call the imperative
 * `window.__glyph` test API (installed by the fixture harness in
 * `tests/browser/fixture/src/glyphMain.tsx`) with full type information.
 */
declare global {
  interface Window {
    __glyph: import("../fixture/src/glyphMain").GlyphApi;
  }
}

export {};
