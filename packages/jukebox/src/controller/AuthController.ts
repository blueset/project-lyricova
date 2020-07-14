import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy, IVerifyOptions } from "passport-local";
import bcrypt from "bcryptjs";

export class AuthController {
  public router: Router;

  constructor() {

    passport.use(new LocalStrategy(async (username: string, password: string, done: (error: any, user?: any, options?: IVerifyOptions) => void) => {
      try {
        if (username === "blueset") {
          if (await (bcrypt.compare(password, "$2a$10$5gLVbNSA.Z0r.N9XWkLDFO8.W4.XvRpYTXnf7ihWSRva1tu.RFg6y"))) {
            return done(null, { username: "blueset", password: "password" });
          }
        }
        return done(null, false, { message: "Incorrect username & password." });
      } catch (err) {
        return done(err);
      }
    }));

    passport.serializeUser((user: object, done: (err: any, id: string) => void) => {
      done(null, JSON.stringify(user));
    });

    passport.deserializeUser((id: string, done: (err: any, user: object) => void) => {
      done(null, JSON.parse(id));
    });

    this.router = Router();
    this.router.post("/login/local", passport.authenticate(
      "local",
      {
        successRedirect: "/dashboard",
        failureRedirect: "/login",
        failureFlash: "Invalid username or password",
        successFlash: "Welcome back!",
      }
      // { session: false }
    ), this.postLogin);
  }

  public postLogin = async (req: Request, res: Response, next: NextFunction) => {
    // res.redirect("/dashboard");
    // console.log(req.user);
    res.json(req.user);
  }
}