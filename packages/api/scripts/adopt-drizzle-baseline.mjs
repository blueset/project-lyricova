import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
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
  throw new Error("DB_URI is required to adopt the Drizzle baseline.");
}

const migrationsDir = path.resolve(packageRoot, "drizzle/migrations");
const journal = JSON.parse(
  await fs.readFile(path.join(migrationsDir, "meta/_journal.json"), "utf8"),
);
const baseline = journal.entries.find((entry) => entry.idx === 0);
if (!baseline) {
  throw new Error("Drizzle migration journal has no baseline entry.");
}

const baselineSql = await fs.readFile(
  path.join(migrationsDir, `${baseline.tag}.sql`),
  "utf8",
);
const baselineTables = [...baselineSql.matchAll(/CREATE TABLE `([^`]+)`/g)].map(
  (match) => match[1],
);
if (baselineTables.length === 0) {
  throw new Error("Could not identify any tables in the baseline migration.");
}

async function adoptBaseline() {
  const pool = mysql.createPool(dbUri);
  try {
    const [existingRows] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    );
    const existingTables = new Set(existingRows.map((row) => row.TABLE_NAME));
    if (existingTables.has("__drizzle_migrations")) {
      const [migrationRows] = await pool.query(
        "SELECT id FROM `__drizzle_migrations` LIMIT 1",
      );
      if (migrationRows.length > 0) return;
    }

    const existingBaselineTables = baselineTables.filter((table) =>
      existingTables.has(table),
    );

    if (existingBaselineTables.length === 0) {
      // A new database should apply 0000 normally.
      return;
    }

    const missingTables = baselineTables.filter(
      (table) => !existingTables.has(table),
    );
    if (missingTables.length > 0) {
      throw new Error(
        `Refusing to adopt an incomplete baseline; missing tables: ${missingTables.join(", ")}`,
      );
    }

    const modernAuthTables = [
      "AuthAccounts",
      "AuthSessions",
      "AuthVerifications",
      "UserPasskeys",
    ].filter((table) => existingTables.has(table));
    if (modernAuthTables.length > 0) {
      throw new Error(
        `Refusing to adopt baseline after a partial auth migration; found: ${modernAuthTables.join(", ")}`,
      );
    }

    const baselineHash = crypto
      .createHash("sha256")
      .update(baselineSql)
      .digest("hex");
    if (!existingTables.has("__drizzle_migrations")) {
      await pool.query(`
      CREATE TABLE \`__drizzle_migrations\` (
        \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
        \`hash\` text NOT NULL,
        \`created_at\` bigint DEFAULT NULL,
        PRIMARY KEY (\`id\`)
      )
    `);
    }
    await pool.query(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [baselineHash, baseline.when],
    );
    console.log(`Adopted existing schema as Drizzle baseline ${baseline.tag}.`);
  } finally {
    await pool.end();
  }
}

await adoptBaseline();
