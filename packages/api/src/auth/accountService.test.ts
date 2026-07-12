import {
  AccountServiceError,
  assertAdminGuard,
  assertValidPassword,
  assertValidRole,
  normalizeDisplayName,
  normalizeEmail,
  normalizeUsername,
} from "./accountService.js";

/**
 * These cover the pure validation/guard helpers only — accountService's
 * transactional read/write operations require a live MySQL database and are
 * intentionally left to manual/integration verification rather than a mocked
 * unit test, per the "no external test database" constraint.
 */

describe("normalizeUsername", () => {
  it("lower-cases the username while preserving the original as displayUsername", () => {
    expect(normalizeUsername("BlueSet")).toEqual({
      username: "blueset",
      displayUsername: "BlueSet",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeUsername("  Eana  ")).toEqual({
      username: "eana",
      displayUsername: "Eana",
    });
  });

  it("rejects an empty username", () => {
    expect(() => normalizeUsername("   ")).toThrow(AccountServiceError);
    try {
      normalizeUsername("");
    } catch (error) {
      expect(error).toBeInstanceOf(AccountServiceError);
      expect((error as AccountServiceError).code).toBe("INVALID_USERNAME");
    }
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases the email", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe(
      "person@example.com",
    );
  });

  it("rejects an empty email", () => {
    expect(() => normalizeEmail(" ")).toThrow(AccountServiceError);
  });
});

describe("normalizeDisplayName", () => {
  it("trims the display name", () => {
    expect(normalizeDisplayName("  Eana Hufwe  ")).toBe("Eana Hufwe");
  });

  it("rejects an empty display name", () => {
    expect(() => normalizeDisplayName("")).toThrow(AccountServiceError);
  });
});

describe("assertValidRole", () => {
  it("accepts admin and guest", () => {
    expect(() => assertValidRole("admin")).not.toThrow();
    expect(() => assertValidRole("guest")).not.toThrow();
  });

  it("rejects any other role", () => {
    expect(() => assertValidRole("superuser")).toThrow(AccountServiceError);
    try {
      assertValidRole("superuser");
    } catch (error) {
      expect((error as AccountServiceError).code).toBe("INVALID_ROLE");
    }
  });
});

describe("assertValidPassword", () => {
  it("accepts passwords within [12, 128] characters", () => {
    expect(() => assertValidPassword("a".repeat(12))).not.toThrow();
    expect(() => assertValidPassword("a".repeat(128))).not.toThrow();
  });

  it("rejects passwords shorter than 12 characters", () => {
    expect(() => assertValidPassword("a".repeat(11))).toThrow(
      AccountServiceError,
    );
  });

  it("rejects passwords longer than 128 characters", () => {
    expect(() => assertValidPassword("a".repeat(129))).toThrow(
      AccountServiceError,
    );
  });
});

describe("assertAdminGuard", () => {
  it("allows demoting/disabling a non-admin", () => {
    expect(() =>
      assertAdminGuard({
        isTargetCurrentlyActiveAdmin: false,
        activeAdminCount: 1,
        targetRemainsActiveAdmin: false,
      }),
    ).not.toThrow();
  });

  it("allows demoting/disabling an admin when others remain active admins", () => {
    expect(() =>
      assertAdminGuard({
        isTargetCurrentlyActiveAdmin: true,
        activeAdminCount: 2,
        targetRemainsActiveAdmin: false,
      }),
    ).not.toThrow();
  });

  it("allows an update that keeps the sole admin active", () => {
    expect(() =>
      assertAdminGuard({
        isTargetCurrentlyActiveAdmin: true,
        activeAdminCount: 1,
        targetRemainsActiveAdmin: true,
      }),
    ).not.toThrow();
  });

  it("refuses to strip admin/active status from the last active admin", () => {
    expect(() =>
      assertAdminGuard({
        isTargetCurrentlyActiveAdmin: true,
        activeAdminCount: 1,
        targetRemainsActiveAdmin: false,
      }),
    ).toThrow(AccountServiceError);
    try {
      assertAdminGuard({
        isTargetCurrentlyActiveAdmin: true,
        activeAdminCount: 1,
        targetRemainsActiveAdmin: false,
      });
    } catch (error) {
      expect((error as AccountServiceError).code).toBe("LAST_ADMIN");
    }
  });
});
