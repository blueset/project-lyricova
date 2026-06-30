import { builder } from "../builder";
import { UserRef, UserPublicKeyCredentialRef } from "./refs";

UserRef.implement({
  fields: (t) => ({
    creationDate: t.field({
      type: "Timestamp",
      resolve: (u) => u.creationDate,
    }),
    displayName: t.exposeString("displayName"),
    email: t.exposeString("email"),
    emailMD5: t.exposeString("emailMD5"),
    id: t.exposeFloat("id"),
    role: t.exposeString("role"),
    username: t.exposeString("username"),
  }),
});

UserPublicKeyCredentialRef.implement({
  fields: (t) => ({
    creationDate: t.field({
      type: "Timestamp",
      resolve: (c) => c.creationDate,
    }),
    id: t.exposeFloat("id"),
    remarks: t.exposeString("remarks", { nullable: true }),
    updatedOn: t.field({ type: "Timestamp", resolve: (c) => c.updatedOn }),
    userId: t.exposeFloat("userId"),
  }),
});
