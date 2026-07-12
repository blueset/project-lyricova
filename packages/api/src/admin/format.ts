import type {
  AuthPreflightResult,
  PasskeyRecord,
  SessionRecord,
  UserRecord,
} from "../auth/accountService.js";

/**
 * Presentation helpers for the `lyricova-admin` CLI. Every function here is a
 * pure string transform (no I/O), which keeps them easy to unit test and
 * guarantees they never accidentally serialize a password/hash/token — the
 * record types they accept (`UserRecord`, `SessionRecord`, `PasskeyRecord`)
 * simply don't carry those fields.
 */

function formatDate(value: Date | null): string {
  return value ? value.toISOString() : "-";
}

export function formatUserLine(user: UserRecord): string {
  const status = user.banned ? "disabled" : "active";
  return [
    `#${user.id}`,
    user.displayUsername ?? user.username,
    `<${user.email}>`,
    user.role,
    status,
  ].join("\t");
}

export function formatUserDetails(user: UserRecord): string {
  const lines = [
    `id:               ${user.id}`,
    `username:         ${user.username}`,
    `displayUsername:  ${user.displayUsername ?? "-"}`,
    `displayName:      ${user.displayName}`,
    `email:            ${user.email}`,
    `emailVerified:    ${user.emailVerified}`,
    `role:             ${user.role}`,
    `banned:           ${user.banned}`,
    `banReason:        ${user.banReason ?? "-"}`,
    `banExpires:       ${formatDate(user.banExpires)}`,
    `creationDate:     ${formatDate(user.creationDate)}`,
    `updatedOn:        ${formatDate(user.updatedOn)}`,
  ];
  return lines.join("\n");
}

export function formatUserList(users: UserRecord[]): string {
  if (users.length === 0) return "No users found.";
  return users.map(formatUserLine).join("\n");
}

export function formatSessionLine(session: SessionRecord): string {
  return [
    session.id,
    session.ipAddress ?? "-",
    session.userAgent ?? "-",
    formatDate(session.creationDate),
    formatDate(session.expiresAt),
    session.impersonatedBy ? `impersonated-by:${session.impersonatedBy}` : "",
  ]
    .filter(Boolean)
    .join("\t");
}

export function formatSessionList(sessions: SessionRecord[]): string {
  if (sessions.length === 0) return "No sessions found.";
  return sessions.map(formatSessionLine).join("\n");
}

export function formatPasskeyLine(passkey: PasskeyRecord): string {
  return [
    passkey.id,
    passkey.name ?? "-",
    passkey.deviceType,
    passkey.backedUp ? "backed-up" : "not-backed-up",
    formatDate(passkey.creationDate),
  ].join("\t");
}

export function formatPasskeyList(passkeys: PasskeyRecord[]): string {
  if (passkeys.length === 0) return "No passkeys found.";
  return passkeys.map(formatPasskeyLine).join("\n");
}

export function formatAuditResult(result: AuthPreflightResult): string {
  const lines = [
    `users:         ${result.users}`,
    `activeUsers:   ${result.activeUsers}`,
    `activeAdmins:  ${result.activeAdmins}`,
  ];
  if (result.issues.length > 0) {
    lines.push("issues:");
    for (const issue of result.issues) lines.push(`  - ${issue}`);
  } else {
    lines.push("issues:        none");
  }
  return lines.join("\n");
}

/** Deterministic JSON output for `--json`, without trailing whitespace. */
export function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
