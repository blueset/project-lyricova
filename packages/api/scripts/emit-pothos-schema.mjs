#!/usr/bin/env node
/**
 * Emits the Pothos schema SDL to `schema.pothos.graphql` for parity-checking.
 *
 * Runs against the COMPILED dist (not ts-node) because the Sequelize models
 * still carry TypeGraphQL decorators during the migration, which need the
 * `emitDecoratorMetadata` that tsc produces but ts-node --transpile-only does
 * not. `npm run pothos:emit` builds dist first.
 */
import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { printSchema } from "graphql";
import { buildPothosSchema } from "../dist/graphql/pothos/schema.js";

const sdl = printSchema(buildPothosSchema());
writeFileSync("schema.pothos.graphql", sdl);
console.log(
  `[emit-pothos] wrote schema.pothos.graphql (${sdl.split("\n").length} lines)`
);
process.exit(0);
