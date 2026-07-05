import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { Users } from "../drizzle/schema";

export class UserController {
  async all(request: Request, response: Response, next: NextFunction) {
    try {
      return await db.query.Users.findMany();
    } catch (e) {
      next(e);
    }
  }

  async one(request: Request, response: Response, next: NextFunction) {
    try {
      return await db.query.Users.findFirst({
        where: eq(Users.id, parseInt(request.params.id as string)),
      });
    } catch (e) {
      next(e);
    }
  }

  async save(request: Request, response: Response, next: NextFunction) {
    try {
      await db
        .update(Users)
        .set(request.body)
        .where(eq(Users.id, request.body.id));
      return await db.query.Users.findFirst({
        where: eq(Users.id, request.body.id),
      });
    } catch (e) {
      next(e);
    }
  }

  async remove(request: Request, response: Response, next: NextFunction) {
    try {
      await db
        .delete(Users)
        .where(eq(Users.id, parseInt(request.params.id as string)));
    } catch (e) {
      next(e);
    }
  }
}
