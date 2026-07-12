import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import {
  AccountServiceError,
  addUser,
  auditAuthMigration,
  disableUser,
  enableUser,
  listPasskeys,
  listSessions,
  listUsers,
  resetPassword,
  revokePasskeys,
  revokeSessions,
  updateUser,
  type Role,
  type UserIdentifier,
} from "../auth/accountService.js";
import {
  formatAuditResult,
  formatPasskeyList,
  formatSessionList,
  formatUserDetails,
  formatUserList,
  toJson,
} from "./format.js";
import {
  PasswordInputError,
  promptNewPassword,
  readPasswordFromStdin,
  type TtyLike,
} from "./passwordInput.js";

/**
 * `lyricova-admin` is a trusted, local-only DB tool (not a remote API
 * client): it talks to MySQL directly through `accountService` and is meant
 * to be run on the same host/operator that owns the database credentials.
 */

export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export interface CliIO {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  stdin: TtyLike;
}

export function defaultIo(): CliIO {
  return {
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
    stdin: process.stdin,
  };
}

export interface IdentifierArg {
  id?: number;
  username?: string;
}

export type ParsedCommand =
  | { command: "help"; topic?: string }
  | {
      command: "user-add";
      json: boolean;
      username: string;
      displayUsername?: string;
      email: string;
      role: string;
      displayName: string;
      passwordStdin: boolean;
    }
  | {
      command: "user-update";
      json: boolean;
      identifier: IdentifierArg;
      newUsername?: string;
      newDisplayUsername?: string;
      email?: string;
      role?: string;
      displayName?: string;
    }
  | {
      command: "user-list";
      json: boolean;
      role?: string;
      includeDisabled: boolean;
      includeDeleted: boolean;
    }
  | {
      command: "user-disable";
      json: boolean;
      identifier: IdentifierArg;
      reason?: string;
    }
  | { command: "user-enable"; json: boolean; identifier: IdentifierArg }
  | {
      command: "user-reset-password";
      json: boolean;
      identifier: IdentifierArg;
      passwordStdin: boolean;
    }
  | { command: "user-sessions-list"; json: boolean; identifier: IdentifierArg }
  | {
      command: "user-sessions-revoke";
      json: boolean;
      identifier: IdentifierArg;
      sessionId?: string;
      all: boolean;
      yes: boolean;
    }
  | { command: "user-passkeys-list"; json: boolean; identifier: IdentifierArg }
  | {
      command: "user-passkeys-revoke";
      json: boolean;
      identifier: IdentifierArg;
      passkeyId?: string;
      all: boolean;
      yes: boolean;
    }
  | { command: "auth-audit"; json: boolean };

type OptionValue = string | boolean | undefined;
type OptionValues = Record<string, OptionValue>;
type OptionsSchema = NonNullable<Parameters<typeof parseArgs>[0]>["options"];

function safeParseArgs(
  argv: string[],
  options: OptionsSchema,
  usage: string,
): OptionValues {
  try {
    const { values } = parseArgs({
      args: argv,
      options,
      allowPositionals: false,
      strict: true,
    });
    return values as OptionValues;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(`Invalid arguments for "${usage}": ${message}`);
  }
}

function requireString(value: OptionValue, flag: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CliError(`Missing required option ${flag}.`);
  }
  return value;
}

function optionalString(value: OptionValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseIdentifier(values: OptionValues): IdentifierArg {
  const username = optionalString(values.username);
  const idRaw = optionalString(values.id);
  if (username && idRaw) {
    throw new CliError("Specify only one of --username or --id.");
  }
  if (!username && !idRaw) {
    throw new CliError("Specify --username or --id.");
  }
  if (idRaw !== undefined) {
    const id = Number(idRaw);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new CliError("--id must be a positive integer.");
    }
    return { id };
  }
  return { username };
}

export function resolveIdentifier(identifier: IdentifierArg): UserIdentifier {
  return identifier.id !== undefined
    ? { id: identifier.id }
    : { username: identifier.username! };
}

const IDENTIFIER_OPTIONS: OptionsSchema = {
  username: { type: "string" },
  id: { type: "string" },
  json: { type: "boolean", default: false },
};

