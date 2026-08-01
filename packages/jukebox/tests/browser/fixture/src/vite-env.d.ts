/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Test-only override for the base URL used by
   * `tests/browser/fixture/src/testFonts.ts` to resolve whitelisted font
   * IDs. Defaults to the `/test-fonts` middleware registered in
   * `tests/browser/vite.config.ts` when unset.
   */
  readonly VITE_FONT_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
