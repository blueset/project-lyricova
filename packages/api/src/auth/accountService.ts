import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../drizzle/client.js";
import {
  AuthAccounts,
  AuthSessions,
  UserPasskeys,
  Users,
} from "../drizzle/schema.js";
import { hashPassword, isArgon2idHash } from "./password.js";
import type { AuthPreflightResult } from "./preflight.js";

export type { AuthPreflightResult } from "./preflight.js";

/**
 * `accountService` is the sole write boundary for the local `lyricova-admin`
 * CLI (see `src/admin/**`). Every mutation here runs inside a DB transaction
 * so identity/role changes and the "last active admin" guard stay consistent
 * even under concurrent CLI invocations. This module must never be imported
 * by HTTP-facing code — it is intentionally a trusted, local-only tool.
 */

export type Role = "admin" | "guest";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export type AccountServiceErrorCode =
  | "USER_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "PASSKEY_NOT_FOUND"
  | "DUPLICATE_USERNAME"
  | "DUPLICATE_EMAIL"
  | "INVALID_USERNAME"
  | "INVALID_EMAIL"
  | "INVALID_DISPLAY_NAME"
  | "INVALID_ROLE"
  | "INVALID_PASSWORD"
  | "LAST_ADMIN"
  | "NO_TARGET";

export class AccountServiceError extends Error {
  constructor(
    public readonly code: AccountServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccountServiceError";
  }
}

/** Transaction handle type, inferred from `db.transaction` itself. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type UserIdentifier = { id: number } | { username: string };

/** Public, log-safe user projection. Never includes `password`. */
export interface UserRecord {
  id: number;
  username: string;
  displayUsername: string | null;
  displayName: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  creationDate: Date;
  updatedOn: Date;
  deletionDate: Date | null;
}

export interface SessionRecord {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  creationDate: Date;
  updatedOn: Date;
  expiresAt: Date;
  impersonatedBy: string | null;
}

export interface PasskeyRecord {
  id: string;
  name: string | null;
  deviceType: string;
  backedUp: boolean;
  creationDate: Date | null;
  aaguid: string | null;
}

type UsersRow = typeof Users.$inferSelect;

function sanitizeUser(row: UsersRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayUsername: row.displayUsername,
    displayName: row.displayName,
    email: row.email,
    emailVerified: row.emailVerified,
    role: row.role,
    banned: row.banned,
    banReason: row.banReason,
    banExpires: row.banExpires,
    creationDate: row.creationDate,
    updatedOn: row.updatedOn,
    deletionDate: row.deletionDate,
  };
}

/**
 * Lower-cases the username for lookups/uniqueness while preserving the
 * originally typed casing as `displayUsername`, mirroring the `better-auth`
 * `username` plugin convention already baked into the schema/migration.
 */
export function normalizeUsername(rawUsername: string): {
  username: string;
  displayUsername: string;
} {
  const displayUsername = rawUsername.trim();
  if (!displayUsername) {
    throw new AccountServiceError(
      "INVALID_USERNAME",
      "Username must not be empty.",
    );
  }
  return { username: displayUsername.toLowerCase(), displayUsername };
}

export function normalizeEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    throw new AccountServiceError("INVALID_EMAIL", "Email must not be empty.");
  }
  return email;
}

export function normalizeDisplayName(rawDisplayName: string): string {
  const displayName = rawDisplayName.trim();
  if (!displayName) {
    throw new AccountServiceError(
      "INVALID_DISPLAY_NAME",
      "Display name must not be empty.",
    );
  }
  return displayName;
}

export function assertValidRole(role: string): asserts role is Role {
  if (role !== "admin" && role !== "guest") {
    throw new AccountServiceError(
      "INVALID_ROLE",
      `Role must be "admin" or "guest", got "${role}".`,
    );
  }
}

