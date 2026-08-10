# Project Lyricova

![Project Lyricova](./banner.svg)

Project Lyricova is a free and open source suite of web apps for lyrics blogging
and music management focused on Vocaloid\* contents.

Project Lyricova is currently under the progress of a complete rewrite. The
rewrite will consist of 2 parts: a jukebox + music library manager and a lyrics
blog. The new tech stack is TypeScript + Node.js + MySQL + Express.js + React +
Next.js.

For music manangement, this project relies on [VocaDB](https://vocadb.net) for
its database of Vocaloid songs, and allow manual addition of entries that does
not fall under VocaDB’s scope.

For the previous version of Project Lyricova last released in 2015, see the `v1`
branch.

[Learn more](https://1a23.com/works/open-source/project-lyricova-gen-2/).

<small>\* The term “Vocaloid” here includes all voice synthesizers, as defined
in VocaDB.net.</small>

## Packages

- `api`: The backend API for both `jukebox` and `lyricova`.
- `jukebox`: Music library manager and public jukebox.
- `lyricova`: Lyrics blog (similar to version 1).
- `components`: Common front-end logic and components shared between `jukebox` and `lyricova`.
- `lyrics-kit`: Fetch and parse lyrics from various sources.
- `glyph-renderer`: A Rust/wasm crate that renders lyrics in a canvas with glyphs and effects.

## Install

- Database
  - `docker compose` now ships a `mysql` service (MySQL 9.7) with a persistent
    `mysql_data` volume, so you no longer need to provision one by hand. It is
    published on `127.0.0.1:3306` only.
  - Create a MySQL user and grant it access to the database (the compose
    service does this from `MYSQL_USER`/`MYSQL_PASSWORD`, default
    `lyricova`/`lyricova`).
  - `DB_URI` must resolve to the database from wherever it runs: use the
    `mysql` service name from inside compose, and `127.0.0.1:3306` from the
    host.
  - Initialize (or update) the schema with Drizzle. From a deployment that runs
    the published image, use the one-shot `migrate` service — it runs the very
    image you are deploying, so the migration files always match the running
    code, and it needs no checkout, Node install or dev toolchain on the host:

    ```bash
    docker compose --profile migrate run --rm migrate
    ```

    From a source checkout (e.g. for local development), the equivalent is:

    ```bash
    npm run db:migrate --workspace @lyricova/api
    ```

    Point it at the published port when the database is the compose service:

    ```bash
    DB_URI="mysql://lyricova:lyricova@127.0.0.1:3306/lyricova?ssl=false" \
      npm run db:migrate --workspace @lyricova/api
    ```
- Music file storage
  - Create a directory for storing music files (defaulted to
    `/var/lyricova/music`).
- Environment variables
  - Configure the environment variables in `.env` file. Refer to `.env.sample`
    for examples.
  - **`NEXT_PUBLIC_*` are build-time, not runtime.** Next.js inlines them into
    the client bundle when the app is compiled, so with the self-contained
    Docker image they must be passed as **build args**, not container
    environment. `docker compose` forwards
    `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
    `NEXT_PUBLIC_CLARITY_PROJECT_ID` and `NEXT_PUBLIC_TELEMETRY_ENABLED` from
    your shell or `.env` into the build.
  - The image already fixes the values that are properties of the image rather
    than of a deployment: `YTDLP_PATH`, `MUSIC_FILES_PATH`, `NODE_ENV`,
    `API_PORT`/`LYRICOVA_PORT`/`JUKEBOX_PORT` and `API_INTERNAL_URL` (all three
    processes share one network namespace). `FFMPEG_PATH` is left unset on
    purpose — the code falls back to `ffmpeg` on `PATH`, which the image
    provides.
  - For the production sibling domains, set `AUTH_ALLOWED_HOSTS` to both hosts,
    `AUTH_TRUSTED_ORIGINS` and `WEBAUTHN_ORIGINS` to their exact HTTPS origins,
    set `AUTH_IP_ADDRESS_HEADERS` to
    `cf-connecting-ip,x-forwarded-for` when routing through Cloudflare, and set
    both `WEBAUTHN_RP_ID` and `AUTH_COOKIE_DOMAIN` to `1a23.studio`.
- Node.js
  - Install Node.js 24 LTS (24.15.0 or newer) and npm 12.0.0 or newer.
  - Install dependencies:
    ```bash
    npm install
    ```
  - Build:
    ```bash
    npm run build
    ```
    This is a topological Turborepo build. It also compiles the
    `@lyricova/glyph-renderer` Rust/wasm crate (via `wasm-pack`, needing a
    stable Rust toolchain + the `wasm32-unknown-unknown` target) into its
    git-ignored `pkg/` (WASM) and `build/` (JS) — `@lyricova/jukebox` imports
    these at build time and serves the WASM at runtime. Jukebox's own
    `dev`/`build`/`start` also bootstrap the crate automatically; see
    [`docs/development-and-build.md` §4.1](docs/development-and-build.md). This
    crate powers the experimental "Glyph Canvas (PoC)" lyrics renderer — see
    [`docs/glyph-canvas-poc.md`](docs/glyph-canvas-poc.md) for what it is, the
    platform research behind it, and its known limitations.
  - Create a Lyricova user in the database as admin.
    ```bash
    npx --workspace @lyricova/api lyricova-admin user add --username <username> --email <email> --role admin --display-name <display-name>
    ```
    This prompts for a password interactively (hidden input, confirmed
    twice); pipe one in non-interactively instead with
    `--password-stdin < password.txt` or
    `echo "$PASSWORD" | npx --workspace @lyricova/api lyricova-admin user add ... --password-stdin`.
    See [`lyricova-admin` CLI](#lyricova-admin-cli) below for the full command
    reference and the legacy-auth migration recovery flow.
- Runtime
  - Runtime is supported by Docker.
  - Run it: `docker compose up -d` (no local build — this pulls the published
    image)
  - Lyricova blog is listening at port 59742 (`lyric`)
  - Jukebox is listening at port 58532 (`jukeb`)
  - There are three interchangeable variants of the app service. They all
    publish the same host ports, so run exactly one:

    | Service              | Profile     | Source of the app                                          |
    | -------------------- | ----------- | ---------------------------------------------------------- |
    | `lyricova`           | _(default)_ | Pulls `ghcr.io/blueset/project-lyricova:nightly`           |
    | `lyricova-build`     | `build`     | Builds the same image from this checkout                   |
    | `lyricova-bindmount` | `bindmount` | Runtime OS deps only; serves a host build via a bind mount |
    | `migrate`            | `migrate`   | One-shot: applies Drizzle migrations, then exits           |

  - **`lyricova` (default)** runs the image published by the
    [container workflow](#container-publishing-github-actions). `:nightly` is a
    moving tag, so `pull_policy` is `always`; Compose's default (`missing`)
    would otherwise pin you forever to the first image pulled. To deploy or roll
    back to a specific commit, point `LYRICOVA_IMAGE` at an immutable tag:
    ```bash
    LYRICOVA_IMAGE=ghcr.io/blueset/project-lyricova:sha-1a2b3c4 docker compose up -d
    ```
  - **`lyricova-build`** builds that same **self-contained image** locally: the
    multi-stage `Dockerfile` installs the full dependency tree, provisions a
    Rust toolchain + `wasm32-unknown-unknown`, and runs the topological
    `npm run build` (including the `@lyricova/glyph-renderer` wasm crate)
    inside the image, then ships the compiled output on top of an
    `npm ci --omit=dev` tree. **No host build is required**, and **no database
    is needed to build the image** — nothing in the build graph queries the DB
    (GraphQL/OpenAPI codegen reads the committed `packages/api/schema.graphql`,
    the API build is `tsc`/eslint only, the drizzle pool connects lazily, and
    both Next apps fetch with `cache: "no-store"`, so no route is prerendered
    with data). A database is still required at **runtime** and for
    `db:migrate`. It is tagged separately (`project-lyricova:local`) so it never
    clobbers a pulled `:nightly`:
    ```bash
    docker compose --profile build up -d --build lyricova-build
    ```
    This profile declares the `posthog_api_key` build secret, so export
    `POSTHOG_API_KEY` (an empty value is fine — the build then skips sourcemap
    upload) before invoking it.
  - Note that the repo is deliberately **not** bind-mounted over `/app` in
    either image-based mode: doing so would shadow the artifacts compiled into
    the image.
  - **`lyricova-bindmount`** keeps the previous workflow as a fallback. Its
    image carries runtime OS dependencies only and bind-mounts the repo, so you
    must **build on the host first** (`npm install && npm run build`) —
    including `@lyricova/glyph-renderer`'s `pkg/`/`build/`. Jukebox's
    `prestart` hook verifies those prebuilt artifacts exist (and are not stale)
    and fails fast if the host build was skipped. Start it with:
    ```bash
    docker compose --profile bindmount up -d lyricova-bindmount
    ```

## `lyricova-admin` CLI

`lyricova-admin` (built from `packages/api/src/admin`) is a **local, trusted
database tool**, not a remote API client: it connects directly to the same
MySQL database and reads the same environment configuration (`.env`) as the
API server, so it must only be run by an operator who already has direct
database access (e.g. on the host/container running the API, or with a tunnel
to the production database). It performs every write through
`accountService` (`packages/api/src/auth/accountService.ts`) inside a DB
transaction, so identity/role changes and the "last active admin" guard stay
consistent even if the CLI is run concurrently from multiple places.

After `npm run build --workspace @lyricova/api` (or the root `npm run
build`), invoke the compiled bin from the repo root with
`npx --workspace @lyricova/api lyricova-admin`, or run
`node packages/api/dist/admin/index.js` directly. The shorter
`lyricova-admin` spelling below refers to either form.

```
Usage: lyricova-admin <command> [options]

  user add --username <name> --email <email> --role admin|guest
           --display-name <name> [--display-username <name>] [--password-stdin]
  user update (--username <name> | --id <n>) [--new-username <name>]
              [--new-display-username <name>] [--email <email>]
              [--role admin|guest] [--display-name <name>]
  user list [--role admin|guest] [--include-disabled] [--include-deleted]
  user disable (--username <name> | --id <n>) [--reason <text>]
  user enable (--username <name> | --id <n>)
  user reset-password (--username <name> | --id <n>) [--password-stdin]
  user sessions list (--username <name> | --id <n>)
  user sessions revoke (--username <name> | --id <n>) (--session-id <id> | --all) [--yes]
  user passkeys list (--username <name> | --id <n>)
  user passkeys revoke (--username <name> | --id <n>) (--passkey-id <id> | --all) [--yes]
  auth audit

Global options: --json, -h/--help
```

Run `lyricova-admin --help`, `lyricova-admin user --help`, etc. for the same
reference at any time. Every command accepts `--json` for machine-readable
output and exits non-zero on error.

**Passwords are never accepted as a plain CLI argument** (that would leak
into shell history and `ps`). `user add` and `user reset-password` either
read a password from stdin with `--password-stdin`, or — on an interactive
terminal — prompt twice with echo disabled and require both entries to
match. Passwords must be 12–128 characters. `reset-password` (and
`disable`) also revoke all of the user's existing sessions, so old
browser/API sessions stop working immediately; passkeys are untouched by
those commands and must be revoked separately with `user passkeys revoke`
if needed. Destructive "revoke all" operations (`sessions revoke --all`,
`passkeys revoke --all`) prompt for confirmation on a TTY and require
`--yes` when run non-interactively (e.g. from a script).

## Etymology

The name _Lyricova_ is a made up word from “lyrics” and “voca” (taken from
_Vocaloid_) or “nova” (taking the meaning of _new_), which signifies a new way
of working with Vocaloid lyrics. This project was previously known as _Project
Gy_ which is taken from its name in Chinese, Gē-yǔ (歌語). 歌 means _songs_, and
語 means _to express_, putting together, Gē-yǔ is making a sense of expressing
oneself through songs and lyrics.

## See also

- [Lyricize](https://github.com/outloudvi/lyricize), a lyrics and quote
  collection site written in Django by @outloudvi. Heavily inspired by Project
  Lyricova (v1).

## License

```
Project Lyricova: A lyrics blogging and music management suite for Vocaloid
Copyright (C) 2013–2026 Eana Hufwe

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```
