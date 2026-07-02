# Development & Build Guide

This page describes the development and build flow **after** the migration off
Sequelize + TypeGraphQL + Apollo `gql` tags, and the extra steps that flow now
requires. It focuses on the four things that changed the day-to-day workflow:

- **code changes** (TypeScript / React),
- **database schema changes** (now Drizzle + drizzle-kit),
- **GraphQL changes** (Pothos server schema + codegen-typed client documents),
- running the repo through **Turborepo** (`npm run dev` / `npm run build` at the
  root).

---

## 1. What changed

| Area | Before | Now |
| --- | --- | --- |
| ORM | Sequelize (`sequelize.sync()`) | **Drizzle ORM** — schema in `packages/api/src/drizzle/schema.ts`, migrations via **drizzle-kit** |
| GraphQL server | TypeGraphQL decorators on models | **Pothos** builder in `packages/api/src/graphql/pothos/` |
| GraphQL client | Apollo `` gql`…` `` tagged templates (untyped) | **graphql-codegen client preset** — `` graphql(`…`) `` from `@lyricova/components/gql` (fully typed) |
| Schema source of truth | (implicit, from decorators) | committed **`packages/api/schema.graphql`**, guarded by **`schema.graphql.golden`** parity |

The practical consequence: a few artifacts are now **generated** (and
git-ignored), so some changes require a regeneration step before types line up.

---

## 2. Repository / build topology

npm workspaces (`packages/*`) orchestrated by **Turborepo**. The root only
exposes two scripts:

```jsonc
// package.json (root)
"build": "turbo run build",
"dev":   "turbo run dev"
```

### Package graph (`turbo run build`, topological via `^build`)

```
lyrics-kit ─┐
            ├─▶ @lyricova/api ─┐
            │                  ├─▶ @lyricova/jukebox   (Next.js, port 8082)
@lyricova/components ──────────┴─▶ @lyricova/blog      (Next.js, port 8081)
   (runs codegen in its build)
```

- `lyrics-kit` and `@lyricova/components` have no workspace deps → build first.
- `@lyricova/api` builds after `lyrics-kit`.
- `@lyricova/jukebox` and `@lyricova/blog` (the `packages/lyricova` app) build
  after `api` + `components`.