export function assertValidPassword(password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AccountServiceError(
      "INVALID_PASSWORD",
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
}

/**
 * Pure guard against disabling/demoting the last active administrator.
 * `activeAdminCount` must be gathered under a row lock (see
 * `lockActiveAdmins`) so concurrent CLI runs cannot race past this check.
 */
export function assertAdminGuard(params: {
  isTargetCurrentlyActiveAdmin: boolean;
  activeAdminCount: number;
  targetRemainsActiveAdmin: boolean;
}): void {
  const {
    isTargetCurrentlyActiveAdmin,
    activeAdminCount,
    targetRemainsActiveAdmin,
  } = params;
  if (
    isTargetCurrentlyActiveAdmin &&
    !targetRemainsActiveAdmin &&
    activeAdminCount <= 1
  ) {
    throw new AccountServiceError(
      "LAST_ADMIN",
      "Refusing to remove, disable, or demote the final active administrator.",
    );
  }
}

function identifierCondition(identifier: UserIdentifier) {
  return "id" in identifier
    ? eq(Users.id, identifier.id)
    : eq(Users.username, identifier.username.trim().toLowerCase());
}

function identifierLabel(identifier: UserIdentifier): string {
  return "id" in identifier
    ? `id ${identifier.id}`
    : `username "${identifier.username}"`;
}

/** Read-only lookup, no row lock. Used by list-only operations. */
async function findActiveUser(identifier: UserIdentifier): Promise<UsersRow> {
  const row = await db.query.Users.findFirst({
    where: and(identifierCondition(identifier), isNull(Users.deletionDate)),
  });
  if (!row) {
    throw new AccountServiceError(
      "USER_NOT_FOUND",
      `No active user found with ${identifierLabel(identifier)}.`,
    );
  }
  return row;
}

/** Locks the target row for update within an open transaction. */
async function lockActiveUser(
  tx: Tx,
  identifier: UserIdentifier,
): Promise<UsersRow> {
  const rows = await tx
    .select()
    .from(Users)
    .where(and(identifierCondition(identifier), isNull(Users.deletionDate)))
    .for("update");
  const row = rows[0];
  if (!row) {
    throw new AccountServiceError(
      "USER_NOT_FOUND",
      `No active user found with ${identifierLabel(identifier)}.`,
    );
  }
  return row;
}

/** Locks every currently active admin row; used by the last-admin guard. */
async function lockActiveAdmins(tx: Tx): Promise<UsersRow[]> {
  return tx
    .select()
    .from(Users)
    .where(
      and(
        eq(Users.role, "admin"),
        eq(Users.banned, false),
        isNull(Users.deletionDate),
      ),
    )
    .for("update");
}

export interface AddUserInput {
  username: string;
  displayUsername?: string;
  email: string;
  role: Role;
  displayName: string;
  password: string;
}

export async function addUser(input: AddUserInput): Promise<UserRecord> {
  const { username, displayUsername: defaultDisplayUsername } =
    normalizeUsername(input.username);
  const displayUsername = input.displayUsername
    ? input.displayUsername.trim()
    : defaultDisplayUsername;
  assertValidRole(input.role);
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName);
  assertValidPassword(input.password);
  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const existingUsername = await tx.query.Users.findFirst({
      where: eq(Users.username, username),
    });
    if (existingUsername) {
      throw new AccountServiceError(
        "DUPLICATE_USERNAME",
        `Username "${username}" is already in use.`,
      );
    }
    const existingEmail = await tx.query.Users.findFirst({
      where: eq(Users.email, email),
    });
    if (existingEmail) {
      throw new AccountServiceError(
        "DUPLICATE_EMAIL",
        `Email "${email}" is already in use.`,
      );
    }

    const now = new Date();
    const [inserted] = await tx.insert(Users).values({
      username,
      displayUsername,
      displayName,
      email,
      role: input.role,
      emailVerified: true,
      creationDate: now,
      updatedOn: now,
    });
    const userId = inserted.insertId;

    await tx.insert(AuthAccounts).values({
      id: randomUUID(),
      accountId: String(userId),
      providerId: "credential",
      userId,
      password: passwordHash,
      creationDate: now,
      updatedOn: now,
    });

    const created = await tx.query.Users.findFirst({
      where: eq(Users.id, userId),
    });
    return sanitizeUser(created!);
  });
}

export interface UpdateUserPatch {
  newUsername?: string;
  newDisplayUsername?: string;
  displayName?: string;
  email?: string;
  role?: Role;
}

export async function updateUser(
  identifier: UserIdentifier,
  patch: UpdateUserPatch,
): Promise<UserRecord> {
  if (patch.role !== undefined) assertValidRole(patch.role);

  return db.transaction(async (tx) => {
    const target = await lockActiveUser(tx, identifier);

    let nextUsername = target.username;
    let nextDisplayUsername = target.displayUsername;
    if (patch.newUsername !== undefined) {
      const normalized = normalizeUsername(patch.newUsername);
      nextUsername = normalized.username;
      nextDisplayUsername = normalized.displayUsername;
    }
    if (patch.newDisplayUsername !== undefined) {
      nextDisplayUsername = patch.newDisplayUsername.trim();
    }

    const nextEmail =
      patch.email !== undefined ? normalizeEmail(patch.email) : target.email;
    const nextDisplayName =
      patch.displayName !== undefined
        ? normalizeDisplayName(patch.displayName)
        : target.displayName;
    const nextRole = patch.role !== undefined ? patch.role : target.role;

    if (nextUsername !== target.username) {
      const owner = await tx.query.Users.findFirst({
        where: eq(Users.username, nextUsername),
      });
      if (owner && owner.id !== target.id) {
        throw new AccountServiceError(
          "DUPLICATE_USERNAME",
          `Username "${nextUsername}" is already in use.`,
        );
      }
    }
    if (nextEmail !== target.email) {
      const owner = await tx.query.Users.findFirst({
        where: eq(Users.email, nextEmail),
      });
      if (owner && owner.id !== target.id) {
        throw new AccountServiceError(
          "DUPLICATE_EMAIL",
          `Email "${nextEmail}" is already in use.`,
        );
      }
    }

    if (nextRole !== target.role) {
      const activeAdmins = await lockActiveAdmins(tx);
      assertAdminGuard({
        isTargetCurrentlyActiveAdmin: target.role === "admin" && !target.banned,
        activeAdminCount: activeAdmins.length,
        targetRemainsActiveAdmin: nextRole === "admin" && !target.banned,
      });
    }

    await tx
      .update(Users)
      .set({
        username: nextUsername,
        displayUsername: nextDisplayUsername,
        displayName: nextDisplayName,
        email: nextEmail,
        role: nextRole,
        updatedOn: new Date(),
      })
      .where(eq(Users.id, target.id));
    if (nextRole !== target.role) {
      await tx.delete(AuthSessions).where(eq(AuthSessions.userId, target.id));
    }

    const updated = await tx.query.Users.findFirst({
      where: eq(Users.id, target.id),
    });
    return sanitizeUser(updated!);
  });
}

