// Idempotent, concurrency-safe bootstrap for the `@lyricova/glyph-renderer`
// build artifacts.
//
// The package ships two generated, git-ignored trees that consumers (notably
// `@lyricova/jukebox`) import at build-, dev-, test-, and run-time:
//   - `pkg/`   - the wasm-pack output (WASM binary + wasm-bindgen JS/d.ts).
//   - `build/` - the `tsc` output (the public `index.js`/`index.d.ts` wrapper).
//
// On a clean checkout neither exists, and many tasks (`lint`, `typecheck`,
// `test`, `next dev`/`build`/`start`, ...) run *concurrently* under Turbo while
// this package's own task may still be building. This script guarantees the
// artifacts are present AND up-to-date before a consumer reads them, and that
// two simultaneous callers never launch two wasm-pack builds or observe a
// half-written tree:
//
//   - Freshness is a *content fingerprint* of the real build inputs (Rust
//     sources, `ts/` sources excluding tests, Cargo/tsconfig manifests,
//     build-tool package metadata, and the relevant extracted package-lock
//     subset), stored at `build/.glyph-inputs.hash`. Existence-only checks
//     would happily serve stale artifacts after a source/tool edit; the
//     fingerprint rebuilds when any output-affecting input changed.
//   - A cross-process lock (`.glyph-build.lock` dir, atomic `mkdir`) serialises
//     builds: the winner builds while every other caller waits for it, then
//     reuses the fresh result. Waiters never read the tree while the lock is
//     held (a build may be mid-write). A dead lock owner (or a very old lock)
//     is stolen so a crashed build can't wedge the repo.
//
// Modes (run directly as a script):
//   (default)            build if missing/stale (with the lock); no-op if fresh.
//   --check              verify only, never build; exit non-zero with distinct
//                        "missing" vs "stale" guidance (for runtimes that ship
//                        prebuilt artifacts and have no Rust toolchain).
//   --write-fingerprint  (re)write `build/.glyph-inputs.hash` for the current
//                        inputs; wired as the package `postbuild` hook so a
//                        direct `npm run build` also records freshness.
//   --root=<dir>         operate on <dir> instead of this package (tests).
//
// Importing this module is side-effect free (it exports helpers for tests);
// it only acts when executed directly.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DEFAULT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Artifacts that must exist for the package to be importable by a consumer:
 * the `tsc` wrapper (`build/`) plus the wasm-pack bindings + binary (`pkg/`).
 */
export const REQUIRED_ARTIFACTS = [
  "build/index.js",
  "build/index.d.ts",
  "pkg/glyph_renderer.js",
  "pkg/glyph_renderer_bg.wasm",
];

/** Sidecar recording the input fingerprint the current artifacts were built from. */
const FINGERPRINT_FILE = "build/.glyph-inputs.hash";
/** Cross-process build lock (a directory - `mkdir` is atomic). */
const LOCK_DIR = ".glyph-build.lock";
/** `package.json` scripts whose text, if changed, invalidates the artifacts. */
const BUILD_SCRIPT_KEYS = ["build", "build:wasm", "build:ts"];
/** Tooling package metadata that affects `pkg/`/`build/` output. */
const BUILD_TOOL_PACKAGE_KEYS = ["typescript", "wasm-pack"];
/** Dependency sections that may carry build-tool versions. */
const PACKAGE_DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];
/** Package manager metadata relevant to workspace-root lock resolution. */
const WORKSPACE_METADATA_KEYS = ["packageManager"];
const LOCKFILE_NAME = "package-lock.json";

const WAIT_POLL_MS = 250;
const MAX_WAIT_MS = 20 * 60_000;
const STALE_LOCK_MS = 20 * 60_000;

const BUILD_HINT =
  "Build it with `npm run build -w @lyricova/glyph-renderer` (needs a stable " +
  "Rust toolchain + the wasm32-unknown-unknown target), or the repo-root " +
  "`npm run build`.";

