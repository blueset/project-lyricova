import { builder } from "../builder";
import { UserRef, UserPublicKeyCredentialRef } from "../types/refs";
import { UserPublicKeyCredential } from "../../../models/UserPublicKeyCredential";

builder.queryField("currentUser", (t) =>
  t.field({
    type: UserRef,
    nullable: true,
    resolve: (_root, _args, ctx) => ctx.user ?? null,
  })
);

builder.queryField("currentCredentials", (t) =>
  t.field({
    type: [UserPublicKeyCredentialRef],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) return [];
      const creds = await UserPublicKeyCredential.findAll({
        attributes: ["id", "creationDate", "remarks"],
        where: { userId: ctx.user.id },
      });
      return creds.map((i) => i.toJSON());
    },
  })
);

builder.mutationField("deleteCredential", (t) =>
  t.boolean({
    args: { id: t.arg.int() },
    resolve: async (_root, { id }, ctx) => {
      if (!ctx.user) return false;
      const cred = await UserPublicKeyCredential.findOne({
        where: { id, userId: ctx.user.id },
      });
      if (!cred) return false;
      await cred.destroy();
      return true;
    },
  })
);