export interface ListUsersFilter {
  role?: Role;
  includeDisabled?: boolean;
  includeDeleted?: boolean;
}

export async function listUsers(
  filter: ListUsersFilter = {},
): Promise<UserRecord[]> {
  const conditions = [];
  if (!filter.includeDeleted) conditions.push(isNull(Users.deletionDate));
  if (!filter.includeDisabled) conditions.push(eq(Users.banned, false));
  if (filter.role !== undefined) conditions.push(eq(Users.role, filter.role));

  const rows = await db.query.Users.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: Users.id,
  });
  return rows.map(sanitizeUser);
}

export async function disableUser(
  identifier: UserIdentifier,
  options: { reason?: string } = {},
): Promise<UserRecord> {
  return db.transaction(async (tx) => {
    const target = await lockActiveUser(tx, identifier);
    const activeAdmins = await lockActiveAdmins(tx);
    assertAdminGuard({
      isTargetCurrentlyActiveAdmin: target.role === "admin" && !target.banned,
      activeAdminCount: activeAdmins.length,
      targetRemainsActiveAdmin: false,
    });

    const now = new Date();
    await tx
      .update(Users)
      .set({
        banned: true,
        banReason: options.reason?.trim() || "Disabled via lyricova-admin CLI",
        updatedOn: now,
      })
      .where(eq(Users.id, target.id));
    await tx.delete(AuthSessions).where(eq(AuthSessions.userId, target.id));

    const updated = await tx.query.Users.findFirst({
      where: eq(Users.id, target.id),
    });
    return sanitizeUser(updated!);
  });
}

export async function enableUser(
  identifier: UserIdentifier,
): Promise<UserRecord> {
  return db.transaction(async (tx) => {
    const target = await lockActiveUser(tx, identifier);
    await tx
      .update(Users)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedOn: new Date(),
      })
      .where(eq(Users.id, target.id));

    const updated = await tx.query.Users.findFirst({
      where: eq(Users.id, target.id),
    });
    return sanitizeUser(updated!);
  });
}

export async function resetPassword(
  identifier: UserIdentifier,
  password: string,
): Promise<UserRecord> {
  assertValidPassword(password);
  const passwordHash = await hashPassword(password);

  return db.transaction(async (tx) => {
    const target = await lockActiveUser(tx, identifier);
    const credential = await tx.query.AuthAccounts.findFirst({
      where: and(
        eq(AuthAccounts.userId, target.id),
        eq(AuthAccounts.providerId, "credential"),
      ),
    });

    const now = new Date();
    if (credential) {
      await tx
        .update(AuthAccounts)
        .set({ password: passwordHash, updatedOn: now })
        .where(eq(AuthAccounts.id, credential.id));
    } else {
      await tx.insert(AuthAccounts).values({
        id: randomUUID(),
        accountId: String(target.id),
        providerId: "credential",
        userId: target.id,
        password: passwordHash,
        creationDate: now,
        updatedOn: now,
      });
    }
    await tx.delete(AuthSessions).where(eq(AuthSessions.userId, target.id));

    const updated = await tx.query.Users.findFirst({
      where: eq(Users.id, target.id),
    });
    return sanitizeUser(updated!);
  });
}

export async function listSessions(
  identifier: UserIdentifier,
): Promise<SessionRecord[]> {
  const target = await findActiveUser(identifier);
  const rows = await db.query.AuthSessions.findMany({
    where: eq(AuthSessions.userId, target.id),
    orderBy: desc(AuthSessions.creationDate),
  });
  return rows.map((row) => ({
    id: row.id,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    creationDate: row.creationDate,
    updatedOn: row.updatedOn,
    expiresAt: row.expiresAt,
    impersonatedBy: row.impersonatedBy,
  }));
}

