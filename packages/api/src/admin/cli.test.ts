import {
  CliError,
  parseArgv,
  resolveIdentifier,
  type ParsedCommand,
} from "./cli.js";

/**
 * These tests cover argv parsing/validation only (pure functions with no
 * DB/network access). Command *execution* (`execute()`/`runCli()`) delegates
 * every write to `accountService`, which is exercised separately and
 * requires a live database, so it's intentionally out of scope here.
 */

describe("parseArgv", () => {
  it("parses `user add` with all required options", () => {
    const parsed = parseArgv([
      "user",
      "add",
      "--username",
      "BlueSet",
      "--email",
      "blueset@example.com",
      "--role",
      "admin",
      "--display-name",
      "Eana Hufwe",
    ]);
    expect(parsed).toEqual({
      command: "user-add",
      json: false,
      username: "BlueSet",
      displayUsername: undefined,
      email: "blueset@example.com",
      role: "admin",
      displayName: "Eana Hufwe",
      passwordStdin: false,
    });
  });

  it("parses `user add` with --password-stdin and --json", () => {
    const parsed = parseArgv([
      "user",
      "add",
      "--username",
      "guest1",
      "--email",
      "guest1@example.com",
      "--role",
      "guest",
      "--display-name",
      "Guest One",
      "--password-stdin",
      "--json",
    ]) as Extract<ParsedCommand, { command: "user-add" }>;
    expect(parsed.passwordStdin).toBe(true);
    expect(parsed.json).toBe(true);
  });

  it("rejects `user add` missing a required option", () => {
    expect(() =>
      parseArgv([
        "user",
        "add",
        "--email",
        "blueset@example.com",
        "--role",
        "admin",
        "--display-name",
        "Eana Hufwe",
      ]),
    ).toThrow(/--username/);
  });

  it("rejects an unknown top-level command", () => {
    expect(() => parseArgv(["frobnicate"])).toThrow(CliError);
  });

  it("rejects an unknown user subcommand", () => {
    expect(() => parseArgv(["user", "delete"])).toThrow(/subcommand/);
  });

  it("returns help when invoked with no arguments", () => {
    expect(parseArgv([])).toEqual({ command: "help", topic: undefined });
  });

  it("returns help for -h/--help", () => {
    expect(parseArgv(["--help"])).toEqual({ command: "help", topic: undefined });
    expect(parseArgv(["-h", "user"])).toEqual({ command: "help", topic: "user" });
  });

  it("parses `user update` with --id and a role change", () => {
    const parsed = parseArgv([
      "user",
      "update",
      "--id",
      "42",
      "--role",
      "guest",
    ]);
    expect(parsed).toMatchObject({
      command: "user-update",
      identifier: { id: 42 },
      role: "guest",
    });
  });

  it("rejects `user update` with both --username and --id", () => {
    expect(() =>
      parseArgv(["user", "update", "--username", "x", "--id", "1", "--role", "guest"]),
    ).toThrow(/only one of/);
  });

  it("rejects `user update` with neither --username nor --id", () => {
    expect(() => parseArgv(["user", "update", "--role", "guest"])).toThrow(
      /Specify --username or --id/,
    );
  });

  it("rejects a non-numeric --id", () => {
    expect(() => parseArgv(["user", "enable", "--id", "abc"])).toThrow(
      /positive integer/,
    );
  });

  it("parses `user list` filters", () => {
    const parsed = parseArgv([
      "user",
      "list",
      "--role",
      "admin",
      "--include-disabled",
      "--include-deleted",
      "--json",
    ]);
    expect(parsed).toEqual({
      command: "user-list",
      json: true,
      role: "admin",
      includeDisabled: true,
      includeDeleted: true,
    });
  });

  it("parses `user disable` with a reason", () => {
    const parsed = parseArgv([
      "user",
      "disable",
      "--username",
      "guest1",
      "--reason",
      "left the team",
    ]);
    expect(parsed).toMatchObject({
      command: "user-disable",
      identifier: { username: "guest1" },
      reason: "left the team",
    });
  });

  it("parses `user sessions list`", () => {
    const parsed = parseArgv(["user", "sessions", "list", "--username", "a"]);
    expect(parsed).toEqual({
      command: "user-sessions-list",
      json: false,
      identifier: { username: "a", id: undefined },
    });
  });

  it("requires --session-id or --all for `user sessions revoke`", () => {
    expect(() =>
      parseArgv(["user", "sessions", "revoke", "--username", "a"]),
    ).toThrow(/--session-id|--all/);
  });

  it("rejects combining --session-id and --all", () => {
    expect(() =>
      parseArgv([
        "user",
        "sessions",
        "revoke",
        "--username",
        "a",
        "--session-id",
        "abc",
        "--all",
      ]),
    ).toThrow(/not both/);
  });

  it("parses `user sessions revoke --all --yes`", () => {
    const parsed = parseArgv([
      "user",
      "sessions",
      "revoke",
      "--username",
      "a",
      "--all",
      "--yes",
    ]);
    expect(parsed).toMatchObject({
      command: "user-sessions-revoke",
      all: true,
      yes: true,
    });
  });

  it("parses `user passkeys revoke --passkey-id`", () => {
    const parsed = parseArgv([
      "user",
      "passkeys",
      "revoke",
      "--id",
      "7",
      "--passkey-id",
      "pk-1",
    ]);
    expect(parsed).toMatchObject({
      command: "user-passkeys-revoke",
      identifier: { id: 7 },
      passkeyId: "pk-1",
      all: false,
    });
  });

  it("requires --passkey-id or --all for `user passkeys revoke`", () => {
    expect(() =>
      parseArgv(["user", "passkeys", "revoke", "--id", "7"]),
    ).toThrow(/--passkey-id|--all/);
  });

  it("parses `auth audit`", () => {
    expect(parseArgv(["auth", "audit"])).toEqual({
      command: "auth-audit",
      json: false,
    });
  });

  it("rejects an unknown auth subcommand", () => {
    expect(() => parseArgv(["auth", "migrate"])).toThrow(/subcommand/);
  });
});

describe("resolveIdentifier", () => {
  it("prefers id when both are notionally present", () => {
    expect(resolveIdentifier({ id: 5, username: "ignored" })).toEqual({
      id: 5,
    });
  });

  it("falls back to username", () => {
    expect(resolveIdentifier({ username: "blueset" })).toEqual({
      username: "blueset",
    });
  });
});
