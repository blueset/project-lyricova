import { Router, Request, Response, NextFunction } from "express";
import { Entry } from "lyricova-common/models/Entry";
import { Pulse } from "lyricova-common/models/Pulse";
import passport from "passport";
import { User } from "lyricova-common/models/User";

function adminOnlyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  passport.authenticate("jwt", function (err: unknown, user: User | null) {
    if (err) {
      return next(err);
    }
    if (!user || user.role !== "admin") {
      return res.sendStatus(401);
    }
    if (err) {
      return next(err);
    }
    return next();
  })(req, res, next);
}

export class AdminApiController {
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
