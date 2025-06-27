import express from "express";
import type { Request, Response } from "express";
import compression from "compression";
import bodyParser from "body-parser";
import flash from "express-flash";
import session from "express-session";
import passport from "passport";

import registerRoutes from "./routes";
import { SESSION_SECRET } from "./utils/secret";
import sequelize from "./db";
import SequelizeStoreConstructor from "connect-session-sequelize";
import { postHog } from "./utils/posthog";
import { setupExpressErrorHandler } from "posthog-node";

const SequelizeStore = SequelizeStoreConstructor(session.Store);

export default () => {
  const app = express();

  app.set("port", process.env.API_PORT || 8083);
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.text({ type: "text/*" }));
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      proxy: true,
      secret: SESSION_SECRET,
      store: new SequelizeStore({
        db: sequelize,
      }),
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());

  registerRoutes(app);
  setupExpressErrorHandler(postHog, app);

  app.get("/", async (req: Request, res: Response) => {
    res.send("Hello world!");
  });

  return app;
};
