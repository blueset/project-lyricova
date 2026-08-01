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

| Area                   | Before                                         | Now                                                                                                |
| ---------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ORM                    | Sequelize (`sequelize.sync()`)                 | **Drizzle ORM** — schema in `packages/api/src/drizzle/schema.ts`, migrations via **drizzle-kit**   |
| GraphQL server         | TypeGraphQL decorators on models               | **Pothos** builder in `packages/api/src/graphql/pothos/`                                           |
| GraphQL client         | Apollo `` gql`…` `` tagged templates (untyped) | **graphql-codegen client preset** — ``graphql(`…`)`` from `@lyricova/components/gql` (fully typed) |
| Schema source of truth | (implicit, from decorators)                    | committed **`packages/api/schema.graphql`** (emitted from Pothos)                                  |

The practical consequence: a few artifacts are now **generated** (and
git-ignored), so some changes require a regeneration step before types line up.

---

## Prerequisites

- Node.js 24 LTS for the monorepo runtime, builds, and development containers.
- npm 10.9.2 or newer, matching the root `packageManager` pin.
- `lyrics-kit` supports Node.js 22 or newer when consumed as a standalone
  package.
- A stable Rust toolchain via [`rustup`](https://rustup.rs/) with the
  `wasm32-unknown-unknown` target, only for building `@lyricova/glyph-renderer`
  (consumed by `jukebox`'s "Glyph Canvas (PoC)" lyrics renderer) — see
  [§ 4.1](#41-glyph-renderer-wasm-artifacts) for exact requirements and
  [`docs/glyph-canvas-poc.md`](./glyph-canvas-poc.md) for the feature this
  unlocks.

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
@lyricova/glyph-renderer ──────────▶ @lyricova/jukebox (Rust/wasm → jukebox only)
   (wasm-pack + tsc)
```

- `lyrics-kit` and `@lyricova/components` have no workspace deps → build first.
- `@lyricova/api` builds after `lyrics-kit`.
- `@lyricova/glyph-renderer` (a Rust/wasm-bindgen crate built with `wasm-pack`,
  see [§4.1](#41-glyph-renderer-wasm-artifacts)) has no workspace deps → build
  first; only `@lyricova/jukebox` depends on it.
- `@lyricova/jukebox` builds after `api` + `components` + `glyph-renderer`;
  `@lyricova/blog` (the `packages/lyricova` app) builds after `api` +
  `components`.

> **Why the ordering matters:** `@lyricova/components`'s `build` runs
> **codegen**, which produces the git-ignored `packages/components/src/gql/**`
> typed-document output. Because the two apps depend on `components`, Turbo
> guarantees codegen has run before they build. `components` codegen reads the
> **committed** `packages/api/schema.graphql` file (not `api`'s build output),
> which is why it can run in parallel with `api`.

### What each package's `build` / `dev` does

| Package                                | `build`                                                                 | `dev`                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@lyricova/api`                        | `build:ts` (tsc) → `lint` → `posthog` sourcemaps                        | `nodemon dist/server.js` + `tsc -w` + **`pothos:emit:watch`** (re-emits `schema.graphql`)                                         |
| `@lyricova/components`                 | **`codegen`** → `tsc` → `tsc-alias`                                     | **`codegen:watch`** (regenerates typed docs + schema types) + `tsc -w` + `tsc-alias -w`                                           |
| `@lyricova/glyph-renderer`             | `build:wasm` (**`wasm-pack`** → `pkg/`) → `build:ts` (`tsc` → `build/`) | _no `dev` task_ — its only consumer (`jukebox`) bootstraps it via a `predev` hook (see [§4.1](#41-glyph-renderer-wasm-artifacts)) |
| `@lyricova/jukebox`                    | `next build` (`prebuild` bootstraps `glyph-renderer`)                   | `next dev` (PORT 8082; `predev` bootstraps `glyph-renderer`)                                                                      |
| `@lyricova/blog` (`packages/lyricova`) | `next build`                                                            | `next dev` (PORT 8081)                                                                                                            |

---

## 3. Running the root scripts

### `npm run build`

`turbo run build` respects the topology above, so a clean build "just works":
codegen runs inside the `components` build before the apps compile.

### `npm run dev`

`turbo run dev` starts **all** `dev` scripts in parallel (persistent, uncached).
GraphQL codegen and the server schema emit run **on watch**, so the typed graph
stays in sync automatically as you edit (see
[§3.1](#31-graphql-watch-pipeline)).

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
   node process (and the `pothos:emit:watch` emitter, which also reads `dist/`)
   may run a couple of times before `dist/` is fully populated.

3. **`glyph-renderer`'s wasm/JS artifacts don't exist yet.** `jukebox` imports
   `@lyricova/glyph-renderer` (git-ignored `build/` + `pkg/`, see
   [§4.1](#41-glyph-renderer-wasm-artifacts)). You do **not** need to prime this
   by hand: `jukebox`'s `predev` hook bootstraps the package (building it only if
   an artifact is missing) before `next dev` starts, both under `npm run dev` and
   `npm run dev -w @lyricova/jukebox`. The first clean start therefore pays a
   one-time `wasm-pack` build (needs a stable Rust toolchain + the
   `wasm32-unknown-unknown` target); subsequent starts are instant no-ops.

Ports: **jukebox → 8082**, **blog/lyricova → 8081**. `api` needs a `.env` with a
**parseable** `DB_URI` (the emit only creates a lazy pool — a reachable database
isn't required just to regenerate the schema, but the server obviously needs one).

### 3.1 GraphQL watch pipeline

During `npm run dev` the whole GraphQL type graph regenerates automatically —
you should never need to hand-run codegen or `pothos:emit`:

```
edit a graphql() document (components / jukebox / lyricova)
   └─▶ components codegen:watch regenerates src/gql/**            (typed operations)

edit a Pothos resolver/type (packages/api/src/graphql/**)
   └─▶ api tsc -w recompiles → dist/graphql/** changes
         └─▶ api pothos:emit:watch re-emits packages/api/schema.graphql
               └─▶ components codegen:watch regenerates src/gql/** + src/gql/schema.ts
```

How it's wired (and why):

- **`components` `codegen:watch`** is a `nodemon` that watches
  `../api/schema.graphql` and runs
  `graphql-codegen --config codegen.schema.ts && graphql-codegen --config codegen.ts --watch`.
  The inner `--watch` handles **document** edits incrementally (fast, and it
  works across packages). Wrapping it in `nodemon` is deliberate:
  graphql-codegen caches the schema for the life of a `--watch` process and does
  **not** reload it when the schema _file_ changes, so a schema change restarts
  the whole codegen — reloading the fresh schema and re-emitting
  `src/gql/schema.ts` too. This needs **`@parcel/watcher`** (a root devDependency;
  without it `graphql-codegen --watch` silently no-ops) and **`nodemon`**.
- **`api` `pothos:emit:watch`** is a `nodemon --watch dist/graphql` that runs the
  emit into `schema.graphql` (the committed codegen source) whenever the compiled
  resolvers change.

Practical notes:

- **No churn for internal-only edits.** The emit is deterministic and only the
  _interface_ (types, fields, args, nullability, descriptions, directives) lands
  in the SDL — not resolver bodies. Refactor a resolver's logic and
  `schema.graphql` is rewritten byte-identically, so `git status` stays clean.
  `schema.graphql` only shows as modified when you actually change the GraphQL
  contract — which is exactly when you'd want a visible diff (commit it
  alongside the resolver change; see
  [§5.3](#53-graphql--api-schema-changes-resolver--type--field)).
- The emit reads the **compiled** `dist/`, so a schema change propagates only
  after `tsc -w` finishes recompiling (a second or two).

---

## 4. Generated & git-ignored artifacts

Know these so you don't hunt for "missing" files or commit generated output:

| Path                                 | Produced by                               | Committed?                        |
| ------------------------------------ | ----------------------------------------- | --------------------------------- |
| `packages/components/src/gql/**`     | `npm run codegen -w @lyricova/components` | **No** (git-ignored)              |
| `packages/api/schema.pothos.graphql` | `npm run pothos:emit`                     | **No** (transient emit)           |
| `packages/api/dist/**`               | `tsc`                                     | **No**                            |
| `packages/api/schema.graphql`        | _hand-updated_ from the Pothos emit       | **Yes** — codegen source of truth |
| `packages/api/drizzle/migrations/**` | `npm run db:generate`                     | **Yes**                           |
| `packages/glyph-renderer/pkg/**`     | `npm run build:wasm` (`wasm-pack`)        | **No** (git-ignored)              |
| `packages/glyph-renderer/build/**`   | `npm run build:ts` (`tsc`)                | **No** (git-ignored)              |
| `packages/glyph-renderer/target/**`  | `cargo` (Rust intermediates)              | **No** (git-ignored)              |

### 4.1 `glyph-renderer` wasm artifacts

`@lyricova/glyph-renderer` is a Rust/wasm-bindgen crate. Its `build` runs
`wasm-pack build` (→ `pkg/`: the WASM binary + wasm-bindgen JS/`.d.ts`) then
`tsc` (→ `build/`: the public `index.js`/`index.d.ts` wrapper `ts/index.ts`
imports the `pkg/` bindings). Both trees are **git-ignored**, so on a clean
checkout they don't exist. `@lyricova/jukebox` is the only consumer — it imports
the package at build/dev time and serves `pkg/glyph_renderer_bg.wasm` at runtime
via `/api/glyph-renderer/wasm` (see
`packages/jukebox/src/app/api/glyph-renderer/wasm/`).

How each entry point ensures the artifacts exist **before** jukebox needs them:

| Entry point                                 | How glyph-renderer is built first                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build` (root, Turbo)               | Topological `^build` — jukebox depends on it, so Turbo builds it first                                                                |
| `npm run dev` (root, Turbo)                 | jukebox `predev` hook bootstraps it (no standalone glyph `dev` task, so no double-build/race)                                         |
| `npm run dev -w @lyricova/jukebox`          | jukebox `predev` hook                                                                                                                 |
| `npm run build -w @lyricova/jukebox`        | jukebox `prebuild` hook                                                                                                               |
| `npm run typecheck` / `typecheck:native`    | jukebox `pretypecheck` / `pretypecheck:native` hooks (tsc/tsgo read the `.d.ts`); glyph-renderer's own `pretypecheck*` also bootstrap |
| `npm run test` / `npm test -w …/jukebox`    | jukebox `pretest` hook (vitest reads `pkg/` + `build/`)                                                                               |
| `npm run test:browser`                      | jukebox `pretest:browser` hook (the vite fixture serves `pkg/` wasm)                                                                  |
| `npm run start -w @lyricova/jukebox` (prod) | jukebox `prestart` hook **verifies only** (`--check`, no build)                                                                       |
| CI (`.github/workflows/typecheck.yml`)      | explicit `npm run build -w @lyricova/glyph-renderer` before lint/typecheck                                                            |

`lint` deliberately has **no** hook: eslint's config is not type-aware and never
resolves the built package, and glyph-renderer's own `lint` doesn't build, so
`turbo run lint` neither consumes nor produces the artifacts — adding a hook
would only cause needless wasm rebuilds.

The hooks delegate to the package's bootstrap
(`packages/glyph-renderer/scripts/ensure-build.mjs`, invoked via
`packages/jukebox/scripts/ensure-glyph-renderer.mjs`), which is **idempotent,
staleness-aware, and concurrency-safe**, and never shells out to Turbo (so it
can't recurse into the hook):

- **Staleness** — it records a content **fingerprint** of the real build inputs
  (Rust `src/*.rs`, `ts/*.ts` excluding tests, `Cargo.toml`/`Cargo.lock`,
  `tsconfig.json`, the build-related `package.json` scripts + tool versions,
  and the relevant extracted `package-lock.json` subset for `typescript` /
  `wasm-pack`) at `build/.glyph-inputs.hash` (written by glyph-renderer's
  `postbuild` hook). A bootstrap is a no-op only when every artifact exists
  **and** the fingerprint matches; it rebuilds when any input changed
  (content-based, so it survives clone/checkout mtime churn and won't serve
  stale wasm after a `.rs`/`.ts`/Cargo/script/tool/lock edit). Test/doc files
  are **not** inputs.
- **Concurrency** — a cross-process lock (`.glyph-build.lock`, atomic `mkdir`,
  git-ignored) serialises builds: with many `pre*` hooks firing in parallel
  under Turbo, exactly one caller builds while the others wait and then reuse
  the fresh result, so two `wasm-pack` builds never run and no caller reads a
  half-written tree. A dead/stale lock owner is stolen so a crashed build can't
  wedge the repo.
- **`--check`** (used by `prestart`) verifies without building and exits
  non-zero with distinct **missing** vs **stale** guidance — for runtimes that
  ship prebuilt artifacts and have no Rust toolchain (see
  [§5.5](#55-docker--runtime-prebuilt-artifacts)).

Turbo's `build` task lists `pkg/**` in its `outputs`, so a cache hit restores
the WASM (and the fingerprint) alongside `build/`.

> Because `ts/index.ts` imports the generated `pkg/` bindings, glyph-renderer's
> own `typecheck`/`typecheck:native` also bootstrap `pkg/` first (a no-op once
> built) rather than unconditionally rebuilding the wasm on every type-check.

---

## 4.1 Telemetry (PostHog / Clarity)

Analytics events are **suppressed outside production builds**. The gate lives in
two places:

| Runtime                                            | Gate                                                     |
| -------------------------------------------------- | -------------------------------------------------------- |
| Browser (`@lyricova/components`, Next.js apps)      | `isTelemetryEnabled()` in `packages/components/src/utils/telemetry.ts` |
| Node API server (`@lyricova/api`)                   | `isTelemetryEnabled()` in `packages/api/src/utils/posthog.ts` (`postHog` stays `undefined` when off) |

Both return `process.env.NODE_ENV === "production"`, so `npm run dev` never
initialises PostHog/Clarity nor sends events. Overrides:

- `NEXT_PUBLIC_TELEMETRY_ENABLED=1` — force telemetry on in the browser apps
  (use `TELEMETRY_ENABLED=1` for the API server; it also honours the
  `NEXT_PUBLIC_` variant).
- `…=0` — force telemetry off even in production.

Sourcemap uploads are separate and controlled by `POSTHOG_SOURCEMAPS`.

---

## 5. Workflows

### 5.1 Ordinary code changes (TS / React)

No new steps. Edit, and let `tsc -w` / `next dev` recompile. Validate with the
per-package commands in [§6](#6-verification).

For media-synchronized jukebox lyrics, follow the lifecycle and timing rules in
[Jukebox animation timing](./jukebox-animation-timing.md).

### 5.2 GraphQL — **client** documents (queries/mutations/subscriptions)

Anywhere in `components`, `jukebox`, or `lyricova`:

1. Write the operation with the typed tag, **not** Apollo's `gql`:

   ```ts
   import { graphql } from "@lyricova/components/gql";

   const MY_QUERY = graphql(`
     query MyThing($id: Int!) {
       # ← every operation MUST be named
       musicFile(id: $id) {
         id
         trackName
       }
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

> **During `npm run dev` most of this is automatic.** The watch pipeline
> ([§3.1](#31-graphql-watch-pipeline)) re-emits `schema.graphql` and regenerates
> the frontend types on every resolver save — so in dev you can skip the manual
> emit (step 2) and codegen (step 4) below, and just commit the resulting
> `schema.graphql` diff. The manual sequence here is what you run **outside** dev
> (CI, a one-off, or to produce the SDL diff by hand).

1. Edit the Pothos resolver/type under `packages/api/src/graphql/pothos/`.
2. Re-emit the SDL from the running schema:

   ```bash
   cd packages/api
   npm run pothos:emit          # writes schema.pothos.graphql
   ```

   > **Note — `drizzle-orm` is declared in the _root_ `package.json` on purpose.**
   > `@pothos/plugin-drizzle` `require`s `drizzle-orm` without declaring it and is
   > hoisted to the repo-root `node_modules`, so `drizzle-orm` is pinned as a root
   > dependency (next to `graphql`) to keep a single copy at the root where the
   > plugin — and anything that loads the Pothos schema, **including the API
   > server** — can resolve it. **Don't remove that root dependency.** If an
   > install ever leaves `drizzle-orm` nested under `packages/api` again you'll see
   > `Cannot find module 'drizzle-orm'` from `pothos:emit` _and_ `node dist/server.js`;
   > fix it with `npm install --legacy-peer-deps` (the repo has a pre-existing peer
   > conflict, so plain `npm install` needs that flag), or as a stopgap run node
   > with `NODE_PATH=$PWD/node_modules`.
   >
   > `pothos:emit` (like the server) loads the real app, so a _parseable_ `DB_URI`
   > is required (a reachable database is not — the pool is created lazily).

3. Promote the emit to the codegen source:

   ```bash
   cp schema.pothos.graphql schema.graphql          # codegen source of truth (dev's watch already did this)
   ```

4. Regenerate the frontend types so the new field is usable in `graphql()`
   documents:

   ```bash
   npm run codegen -w @lyricova/components
   ```

> Commit the `schema.graphql` diff alongside the resolver change — treat it like
> updating a snapshot so accidental schema drift stays visible in review.

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

### 5.5 Docker / runtime (prebuilt artifacts)

The container image (`Dockerfile`) provisions only the **runtime** OS deps
(mecab, `yt-dlp`, ffmpeg, `concurrently`) — it does **not** compile the apps.
`docker-compose.yml` bind-mounts the repo (`.:/app`) and the `CMD` runs each
package's `npm run start`, so the container serves the artifacts you built on
the **host** first:

```bash
npm run build            # host: turbo build (incl. glyph-renderer pkg/ + build/)
docker-compose build     # image: OS runtime deps only
docker-compose up -d
```

Because the container is a **prebuilt-artifact** runtime (no Rust toolchain), it
is intentionally **not** provisioned to build `glyph-renderer` from source.
Instead, jukebox's `prestart` hook runs the bootstrap in `--check` mode: it
**verifies** `packages/glyph-renderer/{build,pkg}` exist (delivered via the bind
mount) and fails fast with a clear message if you forgot the host `npm run
build`, rather than trying — and failing — to compile wasm in the container.
The WASM byte route resolves the binary through Node module resolution + a
`cwd` walk (`src/app/api/glyph-renderer/wasm/wasmFile.ts`), which works from
`next start` in the mounted source tree (jukebox does not use `output:
"standalone"`, so there is no separate traced server bundle to copy `pkg/`
into).

---

## 6. Verification

Every package exposes `typecheck` (classic `tsc`), `typecheck:native` (the
TypeScript 7 native compiler `tsgo`), and `lint`. The root wires them through
Turbo, so the whole repo is validated with:

```bash
npm run lint              # turbo run lint            (ESLint flat config)
npm run typecheck         # turbo run typecheck       (tsc 6.x, --noEmit)
npm run typecheck:native  # turbo run typecheck:native (tsgo / TS 7 preview)
npm run test              # turbo run test            (jest)
```

| Package                                | Type-check                          | Lint           | Test                               | Schema                |
| -------------------------------------- | ----------------------------------- | -------------- | ---------------------------------- | --------------------- |
| `@lyricova/api`                        | `npm run typecheck` (or `build:ts`) | `npm run lint` | `npm test` (jest)                  | `npm run pothos:emit` |
| `@lyricova/components`                 | `npm run typecheck`                 | `npm run lint` | —                                  | —                     |
| `@lyricova/glyph-renderer`             | `npm run typecheck`                 | `npm run lint` | `npm test` (`cargo test`)          | —                     |
| `@lyricova/jukebox`                    | `npm run typecheck`                 | `npm run lint` | `npm test`; `npm run test:browser` | —                     |
| `@lyricova/blog` (`packages/lyricova`) | `npm run typecheck`                 | `npm run lint` | `npm test`                         | —                     |

> Type-checking `components`, `jukebox`, or `lyricova` requires the generated
> `@lyricova/components/gql` to exist — run `npm run codegen -w @lyricova/components`
> first if you're on a clean tree. `jukebox`/`lyricova` also type-check against
> `@lyricova/components`'s build output, so build it first on a clean tree.
> `jukebox` additionally type-checks against `@lyricova/glyph-renderer`'s
> `build/` types; its `predev`/`prebuild` hooks build it automatically, or run
> `npm run build -w @lyricova/glyph-renderer` once before a bare `npm run
typecheck` on a clean tree.
>
> A ready-to-enable GitHub Actions workflow that runs the lint + `tsc` + `tsgo`
> gates lives at `.github/workflows/typecheck.yml` (triggered on pull requests
> and manual dispatch).

---

## 7. TypeScript configuration & TS 7 (`tsgo`) readiness

The repo targets **TypeScript 6.0.x** (`typescript@^6.0.3`, pinned in the root
and every package) and is kept compatible with the **TypeScript 7 native
compiler** (`tsgo`, from `@typescript/native-preview`) so the eventual TS 7
upgrade is a drop-in. `tsgo` is run as a non-authoritative gate via
`npm run typecheck:native`; the build still uses classic `tsc` / `next`.

### Shared base config

All packages `extends` the root **`tsconfig.base.json`**, which holds the
environment-agnostic options (`esModuleInterop`, `skipLibCheck`,
`forceConsistentCasingInFileNames`, `resolveJsonModule`, `isolatedModules`,
`target: ES2022`). Each package's `tsconfig.json` only sets what differs:

| Package                       | `module` / `moduleResolution`                   | Emit                    | `strict` | `verbatimModuleSyntax` |
| ----------------------------- | ----------------------------------------------- | ----------------------- | -------- | ---------------------- |
| `@lyricova/api`               | `nodenext` / `nodenext`                         | CJS → `dist/`           | ✅       | ✗ (CJS emit)           |
| `lyrics-kit`                  | `nodenext` (main) + `esnext`/`bundler` (module) | dual CJS+ESM → `build/` | ✅       | ✗ (CJS emit)           |
| `@lyricova/components`        | `esnext` / `bundler`                            | ESM → `build/`          | ✅       | ✅                     |
| `@lyricova/jukebox`           | `esnext` / `bundler`                            | `noEmit` (Next)         | ✅       | ✅                     |
| `@lyricova/blog` (`lyricova`) | `esnext` / `bundler`                            | `noEmit` (Next)         | ✅       | ✅                     |

- **`strict` is `true` everywhere.** (TS 6.0 flipped the `strict` default to
  `true`; it is set explicitly in every package to be unambiguous.)
- **`verbatimModuleSyntax` is on only for the ESM/bundler packages.** It is
  incompatible with the CJS-emitting packages (`api`, `lyrics-kit`), which emit
  CommonJS from ESM-syntax source — enabling it there raises TS1287/TS1295.
- **`isolatedModules` is on everywhere**, and type-only imports are enforced by
  ESLint's `@typescript-eslint/consistent-type-imports` (`import type` / inline
  `type`), which `tsgo` and `verbatimModuleSyntax` both rely on.

### TS 6 / TS 7 gotchas (already handled — don't reintroduce)

- **No `baseUrl`** and **no `moduleResolution: "node"`/`node10`** — both are
  deprecated in TS 6 (TS5101 / TS5107) and removed in TS 7. Use `paths` with
  relative targets (`"@/*": ["./src/*"]`) and `nodenext`/`bundler` resolution.
- **Jest globals need explicit `types`.** TS 6 no longer auto-includes hoisted
  but undeclared `@types`, so packages with jest tests set
  `compilerOptions.types` (e.g. `["node", "jest"]`) — otherwise `describe`/`it`/
  `expect` fail to resolve. `ts-jest` must be `>= 29.4.11` for TS 6.
- **Measuring strict errors:** an explicit `"strictNullChecks": false` in a
  tsconfig overrides the `--strict` CLI flag, so `tsc --strict` under-reports.
  Measure with the real config (strict on), not the CLI flag.

---

## 8. Cheat sheet

```bash
# Everyday
npm run dev                                   # all apps + watchers (root, turbo)
                                              #   → codegen + schema emit run on watch (see §3.1);
                                              #     editing docs/resolvers regenerates types automatically
npm run build                                 # full topological build (root, turbo)
npm run lint                                  # ESLint (flat config) across all packages
npm run typecheck                             # tsc 6.x --noEmit across all packages
npm run typecheck:native                      # tsgo (TS 7 preview) --noEmit across all packages

# GraphQL client document added/changed  (manual — only needed OUTSIDE `npm run dev`)
npm run codegen -w @lyricova/components        # regenerate typed graphql()

# GraphQL API schema changed (resolver/type/field)
# In `npm run dev`, schema.graphql + client types regenerate automatically; then at commit time:
cd packages/api && npm run pothos:emit         # regenerate SDL (see the drizzle-orm note in §5.3)
cp schema.pothos.graphql schema.graphql        # promote the emit to the codegen source
npm run codegen -w @lyricova/components

# Database schema changed
cd packages/api && npm run db:generate && npm run db:migrate

# glyph-renderer wasm (jukebox's dev/build/start hooks build it automatically;
# run manually to force a rebuild or to prime a bare typecheck on a clean tree)
npm run build -w @lyricova/glyph-renderer      # wasm-pack (pkg/) + tsc (build/)
```