function sleepSync(ms) {
  // Synchronous sleep without pulling in async - this script runs as a blocking
  // `pre*` hook, so callers expect it to complete before returning.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listDirFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const ent of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!ent.isFile()) continue;
    const parent = ent.parentPath ?? ent.path;
    const full = path.join(parent, ent.name);
    if (filter(full)) out.push(full);
  }
  return out;
}

/**
 * Production build inputs. Deliberately excludes tests/docs (Rust `tests/**`,
 * `ts/*.spec.ts`/`*.test.ts`, `README.md`): changing those does not change the
 * `pkg/`/`build/` a consumer imports, so they must not force a rebuild.
 */
function inputFiles(root) {
  const files = [
    ...listDirFiles(path.join(root, "src"), (f) => f.endsWith(".rs")),
    ...listDirFiles(
      path.join(root, "ts"),
      (f) => f.endsWith(".ts") && !/\.(spec|test)\.ts$/.test(f),
    ),
  ];
  for (const rel of ["Cargo.toml", "Cargo.lock", "tsconfig.json"]) {
    const p = path.join(root, rel);
    if (existsSync(p)) files.push(p);
  }
  return files.sort();
}

function toPortablePath(p) {
  return p.split(path.sep).join("/");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item !== undefined) out[key] = canonicalize(item);
    }
    return out;
  }
  return value;
}

function stableSerialize(value) {
  return JSON.stringify(canonicalize(value));
}

function pickKeys(value, keys) {
  const picked = {};
  if (!value || typeof value !== "object") return picked;
  for (const key of keys) {
    if (key in value) picked[key] = value[key];
  }
  return picked;
}

function readJsonOrRaw(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
  try {
    return { kind: "json", value: JSON.parse(text) };
  } catch {
    return { kind: "raw", value: text };
  }
}

function buildPackageMetadataSignature(root) {
  const loaded = readJsonOrRaw(path.join(root, "package.json"));
  if (!loaded) return "";
  if (loaded.kind === "raw") return stableSerialize({ package: { raw: loaded.value } });

  const pkg = loaded.value;
  const toolDeps = {};
  for (const field of PACKAGE_DEPENDENCY_FIELDS) {
    const picked = pickKeys(pkg[field], BUILD_TOOL_PACKAGE_KEYS);
    if (Object.keys(picked).length > 0) toolDeps[field] = picked;
  }
  return stableSerialize({
    package: {
      scripts: pickKeys(pkg.scripts, BUILD_SCRIPT_KEYS),
      toolDependencies: toolDeps,
    },
  });
}

function workspacePatterns(pkg) {
  if (Array.isArray(pkg?.workspaces)) return pkg.workspaces;
  if (Array.isArray(pkg?.workspaces?.packages)) return pkg.workspaces.packages;
  return [];
}

