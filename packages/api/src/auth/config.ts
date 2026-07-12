import { BETTER_AUTH_SECRET, ENVIRONMENT } from "../utils/secret.js";

const production = ENVIRONMENT === "production";
if (!BETTER_AUTH_SECRET) {
  throw new Error(
    "No Better Auth secret. Set BETTER_AUTH_SECRET environment variable.",
  );
}

function csvEnvironment(name: string, fallback: string[]): string[] {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parsed.length === 0) {
    throw new Error(`${name} must contain at least one value`);
  }
  return parsed;
}

function versionedSecrets(): Array<{ version: number; value: string }> | null {
  const value = process.env["BETTER_AUTH_SECRETS"];
  if (!value) return null;

  const secrets = value.split(",").map((entry) => {
    const separator = entry.indexOf(":");
    const version = Number(entry.slice(0, separator));
    const secret = entry.slice(separator + 1);
    if (
      separator < 1 ||
      !Number.isSafeInteger(version) ||
      version < 1 ||
      secret.length < 32
    ) {
      throw new Error(
        "BETTER_AUTH_SECRETS must use version:secret entries with 32+ character secrets",
      );
    }
    return { version, value: secret };
  });
  if (new Set(secrets.map(({ version }) => version)).size !== secrets.length) {
    throw new Error("BETTER_AUTH_SECRETS contains duplicate versions");
  }
  return secrets.sort((a, b) => b.version - a.version);
}

const webAuthnRpId =
  process.env["WEBAUTHN_RP_ID"] ?? (production ? "1a23.studio" : "localhost");

export const authConfig = {
  secret: BETTER_AUTH_SECRET,
  secrets: versionedSecrets(),
  production,
  allowedHosts: csvEnvironment(
    "AUTH_ALLOWED_HOSTS",
    production
      ? ["lyricova.1a23.studio", "jukebox.1a23.studio"]
      : ["localhost:8081", "localhost:8082"],
  ),
  trustedOrigins: csvEnvironment(
    "AUTH_TRUSTED_ORIGINS",
    production
      ? [
          "https://lyricova.1a23.studio",
          "https://jukebox.1a23.studio",
        ]
      : ["http://localhost:8081", "http://localhost:8082"],
  ),
  cookieDomain:
    process.env["AUTH_COOKIE_DOMAIN"] ??
    (webAuthnRpId === "1a23.studio" ? "1a23.studio" : null),
  webAuthnRpId,
  webAuthnOrigins: csvEnvironment(
    "WEBAUTHN_ORIGINS",
    production
      ? [
          "https://lyricova.1a23.studio",
          "https://jukebox.1a23.studio",
        ]
      : ["http://localhost:8081", "http://localhost:8082"],
  ),
} as const;
