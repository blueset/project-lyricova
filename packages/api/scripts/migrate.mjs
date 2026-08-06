import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
loadEnv({ path: path.resolve(packageRoot, "../../.env"), quiet: true });
loadEnv({
  path: path.resolve(packageRoot, ".env"),
  override: true,
  quiet: true,
});

const dbUri = process.env.DB_URI;
if (!dbUri) {
  throw new Error("DB_URI is required to run database migrations.");
}

function printError(error, label = "Migration failed") {
  if (typeof error !== "object" || error === null) {
    console.error(`${label}:`, error);
    return;
  }

  console.error(`${label}:`, error.stack ?? error.message ?? error);

  for (const key of [
    "query",
    "code",
    "errno",
    "sqlState",
    "sqlMessage",
    "sql",
  ]) {
    if (key in error && error[key] != null) {
      console.error(`  ${key}:`, error[key]);
    }
  }

  if ("cause" in error && error.cause != null) {
    printError(error.cause, "Caused by");
  }
}

const pool = mysql.createPool(dbUri);
const db = drizzle(pool, { logger: true });

try {
  await migrate(db, {
    migrationsFolder: path.resolve(packageRoot, "drizzle/migrations"),
  });
} catch (error) {
  printError(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
