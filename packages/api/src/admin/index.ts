#!/usr/bin/env node
import { pool } from "../drizzle/client.js";
import { defaultIo, runCli } from "./cli.js";

/**
 * Compiled entry point for the `lyricova-admin` bin (see package.json
 * "bin"). This is a trusted local database tool: it connects directly to
 * MySQL using the same environment configuration as the API server and must
 * only be run by operators with direct database access.
 */
async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2), defaultIo());
  await pool.end();
  process.exitCode = exitCode;
}

void main();
