import { UserController } from "./controller/UserController";
import express, { Request, Response } from "express";
import { MusicFileController } from "./controller/MusicFileController";
import { VocaDBImportController } from "./controller/VocaDBImportController";
import { transliterate } from "./utils/transliterate";

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

  const vocaDBImportRouter = express.Router();
  const vocaDBImportController = new VocaDBImportController();
  vocaDBImportRouter.get("/enrolSong/:id(\\d+)", vocaDBImportController.enrolSong);

  app.use("/", userRouter);
  app.use("/", musicFileRouter);
  app.use("/vocadb", vocaDBImportRouter);

  app.get("/transliterate/:text", (req: Request, res: Response) => {
    res.send(transliterate(req.params.text));
  });
};
