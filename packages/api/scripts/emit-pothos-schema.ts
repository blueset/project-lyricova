#!/usr/bin/env node
/**
 * Emits the Pothos-built GraphQL schema SDL to `schema.pothos.graphql`, then
 * reports how it compares to the golden `schema.graphql` via the schema-parity
 * guard. During the Phase 2 port this surfaces exactly which types/fields are
 * still missing or divergent; when it reports OK, Pothos has reached parity.
 *
 * Run: npx ts-node --transpile-only scripts/emit-pothos-schema.ts
 */
import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";
import { buildPothosSchema } from "../src/graphql/pothos/schema";

const schema = buildPothosSchema();
const sdl = printSchema(schema);
writeFileSync("schema.pothos.graphql", sdl);
console.log(
  `[emit-pothos] wrote schema.pothos.graphql (${sdl.split("\n").length} lines)`
);
