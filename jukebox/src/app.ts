import express, { Request, Response } from "express";
import compression from "compression"; // compresses requests
import bodyParser from "body-parser";
import flash from "express-flash";
import session from "express-session";
import passport from "passport";

import { userRouter } from "./routes";
import { SESSION_SECRET } from "./utils/secret";
import { TypeormStore } from "connect-typeorm";
import { getRepository } from "typeorm";
import { Session } from "./entity/Session";

const app = express();
const sessionRepository = getRepository(Session);

app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    store: new TypeormStore({
      cleanupLimit: 2,
      limitSubquery: false, // If using MariaDB.
      ttl: 86400
    }).connect(sessionRepository)
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/", async (req: Request, res: Response) => {
  res.send("Hello world!");
});
app.use("/", userRouter);

export default app;
