import express, { Request, Response } from "express";
import { AuthController } from "lyricova-common/utils/AuthController";
import generateRssFeed from "./utils/rss";

export default (app: express.Express) => {
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  const authController = new AuthController();
  apiRouter.use("/", authController.router);
  app.use("/", authController.injectionRouter);

  app.get("/feed", async (req: Request, res: Response) => {
    const xml = await generateRssFeed();
    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  });
};
