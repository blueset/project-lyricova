import type { Request, Response } from "express";
import express from "express";
import { MusicFileController } from "./controller/MusicFileController";
import { VocaDBImportController } from "./controller/VocaDBImportController";
import type { SegmentedTransliterationOptions } from "./utils/transliterate";
import { transliterate, segmentedTransliteration } from "./utils/transliterate";
import { LyricsProvidersController } from "./controller/LyricsProvidersController";
import { AuthController } from "./controller/AuthController";
import { PlaylistController } from "./controller/PlaylistController";
import { convertMonoruby } from "./utils/monoruby";
import { SongController } from "./controller/SongController";
import { LLMController } from "./controller/LLMController";
import { LyricovaAdminApiController } from "./controller/LyricovaAdminController";
import { LyricovaPublicApiController } from "./controller/LyricovaPublicController";
import { EntriesController } from "./controller/EntriesController";
import { TagsController } from "./controller/TagsController";
import generateRssFeed from "./utils/rss";
import { ArtistsController } from "./controller/ArtistsController";

export default (app: express.Express) => {
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // API Routes
  const musicFileController = new MusicFileController();
  apiRouter.use("/files", musicFileController.router);

  const songController = new SongController();
  apiRouter.use("/songs", songController.router);

  const artistsController = new ArtistsController();
  apiRouter.use("/artists", artistsController.router);

  const vocaDBImportController = new VocaDBImportController();
  apiRouter.use("/vocadb", vocaDBImportController.router);

  const lyricsProvidersController = new LyricsProvidersController();
  apiRouter.use("/lyrics", lyricsProvidersController.router);

  const llmController = new LLMController();
  apiRouter.use("/llm", llmController.router);

  const playlistController = new PlaylistController();
  apiRouter.use("/playlists", playlistController.router);

  const entriesController = new EntriesController();
  apiRouter.use("/entries", entriesController.router);

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

  const adminApiRouter = new LyricovaAdminApiController();
  apiRouter.use("/", adminApiRouter.router);

  const publicApiRouter = new LyricovaPublicApiController();
  apiRouter.use("/", publicApiRouter.router);

  const tagsController = new TagsController();
  apiRouter.use("/tags", tagsController.router);

  app.get("/feed", async (req: Request, res: Response) => {
    const xml = await generateRssFeed();
    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  });
};
