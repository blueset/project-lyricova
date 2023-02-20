import express, { Request, Response } from "express";
import { AuthController } from "lyricova-common/utils/AuthController";

export default (app: express.Express) => {
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  const authController = new AuthController();
  apiRouter.use("/", authController.router);
  app.use("/", authController.injectionRouter);
};