> **Why the ordering matters:** `@lyricova/components`'s `build` runs
> **codegen**, which produces the git-ignored `packages/components/src/gql/**`
> typed-document output. Because the two apps depend on `components`, Turbo
> guarantees codegen has run before they build. `components` codegen reads the
> **committed** `packages/api/schema.graphql` file (not `api`'s build output),
> which is why it can run in parallel with `api`.

### What each package's `build` / `dev` does

| Package | `build` | `dev` |
| --- | --- | --- |
| `@lyricova/api` | `build:ts` (tsc) → `lint` → `posthog` sourcemaps | `nodemon dist/server.js` + `tsc -w` |
| `@lyricova/components` | **`codegen`** → `tsc` → `tsc-alias` | `codegen:watch` + `tsc -w` + `tsc-alias -w` |
| `@lyricova/jukebox` | `next build` | `next dev` (PORT 8082) |
| `@lyricova/blog` (`packages/lyricova`) | `next build` | `next dev` (PORT 8081) |

---

## 3. Running the root scripts

### `npm run build`

`turbo run build` respects the topology above, so a clean build "just works":
codegen runs inside the `components` build before the apps compile.

### `npm run dev`

`turbo run dev` starts **all** `dev` scripts in parallel (persistent, uncached).
Cold-start caveats on a **fresh checkout / clean tree**:

1. **Generated GraphQL types don't exist yet.** The apps import
   `@lyricova/components/gql`, which is git-ignored and only created by codegen.
   `components`' `codegen:watch` generates it within a second or two of startup,
   but `next dev` may print transient "cannot find module" errors until it does.
   To avoid the flap, prime it once before the first `npm run dev`:

   ```bash
   npm run codegen -w @lyricova/components
   ```

2. **`api` serves from `dist/`.** `api`'s `dev` runs `nodemon dist/server.js`
   alongside `tsc -w`; on a clean tree `dist/` is produced by the watcher, so the
   node process may restart a couple of times before it comes up.

3. **`api` may fail to start with `Cannot find module 'drizzle-orm'`.** This is
   the same install/hoisting issue described in
   [§5.3](#53-graphql--api-schema-changes-resolver--type--field) — it affects the
   server exactly as it affects `pothos:emit`. Until the install is repaired, run
   the node process with `NODE_PATH=packages/api/node_modules` (see §5.3 for the
   workaround and the durable fix).

Ports: **jukebox → 8082**, **blog/lyricova → 8081**. `api` needs a working
`.env` (database connection etc.).

---

## 4. Generated & git-ignored artifacts

Know these so you don't hunt for "missing" files or commit generated output:

| Path | Produced by | Committed? |
| --- | --- | --- |
| `packages/components/src/gql/**` | `npm run codegen -w @lyricova/components` | **No** (git-ignored) |
| `packages/api/schema.pothos.graphql` | `npm run pothos:emit` | **No** (transient emit) |
| `packages/api/dist/**` | `tsc` | **No** |
| `packages/api/schema.graphql` | *hand-updated* from the Pothos emit | **Yes** — codegen source of truth |
| `packages/api/schema.graphql.golden` | *hand-updated* parity baseline | **Yes** |
| `packages/api/drizzle/migrations/**` | `npm run db:generate` | **Yes** |

---

## 5. Workflows

### 5.1 Ordinary code changes (TS / React)

No new steps. Edit, and let `tsc -w` / `next dev` recompile. Validate with the
per-package commands in [§6](#6-verification).

### 5.2 GraphQL — **client** documents (queries/mutations/subscriptions)

Anywhere in `components`, `jukebox`, or `lyricova`:

1. Write the operation with the typed tag, **not** Apollo's `gql`:

   ```ts
   import { graphql } from "@lyricova/components/gql";

   const MY_QUERY = graphql(`
     query MyThing($id: Int!) {    # ← every operation MUST be named
       musicFile(id: $id) { id trackName }
     }
   `);
   ```

2. **Name every operation** — codegen silently skips anonymous ones.
3. **Don't** pass explicit generics to Apollo hooks
   (`useQuery(MY_QUERY)`, not `useQuery<…>(MY_QUERY)`); the result and variables
   infer from the typed document. Derive element types with
   `ResultOf<typeof MY_QUERY>` (from `@graphql-typed-document-node/core`) when
   you need a named local type.
4. Regenerate types:

   ```bash
   npm run codegen -w @lyricova/components
   ```

   (Running `npm run dev` already does this continuously via `codegen:watch`.)

The codegen `documents` globs in `packages/components/codegen.ts` span **all
three** frontend packages; every operation's types land in the shared
`@lyricova/components/gql`.

### 5.3 GraphQL — **API schema** changes (resolver / type / field)

Because `schema.graphql` is a **committed file that codegen reads**, changing the
server schema is a multi-step operation:

1. Edit the Pothos resolver/type under `packages/api/src/graphql/pothos/`.
2. Re-emit the SDL from the running schema:

   ```bash
   cd packages/api
   npm run pothos:emit          # writes schema.pothos.graphql
   ```

   > ⚠️ **Known issue — `drizzle-orm` module resolution (install/hoisting).** This
   > is **not** specific to `pothos:emit`. Any process that loads the compiled
   > Pothos schema hits it — **including the API server itself** (`npm run serve`,
   > and `nodemon dist/server.js` under `npm run dev`), which crashes at startup
   > with the same error. `@pothos/plugin-drizzle` `require`s `drizzle-orm` but
   > does not declare it as a dependency; it is hoisted to the repo-root
   > `node_modules`, while `drizzle-orm` currently resolves only under
   > `packages/api/node_modules`, so the hoisted plugin can't find it and throws
   > `Cannot find module 'drizzle-orm'`.
   >
   > **Workaround** (applies to the emitter *and* the server) — put
   > `packages/api/node_modules` on the module path:
   >
   > ```bash
   > tsc   # or: npm run build:ts
   > NODE_PATH=$PWD/node_modules node scripts/emit-pothos-schema.mjs   # or: dist/server.js
   > ```
   >
   > **Durable fix:** make `drizzle-orm` hoist next to the plugin — declare it in
   > the **root** `package.json`, add an npm `overrides`/hoisting rule, or run a
   > clean `npm install`.
   >
   > `pothos:emit` (like the server) loads the real app, so a working `.env` (DB
   > connection) is required too.
3. Promote the emit to the codegen source and update the parity baseline:

   ```bash
   cp schema.pothos.graphql schema.graphql          # codegen source of truth
   # add the same field(s) to schema.graphql.golden  (parity baseline)
   ```

4. Verify parity:

   ```bash
   npm run schema:check     # golden vs schema.graphql
   npm run pothos:check     # golden vs a fresh Pothos emit
   ```

5. Regenerate the frontend types so the new field is usable in `graphql()`
   documents:

   ```bash
   npm run codegen -w @lyricova/components
   ```

> The parity guard exists to catch **accidental** schema drift. An
> **intentional** change is expected to update both `schema.graphql` and
> `schema.graphql.golden` in the same commit — treat it like updating a snapshot.

### 5.4 Database schema changes (Drizzle)

`packages/api/src/drizzle/schema.ts` is the ORM **source of truth** (hand-authored,
cross-referenced with the canonical `lyricova-schema.sql` dump).

1. Edit `src/drizzle/schema.ts`.
2. Generate a migration:

   ```bash
   cd packages/api
   npm run db:generate          # drizzle-kit → drizzle/migrations/NNNN_*.sql
   ```

3. Apply it:

   ```bash
   npm run db:migrate
   ```

**Caveats carried over from the hand-maintained schema:**

- **FULLTEXT (ngram) indexes** on `Albums`/`Artists`/`Songs`/`MusicFiles` are not
  expressible in Drizzle mysql-core — they stay DB-managed (see
  `lyricova-schema.sql`) and are used through raw `sql` `MATCH … AGAINST`.
- **`SIMPLE_ENUM_ARRAY`** columns (e.g. `ArtistOf*.roles`/`categories`) are stored
  as `VARCHAR`; (de)serialize with the helpers in `src/drizzle/enumArray`.
- If the column change is **exposed over GraphQL**, also do the API-schema flow in
  [§5.3](#53-graphql--api-schema-changes-resolver--type--field) (update the Pothos
  object type, re-emit, re-run codegen).

---

## 6. Verification

| Package | Type-check | Lint | Test | Schema |
| --- | --- | --- | --- | --- |
| `@lyricova/api` | `npm run build:ts` (or `npx tsc --noEmit`) | `npm run lint` | `npm test` (jest) | `npm run schema:check` |
| `@lyricova/components` | `npm run codegen && npx tsc --noEmit` | — | — | — |
| `@lyricova/jukebox` | `npx tsc --noEmit` | `npm run lint` | `npm test` | — |
| `@lyricova/blog` (`packages/lyricova`) | `npx tsc --noEmit` | `npm run lint` | `npm test` | — |

> Type-checking `components`, `jukebox`, or `lyricova` requires the generated
> `@lyricova/components/gql` to exist — run `npm run codegen -w @lyricova/components`
> first if you're on a clean tree.

---

## 7. Cheat sheet

```bash
# Everyday
npm run dev                                   # all apps + watchers (root, turbo)
npm run build                                 # full topological build (root, turbo)

# GraphQL client document added/changed
npm run codegen -w @lyricova/components        # regenerate typed graphql()

# GraphQL API schema changed (resolver/type/field)
cd packages/api && npm run pothos:emit         # (see known-issue workaround in §5.3)
cp schema.pothos.graphql schema.graphql        # + mirror the change into schema.graphql.golden
npm run schema:check && npm run pothos:check
npm run codegen -w @lyricova/components

# Database schema changed
cd packages/api && npm run db:generate && npm run db:migrate
```
