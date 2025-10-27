import type { Request, Response } from "express";
import { Router } from "express";
import { Entry } from "../models/Entry";
import { Pulse } from "../models/Pulse";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware";

export class LyricovaAdminApiController {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.patch("/bump/:entryId(\\d+)", adminOnlyMiddleware, this.bump);
  }

  /**
   * @openapi
   * /bump/{entryId}:
   *   patch:
   *     summary: Bump an entry with a pulse
   *     tags:
   *       - Lyricova admin API
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: entryId
   *         required: true
   *         schema:
   *           type: integer
   *           description: ID of the entry to bump.
   *     responses:
   *       200:
   *         description: Successfully bumped the entry.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 creationDate:
   *                   type: string
   *                   format: date-time
   *                   description: The creation date of the new pulse.
   *       404:
   *         description: Entry not found.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   const: "Entry not found"
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
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
