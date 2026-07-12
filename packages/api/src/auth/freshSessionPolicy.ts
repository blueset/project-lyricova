const FRESH_SESSION_AGE_MS = 10 * 60 * 1000;

export function isFreshSession(
  createdAt: Date | string,
  now = Date.now(),
): boolean {
  const createdAtMs = new Date(createdAt).getTime();
  return (
    Number.isFinite(createdAtMs) &&
    createdAtMs <= now &&
    now - createdAtMs <= FRESH_SESSION_AGE_MS
  );
}
