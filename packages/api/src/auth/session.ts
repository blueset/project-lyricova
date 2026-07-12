import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { auth } from "./auth.js";
import { db } from "../drizzle/client.js";
import { Users } from "../drizzle/schema.js";

export type AuthUser = typeof Users.$inferSelect;
type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["session"];

export interface RequestAuth {
  session: BetterAuthSession;
  user: AuthUser;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth: RequestAuth | null;
    }
  }
}

export async function resolveRequestAuth(
  headers: IncomingHttpHeaders,
): Promise<RequestAuth | null> {
  const result = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  if (!result) return null;

  const userId = Number(result.user.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;

  const now = new Date();
  const user = await db.query.Users.findFirst({
    where: and(
      eq(Users.id, userId),
      isNull(Users.deletionDate),
      eq(Users.banned, false),
      or(isNull(Users.banExpires), gt(Users.banExpires, now)),
    ),
  });
  if (!user) return null;

  return {
    session: result.session,
    user,
  };
}

export const attachRequestAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    req.auth = await resolveRequestAuth(req.headers);
    next();
  } catch (error) {
    next(error);
  }
};
