import express from "express";
import type { Request, Response } from "express";
import compression from "compression";
import { toNodeHandler } from "better-auth/node";

import registerRoutes from "./routes.js";
import { postHog } from "./utils/posthog.js";
import { setupExpressErrorHandler } from "posthog-node";
import { compat } from "./utils/expressCompat.js";
import { auth } from "./auth/auth.js";
import { attachRequestAuth } from "./auth/session.js";
import { requireTrustedSessionOrigin } from "./auth/trustedOrigin.js";
import { requireFreshSession } from "./auth/freshSession.js";

export default () => {
  const app = express();

  app.set("port", process.env.API_PORT || 8083);
  app.use(compat(compression()));
  app.use(
    [
      "/api/auth/passkey/generate-register-options",
      "/api/auth/passkey/verify-registration",
      "/api/auth/passkey/update-passkey",
      "/api/auth/passkey/delete-passkey",
    ],
    requireFreshSession,
  );
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: "text/*" }));
  app.use(attachRequestAuth);
  app.use(requireTrustedSessionOrigin);

  registerRoutes(app);
  if (postHog) {
    setupExpressErrorHandler(postHog, app);
  }

  app.get("/", async (req: Request, res: Response) => {
    res.send("Hello world!");
  });

  return app;
};
