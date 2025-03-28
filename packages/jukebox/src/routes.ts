import type { Request, Response } from "express";
import express from "express";
import { MusicFileController } from "./controller/MusicFileController";
import { VocaDBImportController } from "./controller/VocaDBImportController";
import type { SegmentedTransliterationOptions } from "lyricova-common/utils/transliterate";
import {
  transliterate,
  segmentedTransliteration,
} from "lyricova-common/utils/transliterate";
import { LyricsProvidersController } from "./controller/LyricsProvidersController";
import { AuthController } from "lyricova-common/utils/AuthController";
import { PlaylistController } from "./controller/PlaylistController";
import { convertMonoruby } from "./utils/monoruby";
import { SongController } from "./controller/SongController";
import { LLMController } from "./controller/LLMController";

export default (app: express.Express) => {
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // API Routes
  const musicFileController = new MusicFileController();
  apiRouter.use("/files", musicFileController.router);
  
  const songController = new SongController();
  apiRouter.use("/songs", songController.router);

  const vocaDBImportController = new VocaDBImportController();
  apiRouter.use("/vocadb", vocaDBImportController.router);

  const lyricsProvidersController = new LyricsProvidersController();
  apiRouter.use("/lyrics", lyricsProvidersController.router);

  const llmController = new LLMController();
  apiRouter.use("/llm", llmController.router);

  // const downloadController = new DownloadController();
  // apiRouter.use("/download", downloadController.router);

  const playlistController = new PlaylistController();
  apiRouter.use("/playlists", playlistController.router);

  const authController = new AuthController();
  apiRouter.use("/", authController.router);
  app.use("/", authController.injectionRouter);

  apiRouter.get("/transliterate/:text", (req: Request, res: Response) => {
    res.send(transliterate(req.params.text));
  });

  apiRouter.get("/segTransliterate", async (req: Request, res: Response) => {
    try {
      const result = await segmentedTransliteration(req.query.text as string, {
        language: req.query.lang as SegmentedTransliterationOptions["language"],
        type: req.query.type as SegmentedTransliterationOptions["type"],
        convertMonoruby,
      });
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(502);
    }
  });
};
