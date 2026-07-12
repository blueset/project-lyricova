import type { NextFunction, Request, RequestHandler, Response } from "express";
import { authConfig } from "./config.js";
import { isTrustedSessionRequest } from "./trustedOriginPolicy.js";

const TRUSTED_ORIGINS = new Set(authConfig.trustedOrigins);

export const requireTrustedSessionOrigin: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const trusted = isTrustedSessionRequest({
    method: req.method,
    authenticated: Boolean(req.auth),
    origin: req.get("origin"),
    fetchSite: req.get("sec-fetch-site"),
    trustedOrigins: TRUSTED_ORIGINS,
  });
  if (trusted) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (!origin || !TRUSTED_ORIGINS.has(origin)) {
    res.status(403).send("Untrusted request origin");
    return;
  }

  res.status(403).send("Cross-origin authenticated request rejected");
};
