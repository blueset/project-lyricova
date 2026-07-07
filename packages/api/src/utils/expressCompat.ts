import type { RequestHandler } from "express";

/**
 * Adapts connect-style middleware whose bundled `@types` still target Express 4
 * to Express 5's stricter `RequestHandler`. The mismatch is purely a lag in the
 * middleware packages' type definitions — they are runtime-compatible with
 * Express 5. Express detects error handlers by arity at runtime, so passing a
 * 4-argument error handler through here remains a valid `app.use` argument.
 */
export const compat = (handler: unknown): RequestHandler =>
  handler as RequestHandler;
