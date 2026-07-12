import { getAuthenticatorName, type Passkey } from "@better-auth/passkey";

export function suggestPasskeyName(passkey: { aaguid?: Passkey["aaguid"] | null }): string {
  const aaguid = passkey.aaguid;
  return (typeof aaguid === "string" && getAuthenticatorName(aaguid)) || "Passkey";
}
