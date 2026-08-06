import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { resolveGlyphWasmPath } from "./wasmFile";

/**
 * Guards the clean-checkout artifact lifecycle wired up for
 * `@lyricova/glyph-renderer`: jukebox's `pre{dev,build,start}` hooks delegate
 * to the package's own bootstrap so the built `build/` + `pkg/` trees exist
 * before jukebox imports them (build/dev) or the WASM byte route serves them
 * (runtime). These tests assert the delegation resolves and that the
 * artifacts the runtime route depends on are actually present once built.
 */

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const jukeboxEnsureScript = path.resolve(
  here,
  "../../../../../scripts/ensure-glyph-renderer.mjs",
);

function glyphEnsureScript(): string {
  const pkgJson = require.resolve("@lyricova/glyph-renderer/package.json");
  return path.join(path.dirname(pkgJson), "scripts", "ensure-build.mjs");
}

describe("glyph-renderer artifact bootstrap", () => {
  it("ships the jukebox bootstrap wrapper", () => {
    expect(existsSync(jukeboxEnsureScript)).toBe(true);
  });

  it("resolves the sibling package's bootstrap script", () => {
    const script = glyphEnsureScript();
    expect(script).toMatch(/glyph-renderer[/\\]scripts[/\\]ensure-build\.mjs$/);
    expect(existsSync(script)).toBe(true);
  });

  it("verifies built artifacts via the jukebox --check hook (prestart path)", () => {
    const result = spawnSync(
      process.execPath,
      [jukeboxEnsureScript, "--check"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
  });

  it("covers the exact WASM the runtime route serves", () => {
    // The --check contract must include the binary the route resolves,
    // otherwise a passing check could still leave the route broken.
    expect(existsSync(resolveGlyphWasmPath())).toBe(true);
  });
});