function parseUserAdd(argv: string[]): ParsedCommand {
  const values = safeParseArgs(
    argv,
    {
      username: { type: "string" },
      "display-username": { type: "string" },
      email: { type: "string" },
      role: { type: "string" },
      "display-name": { type: "string" },
      "password-stdin": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
    "user add",
  );
  return {
    command: "user-add",
    json: Boolean(values.json),
    username: requireString(values.username, "--username"),
    displayUsername: optionalString(values["display-username"]),
    email: requireString(values.email, "--email"),
    role: requireString(values.role, "--role"),
    displayName: requireString(values["display-name"], "--display-name"),
    passwordStdin: Boolean(values["password-stdin"]),
  };
}

function parseUserUpdate(argv: string[]): ParsedCommand {
  const values = safeParseArgs(
    argv,
    {
      ...IDENTIFIER_OPTIONS,
      "new-username": { type: "string" },
      "new-display-username": { type: "string" },
      email: { type: "string" },
      role: { type: "string" },
      "display-name": { type: "string" },
    },
    "user update",
  );
  return {
    command: "user-update",
    json: Boolean(values.json),
    identifier: parseIdentifier(values),
    newUsername: optionalString(values["new-username"]),
    newDisplayUsername: optionalString(values["new-display-username"]),
    email: optionalString(values.email),
    role: optionalString(values.role),
    displayName: optionalString(values["display-name"]),
  };
}

function parseUserList(argv: string[]): ParsedCommand {
  const values = safeParseArgs(
    argv,
    {
      role: { type: "string" },
      "include-disabled": { type: "boolean", default: false },
      "include-deleted": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
    "user list",
  );
  return {
    command: "user-list",
    json: Boolean(values.json),
    role: optionalString(values.role),
    includeDisabled: Boolean(values["include-disabled"]),
    includeDeleted: Boolean(values["include-deleted"]),
  };
}

function parseUserDisable(argv: string[]): ParsedCommand {
  const values = safeParseArgs(
    argv,
    { ...IDENTIFIER_OPTIONS, reason: { type: "string" } },
    "user disable",
  );
  return {
    command: "user-disable",
    json: Boolean(values.json),
    identifier: parseIdentifier(values),
    reason: optionalString(values.reason),
  };
}

function parseUserEnable(argv: string[]): ParsedCommand {
  const values = safeParseArgs(argv, IDENTIFIER_OPTIONS, "user enable");
  return {
    command: "user-enable",
    json: Boolean(values.json),
    identifier: parseIdentifier(values),
  };
}

function parseUserResetPassword(argv: string[]): ParsedCommand {
  const values = safeParseArgs(
    argv,
    {
      ...IDENTIFIER_OPTIONS,
      "password-stdin": { type: "boolean", default: false },
    },
    "user reset-password",
  );
  return {
    command: "user-reset-password",
    json: Boolean(values.json),
    identifier: parseIdentifier(values),
    passwordStdin: Boolean(values["password-stdin"]),
  };
}

function parseUserSessions(argv: string[]): ParsedCommand {
  const [action, ...rest] = argv;
  if (!action) {
    throw new CliError('Missing "user sessions" subcommand: "list" or "revoke".');
  }
  if (action === "list") {
    const values = safeParseArgs(
      rest,
      IDENTIFIER_OPTIONS,
      "user sessions list",
    );
    return {
      command: "user-sessions-list",
      json: Boolean(values.json),
      identifier: parseIdentifier(values),
    };
  }
  if (action === "revoke") {
    const values = safeParseArgs(
      rest,
      {
        ...IDENTIFIER_OPTIONS,
        "session-id": { type: "string" },
        all: { type: "boolean", default: false },
        yes: { type: "boolean", default: false },
      },
      "user sessions revoke",
    );
    const sessionId = optionalString(values["session-id"]);
    const all = Boolean(values.all);
    if (!sessionId && !all) {
      throw new CliError("Specify --session-id <id> or --all.");
    }
    if (sessionId && all) {
      throw new CliError("Specify either --session-id or --all, not both.");
    }
    return {
      command: "user-sessions-revoke",
      json: Boolean(values.json),
      identifier: parseIdentifier(values),
      sessionId,
      all,
      yes: Boolean(values.yes),
    };
  }
  throw new CliError(`Unknown "user sessions" subcommand "${action}".`);
}

function parseUserPasskeys(argv: string[]): ParsedCommand {
  const [action, ...rest] = argv;
  if (!action) {
    throw new CliError('Missing "user passkeys" subcommand: "list" or "revoke".');
  }
  if (action === "list") {
    const values = safeParseArgs(
      rest,
      IDENTIFIER_OPTIONS,
      "user passkeys list",
    );
    return {
      command: "user-passkeys-list",
      json: Boolean(values.json),
      identifier: parseIdentifier(values),
    };
  }
  if (action === "revoke") {
    const values = safeParseArgs(
      rest,
      {
        ...IDENTIFIER_OPTIONS,
        "passkey-id": { type: "string" },
        all: { type: "boolean", default: false },
        yes: { type: "boolean", default: false },
      },
      "user passkeys revoke",
    );
    const passkeyId = optionalString(values["passkey-id"]);
    const all = Boolean(values.all);
    if (!passkeyId && !all) {
      throw new CliError("Specify --passkey-id <id> or --all.");
    }
    if (passkeyId && all) {
      throw new CliError("Specify either --passkey-id or --all, not both.");
    }
    return {
      command: "user-passkeys-revoke",
      json: Boolean(values.json),
      identifier: parseIdentifier(values),
      passkeyId,
      all,
      yes: Boolean(values.yes),
    };
  }
  throw new CliError(`Unknown "user passkeys" subcommand "${action}".`);
}

function parseUserCommand(argv: string[]): ParsedCommand {
  const [action, ...rest] = argv;
  if (!action || action === "-h" || action === "--help") {
    return { command: "help", topic: "user" };
  }
  switch (action) {
    case "add":
      return parseUserAdd(rest);
    case "update":
      return parseUserUpdate(rest);
    case "list":
      return parseUserList(rest);
    case "disable":
      return parseUserDisable(rest);
    case "enable":
      return parseUserEnable(rest);
    case "reset-password":
      return parseUserResetPassword(rest);
    case "sessions":
      return parseUserSessions(rest);
    case "passkeys":
      return parseUserPasskeys(rest);
    default:
      throw new CliError(
        `Unknown "user" subcommand "${action}". Run "lyricova-admin user --help" for usage.`,
      );
  }
}

function parseAuthCommand(argv: string[]): ParsedCommand {
  const [action, ...rest] = argv;
  if (!action || action === "-h" || action === "--help") {
    return { command: "help", topic: "auth" };
  }
  if (action === "audit") {
    const values = safeParseArgs(
      rest,
      { json: { type: "boolean", default: false } },
      "auth audit",
    );
    return { command: "auth-audit", json: Boolean(values.json) };
  }
  throw new CliError(`Unknown "auth" subcommand "${action}".`);
}

export function parseArgv(argv: string[]): ParsedCommand {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { command: "help", topic: argv[0] ? argv[1] : undefined };
  }
  const [resource, ...rest] = argv;
  switch (resource) {
    case "user":
      return parseUserCommand(rest);
    case "auth":
      return parseAuthCommand(rest);
    default:
      throw new CliError(
        `Unknown command "${resource}". Run "lyricova-admin --help" for usage.`,
      );
  }
}

const HELP_TEXT = `Usage: lyricova-admin <command> [options]

lyricova-admin is a local, trusted database tool: it must run with direct
access to the same MySQL database and environment configuration as the API
server. It is not a remote API client.

Commands:
  user add --username <name> --email <email> --role admin|guest
           --display-name <name> [--display-username <name>] [--password-stdin]
      Create a user. Without --password-stdin, prompts securely on a TTY.

  user update (--username <name> | --id <n>) [--new-username <name>]
              [--new-display-username <name>] [--email <email>]
              [--role admin|guest] [--display-name <name>]
      Update identity fields and/or role.

  user list [--role admin|guest] [--include-disabled] [--include-deleted]
      List users (active, non-disabled by default).

  user disable (--username <name> | --id <n>) [--reason <text>]
      Ban a user and revoke all of their sessions.

  user enable (--username <name> | --id <n>)
      Clear a user's ban state.

  user reset-password (--username <name> | --id <n>) [--password-stdin]
      Set a new password and revoke all of the user's sessions.

  user sessions list (--username <name> | --id <n>)
  user sessions revoke (--username <name> | --id <n>) (--session-id <id> | --all) [--yes]

  user passkeys list (--username <name> | --id <n>)
  user passkeys revoke (--username <name> | --id <n>) (--passkey-id <id> | --all) [--yes]

  auth audit
      Reuse the auth preflight inspector to report legacy-data issues.

Global options:
  --json          Emit machine-readable JSON instead of text
  -h, --help      Show this help
`;

async function acquirePassword(
  io: CliIO,
  passwordStdin: boolean,
): Promise<string> {
  if (passwordStdin) {
    const password = await readPasswordFromStdin(io.stdin);
    return password;
  }
  return promptNewPassword(io.stdin, process.stdout);
}

async function confirmDestructive(
  io: CliIO,
  all: boolean,
  yes: boolean,
  description: string,
): Promise<void> {
  if (!all || yes) return;
  if (!io.stdin.isTTY) {
    throw new CliError(
      `Refusing to ${description} without confirmation. Re-run with --yes.`,
    );
  }
  const rl = createInterface({ input: io.stdin, output: process.stdout });
  let answer: string;
  try {
    answer = await rl.question(`${description} Are you sure? [y/N] `);
  } finally {
    rl.close();
  }
  if (answer.trim().toLowerCase() !== "y") {
    throw new CliError("Aborted.");
  }
}

function assertValidRoleOption(role: string): asserts role is Role {
  if (role !== "admin" && role !== "guest") {
    throw new CliError(`Role must be "admin" or "guest", got "${role}".`);
  }
}

export async function execute(
  parsed: ParsedCommand,
  io: CliIO,
): Promise<void> {
  switch (parsed.command) {
    case "help": {
      io.stdout(HELP_TEXT);
      return;
    }
    case "user-add": {
      assertValidRoleOption(parsed.role);
      const password = await acquirePassword(io, parsed.passwordStdin);
      const user = await addUser({
        username: parsed.username,
        displayUsername: parsed.displayUsername,
        email: parsed.email,
        role: parsed.role,
        displayName: parsed.displayName,
        password,
      });
      io.stdout(
        parsed.json ? toJson(user) : `User created.\n${formatUserDetails(user)}`,
      );
      return;
    }
    case "user-update": {
      if (parsed.role !== undefined) assertValidRoleOption(parsed.role);
      const user = await updateUser(resolveIdentifier(parsed.identifier), {
        newUsername: parsed.newUsername,
        newDisplayUsername: parsed.newDisplayUsername,
        email: parsed.email,
        role: parsed.role as Role | undefined,
        displayName: parsed.displayName,
      });
      io.stdout(
        parsed.json ? toJson(user) : `User updated.\n${formatUserDetails(user)}`,
      );
      return;
    }
    case "user-list": {
      if (parsed.role !== undefined) assertValidRoleOption(parsed.role);
      const users = await listUsers({
        role: parsed.role as Role | undefined,
        includeDisabled: parsed.includeDisabled,
        includeDeleted: parsed.includeDeleted,
      });
      io.stdout(parsed.json ? toJson(users) : formatUserList(users));
      return;
    }
    case "user-disable": {
      const user = await disableUser(resolveIdentifier(parsed.identifier), {
        reason: parsed.reason,
      });
      io.stdout(
        parsed.json
          ? toJson(user)
          : `User disabled and sessions revoked.\n${formatUserDetails(user)}`,
      );
      return;
    }
    case "user-enable": {
      const user = await enableUser(resolveIdentifier(parsed.identifier));
      io.stdout(
        parsed.json ? toJson(user) : `User enabled.\n${formatUserDetails(user)}`,
      );
      return;
    }
    case "user-reset-password": {
      const password = await acquirePassword(io, parsed.passwordStdin);
      const user = await resetPassword(
        resolveIdentifier(parsed.identifier),
        password,
      );
      io.stdout(
        parsed.json
          ? toJson(user)
          : `Password reset and sessions revoked.\n${formatUserDetails(user)}`,
      );
      return;
    }
    case "user-sessions-list": {
      const sessions = await listSessions(resolveIdentifier(parsed.identifier));
      io.stdout(parsed.json ? toJson(sessions) : formatSessionList(sessions));
      return;
    }
    case "user-sessions-revoke": {
      await confirmDestructive(
        io,
        parsed.all,
        parsed.yes,
        "This will revoke all sessions for the user.",
      );
      const result = await revokeSessions(
        resolveIdentifier(parsed.identifier),
        { sessionId: parsed.sessionId, all: parsed.all },
      );
      io.stdout(
        parsed.json
          ? toJson(result)
          : `Revoked ${result.revoked} session(s).`,
      );
      return;
    }
    case "user-passkeys-list": {
      const passkeys = await listPasskeys(resolveIdentifier(parsed.identifier));
      io.stdout(parsed.json ? toJson(passkeys) : formatPasskeyList(passkeys));
      return;
    }
    case "user-passkeys-revoke": {
      await confirmDestructive(
        io,
        parsed.all,
        parsed.yes,
        "This will revoke all passkeys for the user.",
      );
      const result = await revokePasskeys(
        resolveIdentifier(parsed.identifier),
        { passkeyId: parsed.passkeyId, all: parsed.all },
      );
      io.stdout(
        parsed.json
          ? toJson(result)
          : `Revoked ${result.revoked} passkey(s).`,
      );
      return;
    }
    case "auth-audit": {
      const result = await auditAuthMigration();
      io.stdout(parsed.json ? toJson(result) : formatAuditResult(result));
      if (result.issues.length > 0) {
        throw new CliError("Auth data has unresolved issues.", 1);
      }
      return;
    }
  }
}

export async function runCli(
  argv: string[],
  io: CliIO = defaultIo(),
): Promise<number> {
  try {
    const parsed = parseArgv(argv);
    await execute(parsed, io);
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      io.stderr(`Error: ${error.message}`);
      return error.exitCode;
    }
    if (error instanceof AccountServiceError) {
      io.stderr(`Error: ${error.message}`);
      return 1;
    }
    if (error instanceof PasswordInputError) {
      io.stderr(`Error: ${error.message}`);
      return 1;
    }
    io.stderr(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}
