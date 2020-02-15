
import { NextFunction, Request, Response } from "express";
import { User } from "../models/User";

export class UserController {

  async all(request: Request, response: Response, next: NextFunction) {
    try {
      return await User.findAll();
    } catch (e) {
      next(e);
    }
  }

  async one(request: Request, response: Response, next: NextFunction) {
    try {
      return await User.findByPk(request.params.id);
    } catch (e) {
      next(e);
    }
  }

  async save(request: Request, response: Response, next: NextFunction) {
    try {
      const user = await User.findByPk(request.body.id);
      return await user.update(request.body);
    } catch (e) {
      next(e);
    }
  }

  async remove(request: Request, response: Response, next: NextFunction) {
    try {
      const userToRemove = await User.findByPk(request.params.id);
      await userToRemove.destroy();
    } catch (e) {
      next(e);
    }
  }
}
