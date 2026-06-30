import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { DB_URI } from "../utils/secret";
import * as schema from "./schema";
import * as relations from "./relations";

/**
 * Drizzle client for the Lyricova MySQL database. Runs **alongside** the Sequelize
 * instance (`src/db.ts`) during the migration — both point at the same DB via the
 * same `DB_URI`. Domains move from Sequelize to Drizzle one at a time (Phase 4+).
 *
 * The pool connects lazily (first query), so importing this module never blocks
 * even when the DB is unreachable.
 */
export const pool = mysql.createPool(DB_URI);

export const fullSchema = { ...schema, ...relations };

export const db = drizzle(pool, {
  schema: fullSchema,
  mode: "default",
});

export { schema, relations };
