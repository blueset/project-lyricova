import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { DB_URI } from "../utils/secret";
import * as schema from "./schema";
import * as relations from "./relations";

/**
 * Drizzle client for the Lyricova MySQL database — the single data-access layer
 * for the API.
 *
 * The pool connects lazily (first query), so importing this module never blocks
 * even when the DB is unreachable (e.g. during `pothos:emit`).
 */
export const pool = mysql.createPool(DB_URI);

export const fullSchema = { ...schema, ...relations };

export const db = drizzle(pool, {
  schema: fullSchema,
  mode: "default",
});

export { schema, relations };
