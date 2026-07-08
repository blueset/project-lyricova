import express from "express";
import type { Request, Response } from "express";
import compression from "compression";
import flash from "express-flash";
import session from "express-session";
import passport from "passport";

import registerRoutes from "./routes.js";
import { SESSION_SECRET } from "./utils/secret.js";
import expressMySQLSession from "express-mysql-session";
import { pool as drizzlePool } from "./drizzle/client.js";
import { postHog } from "./utils/posthog.js";
import { setupExpressErrorHandler } from "posthog-node";
import { compat } from "./utils/expressCompat.js";

const MySQLStore = expressMySQLSession(session);

export default () => {
  const app = express();

  app.set("port", process.env.API_PORT || 8083);
  app.use(compat(compression()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: "text/*" }));
  app.use(
    compat(
      session({
        resave: false,
        saveUninitialized: false,
        proxy: true,
        secret: SESSION_SECRET,
        // Reuse the Drizzle mysql2 pool (shares the DB_URI connection settings).
        store: new MySQLStore({}, drizzlePool.pool),
      }),
    ),
  );
  app.use(compat(passport.initialize()));
  app.use(compat(passport.session()));
  app.use(compat(flash()));

  registerRoutes(app);
  if (postHog) {
    setupExpressErrorHandler(postHog, app);
  }

  app.get("/", async (req: Request, res: Response) => {
    res.send("Hello world!");
  });

  return app;
};
