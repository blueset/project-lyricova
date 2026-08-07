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

export type UserIdentifier = { id: number } | { username: string };

/**
 * Lower-cases the username for lookups/uniqueness while preserving the
 * originally typed casing as `displayUsername`.
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
 * `activeAdminCount` must be gathered under a row lock by the caller.
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
