import express, { Request, Response } from "express";
import { AuthController } from "lyricova-common/utils/AuthController";
import { AdminApiController } from "./controllers/admin";
import { PublicApiController } from "./controllers/public";
import generateRssFeed from "./utils/rss";

export default (app: express.Express) => {
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  const authController = new AuthController();
  apiRouter.use("/", authController.router);
  app.use("/", authController.injectionRouter);

  const publicApiRouter = new PublicApiController();
  apiRouter.use("/", publicApiRouter.router);
  app.get("/api/test", (req, res) => {
    console.log("routes test");
    res.status(200).json({});
  });

  const adminApiRouter = new AdminApiController();
  apiRouter.use("/", adminApiRouter.router);

  app.get("/feed", async (req: Request, res: Response) => {
    const xml = await generateRssFeed();
    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  });
};
