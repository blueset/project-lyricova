import express from "express";
import type { Request, Response } from "express";
import compression from "compression";
import bodyParser from "body-parser";
import flash from "express-flash";
import session from "express-session";
import passport from "passport";

import registerRoutes from "./routes";
import { SESSION_SECRET } from "./utils/secret";
import expressMySQLSession from "express-mysql-session";
import { pool as drizzlePool } from "./drizzle/client";
import { postHog } from "./utils/posthog";
import { setupExpressErrorHandler } from "posthog-node";

const MySQLStore = expressMySQLSession(session as any);

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
      // Reuse the Drizzle mysql2 pool (shares the DB_URI connection settings).
      store: new MySQLStore({}, (drizzlePool as any).pool),
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
