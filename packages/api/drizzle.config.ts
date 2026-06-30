import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config. `schema.ts` is hand-authored from `lyricova-schema.sql`
 * (the DB has no live introspection target in CI), so we use it as the source of
 * truth for generating migrations.
 *
 * Baseline workflow (the DB already exists with all tables): run
 * `npx drizzle-kit generate` to emit the initial CREATE TABLE migration under
 * `./drizzle`, then mark it **already-applied** against the live DB (insert its
 * hash into `__drizzle_migrations`) instead of running it — this fills the
 * previously-missing migrations gap without recreating existing tables.
 */
export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DB_URI ?? "mysql://localhost/lyricova",
  },
});
