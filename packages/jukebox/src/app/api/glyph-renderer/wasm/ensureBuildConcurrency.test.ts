import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

/**
 * Exercises the concurrency-safe, staleness-aware bootstrap
 * (`@lyricova/glyph-renderer/scripts/ensure-build.mjs`) that jukebox's
 * `pre{dev,build,typecheck,typecheck:native,test,test:browser,start}` hooks
 * delegate to. Rather than compiling real Rust/wasm, each case runs the real
 * `ensure-build.mjs` against throwaway fixture packages whose `build` script is
 * a fast fake that records how many times it ran - so we can assert that
 * concurrent callers never launch two builds, never see partial artifacts, and
 * invalidate correctly when output-affecting tool metadata changes.
 */

const require = createRequire(import.meta.url);
const glyphDir = path.dirname(
  require.resolve("@lyricova/glyph-renderer/package.json"),
);
const ensureScript = path.join(glyphDir, "scripts", "ensure-build.mjs");
const repoRoot = path.resolve(glyphDir, "..", "..");
const fixtureBase = path.join(
  repoRoot,
  "node_modules",
  ".cache",
  "glyph-ensure-tests",
);

type Fixture = {
  sandbox: string;
  root: string;
  workspaceRoot?: string;
};

// A fake `npm run build`: records an invocation, holds the build long enough
// for a concurrent caller to observe the lock, then writes complete artifacts.
const FAKE_BUILD = `
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
const prev = existsSync("build-count") ? Number(readFileSync("build-count", "utf8")) : 0;
writeFileSync("build-count", String(prev + 1));
await new Promise((r) => setTimeout(r, 700));
mkdirSync("build", { recursive: true });
mkdirSync("pkg", { recursive: true });
writeFileSync("build/index.js", "export {};\\n");
writeFileSync("build/index.d.ts", "export {};\\n");
writeFileSync("pkg/glyph_renderer.js", "export default async () => {};\\n");
writeFileSync("pkg/glyph_renderer_bg.wasm", Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]));
`;

const createdFixtures: Fixture[] = [];

function writeJson(file: string, value: unknown) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function basePackageJson() {
  return {
    name: "glyph-ensure-fixture",
    private: true,
    version: "0.1.0",
    description: "glyph ensure fixture",
    author: "fixture",
    scripts: {
      build: "node fake-build.mjs",
      "build:wasm": "wasm-pack build --target web --out-dir pkg",
      "build:ts": "tsc",
      lint: "eslint .",
    },
    devDependencies: {
      eslint: "^9.39.2",
      typescript: "^6.0.3",
      "wasm-pack": "^0.15.0",
    },
  };
}

function seedPackage(root: string) {
  mkdirSync(path.join(root, "src"), { recursive: true });
  mkdirSync(path.join(root, "ts"), { recursive: true });
  writeJson(path.join(root, "package.json"), basePackageJson());
  writeFileSync(path.join(root, "fake-build.mjs"), FAKE_BUILD);
  writeFileSync(path.join(root, "src", "lib.rs"), "fn main() {}\n");
  writeFileSync(path.join(root, "ts", "index.ts"), "export const x = 1;\n");
  writeFileSync(path.join(root, "Cargo.toml"), "[package]\nname = \"fx\"\n");
  writeFileSync(path.join(root, "tsconfig.json"), "{}\n");
}

function makeWorkspaceLock() {
  const pkg = basePackageJson();
  return {
    name: "fixture-root",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: "fixture-root",
        workspaces: ["packages/*"],
      },
      "packages/glyph-ensure-fixture": {
        name: pkg.name,
        version: pkg.version,
        devDependencies: pkg.devDependencies,
      },
      "node_modules/typescript": {
        version: "6.0.3",
        integrity: "sha512-typescript",
      },
      "node_modules/wasm-pack": {
        version: "0.15.0",
        integrity: "sha512-wasm-pack",
      },
    },
  };
}

type FixturePackageJson = ReturnType<typeof basePackageJson>;
type WorkspaceLock = ReturnType<typeof makeWorkspaceLock>;

function trackFixture(fixture: Fixture): Fixture {
  createdFixtures.push(fixture);
  return fixture;
}

