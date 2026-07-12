const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isTrustedSessionRequest({
  method,
  authenticated,
  origin,
  fetchSite,
  trustedOrigins,
}: {
  method: string;
  authenticated: boolean;
  origin: string | undefined;
  fetchSite: string | undefined;
  trustedOrigins: ReadonlySet<string>;
}): boolean {
  if (!authenticated || SAFE_METHODS.has(method)) return true;
  if (!origin || !trustedOrigins.has(origin)) return false;
  return !fetchSite || fetchSite === "same-origin";
}
