import { Request, Response, NextFunction, Router } from "express";

export class LyricsProvidersController {
  public router: Router;

  constructor() {
    this.router = Router();
    // this.router.get("/hmiku", this.hmikuAtWiki);
    // this.router.get("/hmiku/:id(\\d+)", this.hmikuAtWikiSingle);
    // this.router.get("/vocadb/:id(\\d+)", this.vocaDBSingle);
  }
}