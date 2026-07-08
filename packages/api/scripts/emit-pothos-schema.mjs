#!/usr/bin/env node
/**
 * Emits the Pothos schema SDL for parity-checking / codegen.
 *
 * Output path is the first CLI arg (default `schema.pothos.graphql`):
 *   node scripts/emit-pothos-schema.mjs                 # parity artifact
 *   node scripts/emit-pothos-schema.mjs schema.graphql  # committed codegen source (watch mode)
 *
 * Runs against the COMPILED `dist/` (not ts-node) because building the schema
 * needs the tsc output; `npm run pothos:emit` runs `tsc` first. Loading the
 * builder creates a (lazy, unconnected) mysql2 pool, so a *parseable* `DB_URI`
 * is required but a reachable database is not — hence the explicit
 * `process.exit(0)` to drop the idle pool handle.
 */
import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";
import { buildPothosSchema } from "../dist/graphql/pothos/schema.js";

const outPath = process.argv[2] ?? "schema.pothos.graphql";
const sdl = printSchema(buildPothosSchema());
writeFileSync(outPath, sdl);
console.log(`[emit-pothos] wrote ${outPath} (${sdl.split("\n").length} lines)`);
process.exit(0);
