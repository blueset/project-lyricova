/**
 * Small helpers around the native WHATWG `fetch` used to replace axios/got.
 *
 * Unlike `fetch`, axios and got reject/throw on non-2xx responses; `getJson`
 * preserves that behaviour by throwing an {@link HttpError} so existing
 * `catch` blocks (e.g. handling 404s) keep working.
 */

/** Error thrown by {@link getJson} for a non-2xx response. */
export class HttpError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

function withParams(url: string, params?: Record<string, unknown>): string {
  if (!params) return url;
  const u = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      u.searchParams.set(key, String(value));
    }
  }
  return u.toString();
}

/** GET a JSON payload, throwing {@link HttpError} on a non-2xx response. */
export async function getJson<T>(
  url: string,
  params?: Record<string, unknown>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(withParams(url, params), init);
  if (!res.ok) {
    throw new HttpError(res.status, await res.text().catch(() => ""));
  }
  return (await res.json()) as T;
}

/**
 * GET a text payload, returning the status alongside the body. Does NOT throw
 * on non-2xx — callers that inspect `status` explicitly (e.g. HTML scrapers).
 */
export async function getText(
  url: string,
  params?: Record<string, unknown>,
  init?: RequestInit,
): Promise<{ status: number; data: string }> {
  const res = await fetch(withParams(url, params), init);
  return { status: res.status, data: await res.text() };
}