function makeStandaloneFixture(): Fixture {
  const sandbox = path.join(fixtureBase, randomUUID());
  const root = path.join(sandbox, "fixture");
  seedPackage(root);
  return trackFixture({ sandbox, root });
}

function makeWorkspaceFixture(): Fixture {
  const sandbox = path.join(fixtureBase, randomUUID());
  const workspaceRoot = path.join(sandbox, "workspace");
  const root = path.join(workspaceRoot, "packages", "glyph-ensure-fixture");
  seedPackage(root);
  writeJson(path.join(workspaceRoot, "package.json"), {
    name: "fixture-root",
    private: true,
    packageManager: "npm@10.9.2",
    workspaces: ["packages/*"],
  });
  writeJson(path.join(workspaceRoot, "package-lock.json"), makeWorkspaceLock());
  return trackFixture({ sandbox, root, workspaceRoot });
}

function updateJson<T>(file: string, mutate: (value: T) => void) {
  const value = JSON.parse(readFileSync(file, "utf8")) as T;
  mutate(value);
  writeJson(file, value);
}

function buildCount(root: string): number {
  const p = path.join(root, "build-count");
  return existsSync(p) ? Number(readFileSync(p, "utf8")) : 0;
}

function wasmIsValid(root: string): boolean {
  const p = path.join(root, "pkg", "glyph_renderer_bg.wasm");
  if (!existsSync(p)) return false;
  const bytes = readFileSync(p);
  return (
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d
  );
}

function ensureSync(
  root: string,
  args: string[] = [],
): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [ensureScript, `--root=${root}`, ...args], {
    encoding: "utf8",
  });
}

function ensureAsync(
  root: string,
  args: string[] = [],
): Promise<{ status: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [ensureScript, `--root=${root}`, ...args]);
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (d) => (stderr += d));
    child.stdout.on("data", () => {});
    child.on("close", (status) => resolve({ status, stderr }));
  });
}

afterEach(() => {
  while (createdFixtures.length > 0) {
    const fixture = createdFixtures.pop();
    if (fixture) rmSync(fixture.sandbox, { recursive: true, force: true });
  }
});

