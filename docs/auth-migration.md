# Recovering from the legacy → Better Auth migration

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
