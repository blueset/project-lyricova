import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { User } from "../models/User";

export function adminOnlyMiddleware(req: Request, res: Response, next: NextFunction): void {
  console.log("Here enters adminOnly middleware");
  passport.authenticate("jwt", function (err: unknown, user: User | null) {
    console.log("Here enters passport JWT");
    if (err) { return next(err); }
    if (!user || user.role !== "admin") { return res.sendStatus(401); }
    if (err) { return next(err); }
    console.log("Here passes");
    return next();
  })(req, res, next);
}