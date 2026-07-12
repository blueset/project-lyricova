import { describe, expect, it } from "vitest";
import { suggestPasskeyName } from "./passkey";

describe("suggestPasskeyName", () => {
  it("uses the authenticator display name for a known AAGUID", () => {
    expect(
      suggestPasskeyName({
        aaguid: "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4",
      }),
    ).toBe("Google Password Manager");
  });

  it("falls back to a generic passkey name", () => {
    expect(suggestPasskeyName({ aaguid: "unknown" })).toBe("Passkey");
    expect(suggestPasskeyName({ aaguid: undefined })).toBe("Passkey");
  });
});
