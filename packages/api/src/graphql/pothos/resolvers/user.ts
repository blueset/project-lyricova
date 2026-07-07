import { and, eq } from "drizzle-orm";
import { builder } from "../builder";
import { UserRef, UserPublicKeyCredentialRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { Users, UserPublicKeyCredentials } from "../../../drizzle/schema";

builder.queryField("currentUser", (t) =>
  t.field({
    type: UserRef,
    nullable: true,
    // ctx.user is the legacy `models/User` class, but at runtime it is a
    // Drizzle `Users` row (set by passport `deserializeUser`); the two shapes
    // differ only in optional-vs-null of `provider`/`provider_id`.
    resolve: (_root, _args, ctx) =>
      (ctx.user ?? null) as unknown as typeof Users.$inferSelect | null,
  }),
);

builder.queryField("currentCredentials", (t) =>
  t.field({
    type: [UserPublicKeyCredentialRef],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) return [];
      return db.query.UserPublicKeyCredentials.findMany({
        where: eq(UserPublicKeyCredentials.userId, ctx.user.id),
      });
    },
  }),
);

builder.mutationField("deleteCredential", (t) =>
  t.boolean({
    args: { id: t.arg.int() },
    resolve: async (_root, { id }, ctx) => {
      if (!ctx.user) return false;
      const cred = await db.query.UserPublicKeyCredentials.findFirst({
        where: and(
          eq(UserPublicKeyCredentials.id, id),
          eq(UserPublicKeyCredentials.userId, ctx.user.id),
        ),
      });
      if (!cred) return false;
      await db
        .delete(UserPublicKeyCredentials)
        .where(eq(UserPublicKeyCredentials.id, id));
      return true;
    },
  }),
);
