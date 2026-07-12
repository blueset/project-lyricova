import type { Request, Response, NextFunction } from "express";

/**
 * @openapi
 * components:
 *   responses:
 *     Unauthorized:
 *       description: Unauthorized access
 *       content:
 *         text/plain:
 *           schema:
 *             const: "Unauthorized"
 */
export function adminOnlyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    res.sendStatus(401);
    return;
  }
  if (req.auth.user.role !== "admin") {
    res.sendStatus(403);
    return;
  }
  next();
}