export interface RevokeSessionsOptions {
  sessionId?: string;
  all?: boolean;
}

export async function revokeSessions(
  identifier: UserIdentifier,
  options: RevokeSessionsOptions,
): Promise<{ revoked: number }> {
  if (!options.sessionId && !options.all) {
    throw new AccountServiceError(
      "NO_TARGET",
      "Specify --session-id or --all.",
    );
  }
  return db.transaction(async (tx) => {
    const target = await lockActiveUser(tx, identifier);
    if (options.sessionId) {
      const existing = await tx.query.AuthSessions.findFirst({
        where: and(
          eq(AuthSessions.id, options.sessionId),
          eq(AuthSessions.userId, target.id),
        ),
      });
      if (!existing) {
        throw new AccountServiceError(
          "SESSION_NOT_FOUND",
          `No session "${options.sessionId}" found for ${identifierLabel(identifier)}.`,
        );
      }
      const [result] = await tx
        .delete(AuthSessions)
        .where(eq(AuthSessions.id, options.sessionId));
      return { revoked: result.affectedRows };
    }
    const [result] = await tx
      .delete(AuthSessions)
      .where(eq(AuthSessions.userId, target.id));
    return { revoked: result.affectedRows };
  });
}

export async function listPasskeys(
  identifier: UserIdentifier,
): Promise<PasskeyRecord[]> {
  const target = await findActiveUser(identifier);
  const rows = await db.query.UserPasskeys.findMany({
    where: eq(UserPasskeys.userId, target.id),
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    deviceType: row.deviceType,
    backedUp: row.backedUp,
    creationDate: row.creationDate,
    aaguid: row.aaguid,
  }));
}

export interface RevokePasskeysOptions {
  passkeyId?: string;
  all?: boolean;
}

export async function revokePasskeys(
  identifier: UserIdentifier,
  options: RevokePasskeysOptions,
): Promise<{ revoked: number }> {
  if (!options.passkeyId && !options.all) {
    throw new AccountServiceError(
      "NO_TARGET",
      "Specify --passkey-id or --all.",
    );
  }
  return db.transaction(async (tx) => {
    const target = await lockActiveUser(tx, identifier);
    if (options.passkeyId) {
      const existing = await tx.query.UserPasskeys.findFirst({
        where: and(
          eq(UserPasskeys.id, options.passkeyId),
          eq(UserPasskeys.userId, target.id),
        ),
      });
      if (!existing) {
        throw new AccountServiceError(
          "PASSKEY_NOT_FOUND",
          `No passkey "${options.passkeyId}" found for ${identifierLabel(identifier)}.`,
        );
      }
      const [result] = await tx
        .delete(UserPasskeys)
        .where(eq(UserPasskeys.id, options.passkeyId));
      return { revoked: result.affectedRows };
    }
    const [result] = await tx
      .delete(UserPasskeys)
      .where(eq(UserPasskeys.userId, target.id));
    return { revoked: result.affectedRows };
  });
}

/** Audits the migrated Better Auth account state without exposing credentials. */
export async function auditAuthMigration(): Promise<AuthPreflightResult> {
  const users = await db.query.Users.findMany();
  const credentialAccounts = await db.query.AuthAccounts.findMany({
    where: eq(AuthAccounts.providerId, "credential"),
  });
  const credentialsByUser = new Map<number, typeof credentialAccounts>();
  for (const credential of credentialAccounts) {
    const existing = credentialsByUser.get(credential.userId) ?? [];
    existing.push(credential);
    credentialsByUser.set(credential.userId, existing);
  }

  const issues: string[] = [];
  const activeUsers = users.filter(
    (user) => user.deletionDate === null && !user.banned,
  );
  for (const user of activeUsers) {
    const credentials = credentialsByUser.get(user.id) ?? [];
    if (credentials.length !== 1 || !credentials[0]?.password) {
      issues.push(
        `Active user ${user.id} must have exactly one password credential.`,
      );
      continue;
    }
    if (credentials[0].accountId !== String(user.id)) {
      issues.push(
        `User ${user.id} has a credential account with mismatched accountId.`,
      );
    }
    if (!isArgon2idHash(credentials[0].password)) {
      issues.push(
        `User ${user.id} must reset their password to replace the legacy hash with Argon2id.`,
      );
    }
  }

  const activeAdmins = activeUsers.filter(
    (user) => user.role === "admin",
  ).length;
  if (activeAdmins === 0) {
    issues.push("No active administrator account exists.");
  }

  return {
    users: users.length,
    activeUsers: activeUsers.length,
    activeAdmins,
    issues,
  };
}
