import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy, IVerifyOptions } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { JWT_SECRET } from "../utils/secret";
import cors from "cors";

const JWT_ISSUER = "lyricova";

export class AuthController {
  public router: Router;
  public injectionRouter: Router;

  constructor() {
    this.initPassport();

    this.router = Router();
    this.injectionRouter = Router();
    this.router.post(
      "/login/local/session",
      passport.authenticate("local", {
        successRedirect: "/dashboard",
        failureRedirect: "/login",
        failureFlash: "Invalid username or password.",
        successFlash: "Welcome back!",
      }),
      this.postLogin
    );
    this.router.post(
      "/login/local/jwt",
      passport.authenticate("local", { session: false }),
      this.emitJWT
    );

    // Inject user context before Apollo server
    this.injectionRouter.use(
      "/graphql",
      function (req, res, next) {
        if (req.headers["access-control-request-private-network"]) {
          res.setHeader("access-control-allow-private-network", "true");
        }
        next(null);
      },
      cors({
        preflightContinue: true,
      })
    );
    this.injectionRouter.post("/graphql", this.injectGraphQLUser);
  }

  private initPassport() {
    // #region Username + password strategy
    passport.use(
      new LocalStrategy(
        async (
          username: string,
          password: string,
          done: (
            error: any,
            user?: User | boolean,
            options?: IVerifyOptions
          ) => void
        ) => {
          try {
            const user = await User.findOne({ where: { username: username } });
            if (user !== null && (await user.checkPassword(password))) {
              return done(null, user);
            }
            return done(null, false, {
              message: "Incorrect username & password.",
            });
          } catch (err) {
            return done(err);
          }
        }
      )
    );

    passport.serializeUser(
      (user: User, done: (err: any, id: string) => void) => {
        done(null, `${user.id}`);
      }
    );

    passport.deserializeUser(
      async (id: string, done: (err: any, user?: User) => void) => {
        const user = await User.findByPk(parseInt(id));
        if (user === null) {
          return done("User not found");
        }
        done(null, user);
      }
    );
    // #endregion

    // #region JWT strategy
    passport.use(
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          issuer: JWT_ISSUER,
          secretOrKey: JWT_SECRET,
        },
        async (
          payload: { id: number },
          done: (err: any, user: User | false) => void
        ) => {
          try {
            const user = await User.findByPk(payload.id);
            if (user === null) {
              return done(null, false);
            }
            return done(null, user);
          } catch (err) {
            return done(err, false);
          }
        }
      )
    );
    // #endregion
  }

  public postLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // res.redirect("/dashboard");
    // console.log(req.user);
    res.json(req.user);
  };

  public emitJWT = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;

    const token = jwt.sign(
      {
        id: user.id,
        // username: user.username,
        // role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: JWT_ISSUER,
      }
    );

    return res.json({
      status: 200,
      token: token,
    });
  };

  public injectGraphQLUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    passport.authenticate(
      "jwt",
      { session: false, failWithError: false },
      function (err: unknown, user: User | null) {
        if (user) {
          req.logIn(user, { session: false }, next);
        } else {
          next();
        }
      }
    )(req, res, next);
  };
}
