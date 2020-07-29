import express, { Request, Response } from "express";
import { MusicFileController } from "./controller/MusicFileController";
import { VocaDBImportController } from "./controller/VocaDBImportController";
import { transliterate } from "./utils/transliterate";
import { LyricsProvidersController } from "./controller/LyricsProvidersController";
import { DownloadController } from "./controller/DownloadController";
import { AuthController } from "./controller/AuthController";

export default (app: express.Express) => {
  // const userRouter = express.Router();
  // const userController = new UserController();

  // userRouter.get("/users", userController.all);
  // userRouter.get("/users/:id", userController.one);
  // userRouter.post("/users", userController.save);
  // userRouter.delete("/users/:id", userController.remove);
  // app.use("/", userRouter);

  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // API Routes
  const musicFileController = new MusicFileController();
  apiRouter.use("/files", musicFileController.router);

  const vocaDBImportController = new VocaDBImportController();
  apiRouter.use("/vocadb", vocaDBImportController.router);

  const lyricsProvidersController = new LyricsProvidersController();
  apiRouter.use("/lyrics", lyricsProvidersController.router);

  const downloadController = new DownloadController();
  apiRouter.use("/download", downloadController.router);

  const authController = new AuthController();
  apiRouter.use("/", authController.router);

  apiRouter.get("/transliterate/:text", (req: Request, res: Response) => {
    res.send(transliterate(req.params.text));
  });
};
