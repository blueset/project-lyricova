import type { Request, Response } from "express";
import { Router } from "express";
import { Entry } from "../models/Entry";
import { Pulse } from "../models/Pulse";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";

export class LyricovaAdminApiController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(adminOnlyMiddleware);
    this.router.patch("/bump/:entryId", this.bump);
  }

  public bump = async (req: Request, res: Response) => {
    const id: number = parseInt(req.params.entryId);
    const entry = await Entry.findByPk(id);
    if (!entry) {
      return res.status(404).json({ message: `${id} is not found.` });
    }
    const date = new Date();
    const pulse = await Pulse.create({ creationDate: date });
    entry.$add("pulse", pulse);
    entry.recentActionDate = date;
    await entry.save();
    res.status(200).json({
      creationDate: date,
    });
  };
}
