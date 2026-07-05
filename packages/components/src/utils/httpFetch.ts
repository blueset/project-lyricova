export interface FetchJsonResult<T> {
  status: number;
  statusText: string;
  data: T;
}

/**
 * Minimal `axios.get` replacement over the native WHATWG `fetch`. Appends
 * `params` as a query string and resolves to `{ status, statusText, data }`.
 *
 * Unlike axios, `fetch` does not reject on non-2xx responses; callers gate on
 * `status === 200` before reading `data`, so on a non-2xx response `data` is
 * left `undefined`.
 */
export async function fetchJson<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<FetchJsonResult<T>> {
  const u = new URL(url);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        u.searchParams.set(key, String(value));
      }
    }
  }
  const res = await fetch(u);
  const data = (
    res.ok ? await res.json().catch(() => undefined) : undefined
  ) as T;
  return { status: res.status, statusText: res.statusText, data };
}
