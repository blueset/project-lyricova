#!/usr/bin/env node
/**
 * GraphQL schema parity guard.
 *
 * Normalizes two GraphQL SDL files (parse -> lexicographic sort -> print, which
 * also strips generator header comments and canonicalizes field/type ordering)
 * and reports whether they are shape-compatible.
 *
 * This is the primary regression guard for the Sequelize/TypeGraphQL ->
 * Drizzle/Pothos migration: the emitted schema must stay identical at every
 * step. It is intentionally agnostic to *how* each schema was produced, so the
 * same check works for the current type-graphql output and the future Pothos
 * output.
 *
 * Usage:
 *   node scripts/schema-parity.mjs [baseline.graphql] [current.graphql]
 *
 * Defaults: baseline = schema.graphql.golden, current = schema.graphql
 * Exit code 0 = identical (shape-compatible), 1 = drift, 2 = usage/IO error.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildSchema, lexicographicSortSchema, printSchema } from "graphql";

const baselinePath = resolve(process.argv[2] ?? "schema.graphql.golden");
const currentPath = resolve(process.argv[3] ?? "schema.graphql");

function normalize(path) {
  let sdl;
  try {
    sdl = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`[schema-parity] cannot read ${path}: ${err.message}`);
    process.exit(2);
  }
  try {
    // assumeValid: tolerate custom scalars / directives that lack definitions.
    const schema = buildSchema(sdl, { assumeValidSDL: true });
    return printSchema(lexicographicSortSchema(schema)).trim() + "\n";
  } catch (err) {
    console.error(`[schema-parity] cannot parse ${path}: ${err.message}`);
    process.exit(2);
  }
}

const baseline = normalize(baselinePath);
const current = normalize(currentPath);

if (baseline === current) {
  console.log("[schema-parity] OK — schema is shape-compatible with the baseline.");
  process.exit(0);
}

// Render a readable unified diff via git (no extra deps).
const dir = mkdtempSync(join(tmpdir(), "schema-parity-"));
const a = join(dir, "baseline.graphql");
const b = join(dir, "current.graphql");
writeFileSync(a, baseline);
writeFileSync(b, current);

const diff = spawnSync(
  "git",
  ["--no-pager", "diff", "--no-index", "--no-color", "--", a, b],
  { encoding: "utf8" }
);

console.error("[schema-parity] DRIFT DETECTED — emitted schema differs from baseline:\n");
console.error(diff.stdout || diff.stderr || "(unable to render diff)");
console.error(
  `\n[schema-parity] baseline: ${baselinePath}\n[schema-parity] current:  ${currentPath}`
);
process.exit(1);
