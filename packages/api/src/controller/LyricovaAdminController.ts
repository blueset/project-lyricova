import type { Request, Response } from "express";
import { requireNumericParams } from "../utils/numericParam.js";
import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../drizzle/client.js";
import { Entries, Pulses } from "../drizzle/schema.js";
import { adminOnlyMiddleware } from "../utils/adminOnlyMiddleware.js";

export class LyricovaAdminApiController {
  public router: Router;

  constructor() {
    this.router = Router();
    requireNumericParams(this.router, "entryId");
    this.router.patch("/bump/:entryId", adminOnlyMiddleware, this.bump);
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
    const id: number = parseInt(req.params.entryId as string);
    const entry = await db.query.Entries.findFirst({
      where: and(eq(Entries.id, id), isNull(Entries.deletionDate)),
    });
    if (!entry) {
      return res.status(404).json({ message: `${id} is not found.` });
    }
    const date = new Date();
    await db.insert(Pulses).values({ entryId: id, creationDate: date });
    await db
      .update(Entries)
      .set({ recentActionDate: date, updatedOn: new Date() })
      .where(eq(Entries.id, id));
    res.status(200).json({
      creationDate: date,
    });
  };
}
