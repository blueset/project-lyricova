import { getAuthenticatorName, type Passkey } from "@better-auth/passkey";

export function suggestPasskeyName(passkey: Pick<Passkey, "aaguid">): string {
  return getAuthenticatorName(passkey.aaguid) ?? "Passkey";
}
