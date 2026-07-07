import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Upload PostHog sourcemaps during CI builds by default; opt in locally with
// POSTHOG_SOURCEMAPS=1, or force off with POSTHOG_SOURCEMAPS=0. This mirrors the
// gating used by the jukebox/blog next.config.mjs files.
const flag = process.env.POSTHOG_SOURCEMAPS;
const uploadSourcemaps =
  flag === "1" || flag === "true"
    ? true
    : flag === "0" || flag === "false"
      ? false
      : process.env.CI === "true";

if (!uploadSourcemaps) {
  console.log(
    "[posthog] Skipping sourcemap upload (set POSTHOG_SOURCEMAPS=1 to upload locally).",
  );
  process.exit(0);
}

const require = createRequire(import.meta.url);
const pkgJsonPath = require.resolve("@posthog/cli/package.json");
const { bin } = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
const cliPath = resolve(dirname(pkgJsonPath), bin["posthog-cli"]);

const run = (args) => {
  const res = spawnSync(process.execPath, [cliPath, ...args], {
    stdio: "inherit",
  });
  if (res.error) {
    console.error(res.error.message);
    process.exit(1);
  }
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
};

run(["sourcemap", "inject", "--directory", "dist"]);
run(["sourcemap", "upload", "--directory", "dist"]);