describe("glyph-renderer ensure-build lifecycle", () => {
  it("builds when artifacts are missing", () => {
    const fixture = makeStandaloneFixture();
    const result = ensureSync(fixture.root);

    expect(result.status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);
    expect(wasmIsValid(fixture.root)).toBe(true);
  });

  it("is a no-op when artifacts are fresh", () => {
    const fixture = makeStandaloneFixture();

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);

    const again = ensureSync(fixture.root);
    expect(again.status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);
  });

  it("rebuilds when a tracked source input changes (not just mtime)", () => {
    const fixture = makeStandaloneFixture();

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);

    const libPath = path.join(fixture.root, "src", "lib.rs");
    writeFileSync(libPath, `${readFileSync(libPath, "utf8")}// changed\n`);

    const rebuilt = ensureSync(fixture.root);
    expect(rebuilt.status).toBe(0);
    expect(buildCount(fixture.root)).toBe(2);
  });

  it("rebuilds when tracked build-tool metadata changes", () => {
    const fixture = makeStandaloneFixture();

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);

    updateJson<FixturePackageJson>(path.join(fixture.root, "package.json"), (pkg) => {
      pkg.devDependencies.typescript = "^6.0.99";
    });

    const checked = ensureSync(fixture.root, ["--check"]);
    expect(checked.status).toBe(1);
    expect(checked.stderr).toMatch(/STALE/);

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(2);
  });

  it("rebuilds when the workspace lock subset for build tools changes", () => {
    const fixture = makeWorkspaceFixture();
    expect(fixture.workspaceRoot).toBeDefined();

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);

    updateJson<WorkspaceLock>(
      path.join(fixture.workspaceRoot!, "package-lock.json"),
      (lock) => {
        lock.packages["node_modules/typescript"].version = "6.0.99";
      },
    );

    const checked = ensureSync(fixture.root, ["--check"]);
    expect(checked.status).toBe(1);
    expect(checked.stderr).toMatch(/STALE/);

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(2);
  });

  it("ignores irrelevant metadata, docs, and non-workspace ancestor locks", () => {
    const fixture = makeStandaloneFixture();

    expect(ensureSync(fixture.root).status).toBe(0);

    writeFileSync(path.join(fixture.root, "ts", "index.spec.ts"), "test\n");
    writeFileSync(path.join(fixture.root, "README.md"), "docs\n");
    updateJson<FixturePackageJson>(path.join(fixture.root, "package.json"), (pkg) => {
      pkg.description = "docs-only metadata change";
      pkg.author = "still irrelevant";
      pkg.scripts.lint = "eslint . --cache";
      pkg.devDependencies.eslint = "^99.0.0";
    });
    writeJson(path.join(fixture.sandbox, "package.json"), {
      name: "not-a-workspace-root",
      private: true,
      workspaces: ["packages/*"],
    });
    writeJson(path.join(fixture.sandbox, "package-lock.json"), {
      ...makeWorkspaceLock(),
      packages: {
        ...makeWorkspaceLock().packages,
        "node_modules/typescript": {
          version: "6.9.9",
          integrity: "sha512-ignored",
        },
      },
    });

    expect(ensureSync(fixture.root, ["--check"]).status).toBe(0);
    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);
  });

  it("becomes fresh again after an exact revert of tracked metadata changes", () => {
    const fixture = makeWorkspaceFixture();
    expect(fixture.workspaceRoot).toBeDefined();

    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);

    const packagePath = path.join(fixture.root, "package.json");
    const lockPath = path.join(fixture.workspaceRoot!, "package-lock.json");
    const originalPackage = readFileSync(packagePath, "utf8");
    const originalLock = readFileSync(lockPath, "utf8");

    updateJson<FixturePackageJson>(packagePath, (pkg) => {
      pkg.devDependencies["wasm-pack"] = "^0.15.99";
      pkg.scripts["build:wasm"] =
        "wasm-pack build --target bundler --out-dir pkg";
    });
    updateJson<WorkspaceLock>(lockPath, (lock) => {
      lock.packages["packages/glyph-ensure-fixture"].devDependencies["wasm-pack"] =
        "^0.15.99";
      lock.packages["node_modules/wasm-pack"].version = "0.15.99";
    });

    expect(ensureSync(fixture.root, ["--check"]).status).toBe(1);

    writeFileSync(packagePath, originalPackage);
    writeFileSync(lockPath, originalLock);

    expect(ensureSync(fixture.root, ["--check"]).status).toBe(0);
    expect(ensureSync(fixture.root).status).toBe(0);
    expect(buildCount(fixture.root)).toBe(1);
  });

  describe("--check (verify only)", () => {
    it("fails with 'Missing' guidance when artifacts are absent", () => {
      const fixture = makeStandaloneFixture();
      const result = ensureSync(fixture.root, ["--check"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Missing built artifacts/);
      expect(buildCount(fixture.root)).toBe(0);
    });

    it("passes when artifacts are fresh", () => {
      const fixture = makeStandaloneFixture();

      expect(ensureSync(fixture.root).status).toBe(0);
      expect(ensureSync(fixture.root, ["--check"]).status).toBe(0);
    });

    it("fails with 'STALE' guidance after inputs change", () => {
      const fixture = makeStandaloneFixture();

      expect(ensureSync(fixture.root).status).toBe(0);
      const libPath = path.join(fixture.root, "src", "lib.rs");
      writeFileSync(libPath, `${readFileSync(libPath, "utf8")}// changed\n`);

      const result = ensureSync(fixture.root, ["--check"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/STALE/);
      expect(buildCount(fixture.root)).toBe(1);
    });
  });

  it(
    "serialises truly concurrent callers into a single build",
    async () => {
      const fixture = makeStandaloneFixture();

      const [a, b] = await Promise.all([
        ensureAsync(fixture.root),
        ensureAsync(fixture.root),
      ]);

      expect(a.status).toBe(0);
      expect(b.status).toBe(0);
      expect(buildCount(fixture.root)).toBe(1);
      expect(wasmIsValid(fixture.root)).toBe(true);

      const combined = a.stderr + b.stderr;
      const builds = combined.match(/Building .* artifacts/g) ?? [];
      expect(builds).toHaveLength(1);
      expect(combined).toMatch(/Waiting for a concurrent glyph-renderer build/);
    },
    30_000,
  );
});
