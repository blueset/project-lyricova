import type {
  PasskeyRecord,
  SessionRecord,
  UserRecord,
} from "../auth/accountService.js";
import {
  formatAuditResult,
  formatPasskeyList,
  formatSessionList,
  formatUserDetails,
  formatUserList,
  toJson,
} from "./format.js";

const baseUser: UserRecord = {
  id: 1,
  username: "blueset",
  displayUsername: "BlueSet",
  displayName: "Eana Hufwe",
  email: "blueset@example.com",
  emailVerified: true,
  role: "admin",
  banned: false,
  banReason: null,
  banExpires: null,
  creationDate: new Date("2024-01-01T00:00:00.000Z"),
  updatedOn: new Date("2024-01-02T00:00:00.000Z"),
  deletionDate: null,
};

describe("formatUserList / formatUserDetails", () => {
  it("reports an empty list clearly", () => {
    expect(formatUserList([])).toBe("No users found.");
  });

  it("renders one line per user with key fields", () => {
    const output = formatUserList([baseUser]);
    expect(output).toContain("#1");
    expect(output).toContain("BlueSet");
    expect(output).toContain("<blueset@example.com>");
    expect(output).toContain("admin");
    expect(output).toContain("active");
  });

  it("marks banned users as disabled", () => {
    const output = formatUserList([
      { ...baseUser, banned: true, banReason: "left the team" },
    ]);
    expect(output).toContain("disabled");
  });

  it("never includes a password/hash field in details output", () => {
    const output = formatUserDetails(baseUser);
    expect(output.toLowerCase()).not.toContain("password");
    expect(output.toLowerCase()).not.toContain("hash");
  });

  it("renders all identity fields in details output", () => {
    const output = formatUserDetails(baseUser);
    expect(output).toContain("username:         blueset");
    expect(output).toContain("displayUsername:  BlueSet");
    expect(output).toContain("role:             admin");
  });
});

describe("formatSessionList", () => {
  const session: SessionRecord = {
    id: "session-1",
    ipAddress: "127.0.0.1",
    userAgent: "curl/8",
    creationDate: new Date("2024-01-01T00:00:00.000Z"),
    updatedOn: new Date("2024-01-01T00:00:00.000Z"),
    expiresAt: new Date("2024-01-08T00:00:00.000Z"),
    impersonatedBy: null,
  };

  it("reports no sessions found", () => {
    expect(formatSessionList([])).toBe("No sessions found.");
  });

  it("renders session id, ip, and user agent", () => {
    const output = formatSessionList([session]);
    expect(output).toContain("session-1");
    expect(output).toContain("127.0.0.1");
    expect(output).toContain("curl/8");
  });

  it("never includes a token field", () => {
    const output = formatSessionList([session]);
    expect(output.toLowerCase()).not.toContain("token");
  });
});

describe("formatPasskeyList", () => {
  const passkey: PasskeyRecord = {
    id: "pk-1",
    name: "YubiKey",
    deviceType: "cross-platform",
    backedUp: false,
    creationDate: new Date("2024-01-01T00:00:00.000Z"),
    aaguid: null,
  };

  it("reports no passkeys found", () => {
    expect(formatPasskeyList([])).toBe("No passkeys found.");
  });

  it("renders passkey id and name", () => {
    const output = formatPasskeyList([passkey]);
    expect(output).toContain("pk-1");
    expect(output).toContain("YubiKey");
    expect(output).toContain("not-backed-up");
  });
});

describe("formatAuditResult", () => {
  it("summarizes counts and lists issues", () => {
    const output = formatAuditResult({
      users: 3,
      activeUsers: 2,
      activeAdmins: 1,
      issues: ["User 2 has no email address."],
    });
    expect(output).toContain("users:         3");
    expect(output).toContain("- User 2 has no email address.");
  });

  it("reports no issues clearly", () => {
    const output = formatAuditResult({
      users: 1,
      activeUsers: 1,
      activeAdmins: 1,
      issues: [],
    });
    expect(output).toContain("issues:        none");
  });
});

describe("toJson", () => {
  it("pretty-prints with 2-space indentation", () => {
    expect(toJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});
