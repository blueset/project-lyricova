import type { Router } from "express";

/**
 * Restores the numeric-only route matching that Express 4 expressed inline as
 * `:param(\\d+)`. Express 5's path-to-regexp v8 dropped inline regex, so we
 * strip the regex from the path and register a `router.param` validator that
 * only lets digit values match — falling through to the next route (and
 * ultimately a 404) otherwise, exactly as the old regex did.
 */
export function requireNumericParams(router: Router, ...names: string[]): void {
  for (const name of names) {
    router.param(name, (_req, _res, next, value) => {
      if (/^\d+$/.test(String(value))) return next();
      // Non-numeric: skip this route so a sibling route (or the 404 handler)
      // can handle it, mirroring the Express 4 `(\\d+)` non-match behaviour.
      next("route");
    });
  }
}
