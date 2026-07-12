import type { NextFunction, Request, RequestHandler, Response } from "express";
import { resolveRequestAuth } from "./session.js";
import { isFreshSession } from "./freshSessionPolicy.js";

export const requireFreshSession: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requestAuth = await resolveRequestAuth(req.headers);
    if (!requestAuth) {
      res.status(401).json({
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      });
      return;
    }

    if (!isFreshSession(requestAuth.session.createdAt)) {
      res.status(403).json({
        code: "FRESH_SESSION_REQUIRED",
        message: "Sign in again before changing passkeys.",
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
