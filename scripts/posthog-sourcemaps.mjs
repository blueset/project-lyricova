import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = {
  api: {
    directory: resolve(root, "packages/api/dist"),
    releaseName: "lyricova-api",
  },
  blog: {
    directory: resolve(root, "packages/lyricova/.next"),
    releaseName: "lyricova-blog",
  },
  jukebox: {
    directory: resolve(root, "packages/jukebox/.next"),
    releaseName: "lyricova-jukebox",
  },
};

const selectedNames =
  process.argv.length > 2
    ? [...new Set(process.argv.slice(2))]
    : Object.keys(targets);

for (const name of selectedNames) {
  if (!(name in targets)) {
    console.error(
      `[posthog] Unknown target "${name}". Expected one of: ${Object.keys(targets).join(", ")}.`,
    );
    process.exit(1);
  }
}

const flag = process.env.POSTHOG_SOURCEMAPS;
const explicitlyEnabled = flag === "1" || flag === "true";
const explicitlyDisabled = flag === "0" || flag === "false";
const credentialsPresent = Boolean(
  process.env.POSTHOG_API_KEY && process.env.POSTHOG_ENV_ID,
);
const processSourcemaps =
  explicitlyEnabled ||
  (!explicitlyDisabled && credentialsPresent && process.env.CI === "true");

if (!processSourcemaps) {
  console.log(
    "[posthog] Skipping sourcemap processing (set POSTHOG_SOURCEMAPS=1 to enable it).",
  );
  process.exit(0);
}

const dryRun = /^(1|true|yes|on)$/i.test(process.env.POSTHOG_CLI_DRY_RUN ?? "");
if (!dryRun && !credentialsPresent) {
  console.error(
    "[posthog] POSTHOG_API_KEY and POSTHOG_ENV_ID are required for sourcemap upload.",
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const pkgJsonPath = require.resolve("@posthog/cli/package.json");
const { bin } = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
const cliPath = resolve(dirname(pkgJsonPath), bin["posthog-cli"]);

for (const name of selectedNames) {
  const target = targets[name];
  const args = [
    "sourcemap",
    "process",
    "--directory",
    target.directory,
    "--release-name",
    target.releaseName,
    "--delete-after",
  ];
  if (process.env.SOURCE_COMMIT) {
    args.push("--release-version", process.env.SOURCE_COMMIT);
  }

  console.log(`[posthog] Processing ${target.releaseName} sourcemaps.`);
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    env: {
      ...process.env,
      POSTHOG_CLI_API_KEY:
        process.env.POSTHOG_CLI_API_KEY ?? process.env.POSTHOG_API_KEY,
      POSTHOG_CLI_PROJECT_ID:
        process.env.POSTHOG_CLI_PROJECT_ID ?? process.env.POSTHOG_ENV_ID,
    },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
