import { describe, expect, it } from "vitest";
import { isTrustedSessionRequest } from "./trustedOriginPolicy.js";

const trustedOrigins = new Set([
  "https://lyricova.1a23.studio",
  "https://jukebox.1a23.studio",
]);

describe("authenticated request origin policy", () => {
  it("allows anonymous and safe requests", () => {
    expect(
      isTrustedSessionRequest({
        method: "POST",
        authenticated: false,
        origin: undefined,
        fetchSite: undefined,
        trustedOrigins,
      }),
    ).toBe(true);
    expect(
      isTrustedSessionRequest({
        method: "GET",
        authenticated: true,
        origin: undefined,
        fetchSite: "cross-site",
        trustedOrigins,
      }),
    ).toBe(true);
  });

  it("allows authenticated mutations only from an exact same origin", () => {
    expect(
      isTrustedSessionRequest({
        method: "POST",
        authenticated: true,
        origin: "https://lyricova.1a23.studio",
        fetchSite: "same-origin",
        trustedOrigins,
      }),
    ).toBe(true);
    expect(
      isTrustedSessionRequest({
        method: "POST",
        authenticated: true,
        origin: "https://other.1a23.studio",
        fetchSite: "same-site",
        trustedOrigins,
      }),
    ).toBe(false);
    expect(
      isTrustedSessionRequest({
        method: "PATCH",
        authenticated: true,
        origin: undefined,
        fetchSite: undefined,
        trustedOrigins,
      }),
    ).toBe(false);
  });
});
