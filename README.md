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

## Install

- Database
  - Create a MySQL user and grant it access to the database.
  - Setup a MySQL database and initialize the schema with Drizzle:
    ```bash
    npm run db:migrate --workspace @lyricova/api
    ```
- Music file storage
  - Create a directory for storing music files (defaulted to
    `/var/lyricova/music`).
- Environment variables
  - Configure the environment variables in `.env` file. Refer to `.env.sample`
    for examples.
  - For the production sibling domains, set `AUTH_ALLOWED_HOSTS` to both hosts,
    `AUTH_TRUSTED_ORIGINS` and `WEBAUTHN_ORIGINS` to their exact HTTPS origins,
    and set both `WEBAUTHN_RP_ID` and `AUTH_COOKIE_DOMAIN` to `1a23.studio`.
- Node.js
  - Install Node.js 24 LTS and npm 10.9.2 or newer.
  - Install dependencies:
    ```bash
    npm install
    ```
  - Build:
    ```bash
    npm run build
    ```
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
  - Build the image: `docker-compose build`
  - Run the container: `docker-compose up -d`
  - Lyricova blog is listening at port 59742 (`lyric`)
  - Jukebox is listening at port 58532 (`jukeb`)

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

### Recovering from the legacy → Better Auth migration

The `Users` table now stores identity/role fields directly, while
credentials live in `AuthAccounts`/`AuthSessions`/`UserPasskeys` (Better
Auth). Migrating an existing database follows this order:

1. **Preflight** — before migrating, run
   `npm run auth:preflight --workspace @lyricova/api` (after `npm run
build:ts`) to check for legacy data that can't migrate cleanly (missing
   usernames/emails, duplicate normalized usernames/emails, invalid roles, or
   no active administrator). Fix any reported issues in the database first.
2. **Migrate** — run `npm run db:migrate --workspace @lyricova/api`. The
   command safely records `0000_baseline` as already applied when it detects
   the complete pre-existing Lyricova schema; empty databases still apply the
   baseline normally, and incomplete/partially migrated schemas are rejected.
   The
   generated migration backfills an `AuthAccounts` "credential" row from each
   user's legacy password hash into `AuthAccounts` for audit and recovery
   tracking, but authentication accepts Argon2id hashes only. Existing
   Passport sessions and browser JWTs are intentionally invalidated. Legacy
   WebAuthn rows cannot supply the counters and device metadata required by the
   new passkey model, so they are removed.
3. **Recover with the CLI** — if the migration leaves an account unusable
   (including every account that still has a legacy hash), use
   `lyricova-admin auth audit` to list required resets, then run
   `lyricova-admin user reset-password` for each affected account. Password
   resets write a fresh Argon2id hash to `AuthAccounts` and revoke existing
   sessions. Complete all resets before deploying or restarting the
   Argon2-only API. Operators can then sign in with the new password and enroll
   new passkeys.

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
