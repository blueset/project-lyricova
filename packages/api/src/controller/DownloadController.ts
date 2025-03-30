import { Router } from "express";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";

export class DownloadController {
  public router: Router;

  constructor() {
    this.router = Router();
    // Bar all requests behind this with JWT
    this.router.use(adminOnlyMiddleware);
  }
}
