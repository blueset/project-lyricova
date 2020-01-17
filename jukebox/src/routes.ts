import { UserController } from "./controller/UserController";
import express from "express";
import { MusicFileController } from "./controller/MusicFileController";

export default (app: express.Express) => {
  const userRouter = express.Router();
  const userController = new UserController();

  userRouter.get("/users", userController.all);
  userRouter.get("/users/:id", userController.one);
  userRouter.post("/users", userController.save);
  userRouter.delete("/users/:id", userController.remove);

  const musicFileRouter = express.Router();
  const musicFileController = new MusicFileController();
  musicFileRouter.get("/scan", musicFileController.scan);

  app.use("/", userRouter);
  app.use("/", musicFileRouter);
};
