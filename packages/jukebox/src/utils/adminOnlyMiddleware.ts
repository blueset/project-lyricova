import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { User } from "lyricova-common/models/User";

export function adminOnlyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  passport.authenticate("jwt", function(err: unknown, user: User | null) {
    if (err) {
      return next(err);
    }
    if (!user || user.role !== "admin") {
      return res.sendStatus(401);
    }
    if (err) {
      return next(err);
    }
    return next();
  })(req, res, next);
}