function findRelevantPackageLock(root) {
  const localLock = path.join(root, LOCKFILE_NAME);
  if (existsSync(localLock)) {
    return { lockPath: localLock, packageKey: "", workspaceRoot: root };
  }

  let dir = path.dirname(root);
  for (;;) {
    const manifest = readJsonOrRaw(path.join(dir, "package.json"));
    if (manifest?.kind === "json" && existsSync(path.join(dir, LOCKFILE_NAME))) {
      const rel = toPortablePath(path.relative(dir, root));
      if (
        rel &&
        workspacePatterns(manifest.value).some(
          (pattern) =>
            typeof pattern === "string" &&
            !pattern.startsWith("!") &&
            path.posix.matchesGlob(rel, pattern.replaceAll("\\", "/")),
        )
      ) {
        return {
          lockPath: path.join(dir, LOCKFILE_NAME),
          packageKey: rel,
          workspaceRoot: dir,
        };
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function buildLockSignature(root) {
  const context = findRelevantPackageLock(root);
  if (!context) return "";

  const loaded = readJsonOrRaw(context.lockPath);
  if (!loaded) return "";
  if (loaded.kind === "raw") {
    return stableSerialize({
      lock: {
        context: context.packageKey || ".",
        raw: loaded.value,
      },
    });
  }

  const manifest = readJsonOrRaw(path.join(context.workspaceRoot, "package.json"));
  const workspaceMetadata =
    manifest?.kind === "json"
      ? pickKeys(manifest.value, WORKSPACE_METADATA_KEYS)
      : undefined;
  const packages = loaded.value.packages ?? {};
  const selectedPackages = {};
  for (const key of [context.packageKey, ...BUILD_TOOL_PACKAGE_KEYS.map((name) => `node_modules/${name}`)]) {
    if (key in packages) selectedPackages[key || ""] = packages[key];
  }

  return stableSerialize({
    lock: {
      context: context.packageKey || ".",
      lockfileVersion: loaded.value.lockfileVersion,
      requires: loaded.value.requires,
      workspace: workspaceMetadata,
      packages: selectedPackages,
    },
  });
}

/** Deterministic content fingerprint of the build inputs (stable across clones). */
export function computeFingerprint(root = DEFAULT_ROOT) {
  const hash = createHash("sha256");
  for (const file of inputFiles(root)) {
    const rel = toPortablePath(path.relative(root, file));
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  hash.update("package\0");
  hash.update(buildPackageMetadataSignature(root));
  hash.update("\0lock\0");
  hash.update(buildLockSignature(root));
  return hash.digest("hex");
}

function readStoredFingerprint(root) {
  try {
    return readFileSync(path.join(root, FINGERPRINT_FILE), "utf8").trim();
  } catch {
    return undefined;
  }
}

/** Records the current input fingerprint next to the built artifacts. */
export function writeFingerprint(root = DEFAULT_ROOT) {
  const p = path.join(root, FINGERPRINT_FILE);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, `${computeFingerprint(root)}\n`);
}

/** Returns the subset of {@link REQUIRED_ARTIFACTS} missing under `root`. */
export function missingArtifacts(root = DEFAULT_ROOT) {
  return REQUIRED_ARTIFACTS.filter((rel) => !existsSync(path.join(root, rel)));
}

/** `"missing"` (an artifact is absent) | `"stale"` (inputs changed) | `"fresh"`. */
export function artifactState(root = DEFAULT_ROOT) {
  if (missingArtifacts(root).length > 0) return "missing";
  const stored = readStoredFingerprint(root);
  if (!stored) return "stale";
  return stored === computeFingerprint(root) ? "fresh" : "stale";
}

function lockPath(root) {
  return path.join(root, LOCK_DIR);
}

function tryAcquireLock(root) {
  try {
    mkdirSync(lockPath(root));
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
  try {
    writeFileSync(
      path.join(lockPath(root), "owner"),
      JSON.stringify({ pid: process.pid, at: Date.now() }),
    );
  } catch {
    // Non-fatal: the owner file is only used for liveness diagnostics.
  }
  return true;
}

function releaseLock(root) {
  try {
    rmSync(lockPath(root), { recursive: true, force: true });
  } catch {
    // Already gone.
  }
}

function lockExists(root) {
  return existsSync(lockPath(root));
}

function lockAgeMs(root) {
  try {
    return Date.now() - statSync(lockPath(root)).mtimeMs;
  } catch {
    return Infinity;
  }
}

function lockOwnerAlive(root) {
  let info;
  try {
    info = JSON.parse(readFileSync(path.join(lockPath(root), "owner"), "utf8"));
  } catch {
    // Lock just created but owner file not written yet - assume alive.
    return true;
  }
  if (typeof info.pid !== "number") return true;
  try {
    process.kill(info.pid, 0);
    return true;
  } catch (error) {
    // ESRCH => no such process (dead). EPERM => alive but not ours.
    return error.code === "EPERM";
  }
}

function runBuild(root) {
  // Prefer the npm that invoked us (portable across shims and Windows),
  // falling back to a bare `npm` on PATH.
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : "npm";
  const args = npmExecPath ? [npmExecPath, "run", "build"] : ["run", "build"];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/**
 * Ensures fresh built artifacts exist. In `check` mode it verifies only and
 * exits non-zero (with distinct missing/stale guidance); otherwise it builds
 * when needed under a cross-process lock so concurrent callers cooperate.
 */
export function ensureBuild({ check = false, root = DEFAULT_ROOT } = {}) {
  const state = artifactState(root);

  // Fast path: complete + up-to-date and no build in progress.
  if (state === "fresh" && !lockExists(root)) return;

  if (check) {
    if (state === "fresh") return;
    if (state === "missing") {
      console.error(
        `[glyph-renderer] Missing built artifacts: ${missingArtifacts(root).join(
          ", ",
        )}.\nThis runtime expects prebuilt artifacts. ${BUILD_HINT}`,
      );
    } else {
      console.error(
        "[glyph-renderer] Built artifacts are STALE - the Rust/TS sources, " +
          "build metadata, or tool locks changed since `pkg/`+`build/` were " +
          "generated. " +
          `Rebuild them: ${BUILD_HINT}`,
      );
    }
    process.exit(1);
  }

  const deadline = Date.now() + MAX_WAIT_MS;
  let announcedWait = false;

  for (;;) {
    // Safe to reuse only when no builder holds the lock (its tree may be
    // mid-write); a fresh, complete tree is never rebuilt by a correct builder.
    if (!lockExists(root) && artifactState(root) === "fresh") {
      if (announcedWait) {
        console.error(
          "[glyph-renderer] Reusing artifacts built by a concurrent process.",
        );
      }
      return;
    }

    if (tryAcquireLock(root)) {
      try {
        const current = artifactState(root);
        if (current === "fresh") {
          if (announcedWait) {
            console.error(
              "[glyph-renderer] Reusing artifacts built by a concurrent process.",
            );
          }
          return;
        }
        console.error(
          `[glyph-renderer] Building ${current} artifacts (wasm-pack + tsc)...`,
        );
        const status = runBuild(root);
        if (status !== 0) process.exit(status);
        // The package `postbuild` hook records the fingerprint; write it here
        // too so bootstrapping still works if that hook is absent.
        if (artifactState(root) !== "fresh") writeFingerprint(root);
        if (artifactState(root) !== "fresh") {
          const missing = missingArtifacts(root);
          console.error(
            "[glyph-renderer] Build finished but artifacts are still not " +
              `up-to-date: ${missing.length ? missing.join(", ") : "fingerprint mismatch"}.`,
          );
          process.exit(1);
        }
        return;
      } finally {
        releaseLock(root);
      }
    }

    // Another process holds the lock. Steal it if the owner died or it is
    // implausibly old, otherwise wait.
    if (!lockOwnerAlive(root) || lockAgeMs(root) > STALE_LOCK_MS) {
      releaseLock(root);
      continue;
    }
    if (Date.now() > deadline) {
      console.error(
        "[glyph-renderer] Timed out waiting for a concurrent glyph-renderer " +
          "build to finish.",
      );
      process.exit(1);
    }
    if (!announcedWait) {
      console.error(
        "[glyph-renderer] Waiting for a concurrent glyph-renderer build to finish...",
      );
      announcedWait = true;
    }
    sleepSync(WAIT_POLL_MS);
  }
}

function parseRoot(args) {
  const flag = args.find((a) => a.startsWith("--root="));
  if (flag) return path.resolve(flag.slice("--root=".length));
  if (process.env.GLYPH_ENSURE_ROOT) {
    return path.resolve(process.env.GLYPH_ENSURE_ROOT);
  }
  return DEFAULT_ROOT;
}

const invokedDirectly =
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const root = parseRoot(args);
  if (args.includes("--write-fingerprint")) {
    writeFingerprint(root);
  } else {
    ensureBuild({ check: args.includes("--check"), root });
  }
}
