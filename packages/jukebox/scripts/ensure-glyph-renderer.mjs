// Jukebox lifecycle bootstrap for its `@lyricova/glyph-renderer` dependency.
//
// Jukebox imports the glyph renderer at build/dev/type-check/test time
// (paragraph layout / canvas code + type declarations) and serves its WASM
// binary at runtime (`/api/glyph-renderer/wasm`). Both come from the package's
// generated, git-ignored `build/` + `pkg/` trees, which do not exist on a clean
// checkout. Turbo's `^build` topology already builds the package before
// `turbo run build` reaches jukebox, but every other task consumes the
// generated files without that ordering guarantee, so each gets a hook:
//   - `predev`               (`npm run dev`)
//   - `prebuild`             (`npm run build`)
//   - `pretypecheck`         (`npm run typecheck`, tsc reads the `.d.ts`)
//   - `pretypecheck:native`  (`npm run typecheck:native`, tsgo)
//   - `pretest`              (`npm test`, vitest reads `pkg/` + `build/`)
//   - `pretest:browser`      (`npm run test:browser`, vite serves `pkg/` wasm)
//   - `prestart`             (runtime; `--check` verify-only, never builds)
// (`lint` gets no hook: eslint here is not type-aware and never resolves the
// built package, so bootstrapping it would only add needless rebuilds.)
//
// This wrapper resolves the sibling package via Node module resolution (so it
// works regardless of cwd or hoisting) and delegates to the package's own
// `scripts/ensure-build.mjs`, keeping a single source of truth for "which
// artifacts count", "how to build them", and the cross-process build lock +
// staleness fingerprint that make concurrent `pre*` hooks cooperate instead of
// launching duplicate wasm-pack builds. It never invokes Turbo, so it cannot
// recurse back into this hook.
//
// Pass `--check` (used by `prestart`) to verify prebuilt artifacts exist and
// are up-to-date without attempting a build - appropriate for runtime
// containers that ship prebuilt artifacts and have no Rust toolchain.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);

/** Absolute path to the glyph-renderer package's bootstrap script. */
export function resolveGlyphEnsureScript() {
  const pkgJsonPath = require.resolve("@lyricova/glyph-renderer/package.json");
  return path.join(path.dirname(pkgJsonPath), "scripts", "ensure-build.mjs");
}

function run() {
  const forwarded = process.argv.slice(2);

  let ensureScript;
  try {
    ensureScript = resolveGlyphEnsureScript();
  } catch (error) {
    console.error(
      `[jukebox] Could not resolve @lyricova/glyph-renderer: ${String(error)}`,
    );
    process.exit(1);
  }

  if (!existsSync(ensureScript)) {
    console.error(
      `[jukebox] glyph-renderer bootstrap script not found at ${ensureScript}.`,
    );
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [ensureScript, ...forwarded], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(`[jukebox] Failed to run glyph-renderer bootstrap:`, result.error);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const invokedDirectly =
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (invokedDirectly) run();
