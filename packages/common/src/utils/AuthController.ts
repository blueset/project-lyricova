import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy, IVerifyOptions } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import WebAuthnStrategy, {
  RegisteredFunction,
  SessionChallengeStore,
} from "passport-fido2-webauthn";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { JWT_SECRET } from "../utils/secret";
import cors from "cors";
import { VerifiedFunction } from "passport-fido2-webauthn";
import { UserPublicKeyCredential } from "../models/UserPublicKeyCredential";
import base64url from "base64url";
import { v4 as uuid } from "uuid";

const JWT_ISSUER = "lyricova";
const store = new SessionChallengeStore();

interface WebAuthnEnrolPayload extends User {
  remarks?: string;
}

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

    // WebAuthn routes
    this.router.post("/login/public-key/challenge", function (req, res, next) {
      store.challenge(req, function (err, challenge) {
        if (err) {
          return next(err);
        }
        res.json({ challenge: challenge && base64url.encode(challenge) });
      });
    });

    this.router.post(
      "/login/public-key",
      passport.authenticate("webauthn", { failWithError: true }),
      this.emitJWT
    );

    this.router.post(
      "/enroll/public-key/challenge",
      passport.authenticate("jwt"),
      function (req, res, next) {
        if (!req.user) {
          return next(new Error("User not logged in"));
        }
        var handle = Buffer.alloc(16);
        handle = uuid({}, handle);
        const userObj = (req.user as unknown as User).toJSON();
        var user = {
          id: userObj.id.toString(),
          name: userObj.username.toString(),
          displayName: userObj.displayName,
          remarks: `${req.headers["user-agent"]}, ${JSON.stringify([
            ...req.ips,
            req.connection.remoteAddress,
          ])}`,
        };
        store.challenge(req, { user: user }, (err, challenge) => {
          if (err) {
            console.error("Store challenge err", err);
            return next(err);
          }
          res.json({
            user: user,
            challenge: challenge && base64url.encode(challenge),
          });
        });
      }
    );

    this.router.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        if (err) {
          console.error("auth router err", err);
          res.sendStatus(401);
        }
        next();
      }
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

    // #region FIDO2 WebAuthn strategy
    passport.use(
      new WebAuthnStrategy(
        { store: store },
        /* verify */ async (
          id: string,
          userHandle: Buffer,
          cb: VerifiedFunction
        ) => {
          const cred = await UserPublicKeyCredential.findOne({
            where: { externalId: id },
            include: [User],
          });
          if (!cred?.user) cb(null, false, { message: "Invalid key. " });
          return cb(null, cred?.user, cred?.publicKey);
        },
        /* register */ async (
          user: WebAuthnEnrolPayload,
          id: string,
          publicKey: string,
          cb: RegisteredFunction
        ) => {
          const userObj = await User.findOne({ where: { id: user.id } });
          if (!userObj) return cb({ message: "User not found. " });
          // @ts-ignore
          const cred = await UserPublicKeyCredential.create({
            userId: user.id,
            externalId: id,
            publicKey: publicKey,
            remarks: user.remarks,
          });
          return cb(null, userObj);
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
