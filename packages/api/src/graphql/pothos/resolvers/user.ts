import { and, eq } from "drizzle-orm";
import { builder } from "../builder";
import { UserRef, UserPublicKeyCredentialRef } from "../types/refs";
import { db } from "../../../drizzle/client";
import { UserPublicKeyCredentials } from "../../../drizzle/schema";

builder.queryField("currentUser", (t) =>
  t.field({
    type: UserRef,
    nullable: true,
    resolve: (_root, _args, ctx) => (ctx.user ?? null) as any,
  })
);

builder.queryField("currentCredentials", (t) =>
  t.field({
    type: [UserPublicKeyCredentialRef],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) return [];
      return db.query.UserPublicKeyCredentials.findMany({
        columns: { id: true, creationDate: true, remarks: true, userId: true },
        where: eq(UserPublicKeyCredentials.userId, ctx.user.id),
      }) as any;
    },
  })
);

builder.mutationField("deleteCredential", (t) =>
  t.boolean({
    args: { id: t.arg.int() },
    resolve: async (_root, { id }, ctx) => {
      if (!ctx.user) return false;
      const cred = await db.query.UserPublicKeyCredentials.findFirst({
        where: and(
          eq(UserPublicKeyCredentials.id, id),
          eq(UserPublicKeyCredentials.userId, ctx.user.id)
        ),
      });
      if (!cred) return false;
      await db
        .delete(UserPublicKeyCredentials)
        .where(eq(UserPublicKeyCredentials.id, id));
      return true;
    },
  })
);
