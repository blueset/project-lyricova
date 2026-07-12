import { describe, expect, it } from "vitest";
import { isFreshSession } from "./freshSessionPolicy.js";

describe("fresh session policy", () => {
  const now = new Date("2026-07-11T12:00:00Z").getTime();

  it("accepts sessions no older than ten minutes", () => {
    expect(isFreshSession(new Date(now - 10 * 60 * 1000), now)).toBe(true);
  });

  it("rejects stale, future, and invalid timestamps", () => {
    expect(isFreshSession(new Date(now - 10 * 60 * 1000 - 1), now)).toBe(
      false,
    );
    expect(isFreshSession(new Date(now + 1), now)).toBe(false);
    expect(isFreshSession("invalid", now)).toBe(false);
  });
});
