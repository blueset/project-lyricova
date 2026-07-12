import { describe, expect, it } from "vitest";
import { hashPassword, isArgon2idHash, verifyPassword } from "./password.js";

describe("auth password hashing", () => {
  it("hashes new passwords with Argon2id", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(isArgon2idHash(hash)).toBe(true);
    await expect(
      verifyPassword({
        hash,
        password: "correct horse battery staple",
      }),
    ).resolves.toBe(true);
    await expect(
      verifyPassword({ hash, password: "incorrect password" }),
    ).resolves.toBe(false);
  });

  it("rejects legacy and unrecognized password hashes", async () => {
    await expect(
      verifyPassword({
        hash: "$2b$10$legacy-bcrypt-hash",
        password: "legacy password",
      }),
    ).resolves.toBe(false);
    await expect(
      verifyPassword({ hash: "unrecognized", password: "password" }),
    ).resolves.toBe(false);
  });
});
