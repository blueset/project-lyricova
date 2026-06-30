import crypto from "crypto";
import { builder } from "../builder";

builder.drizzleObjectFields("Users", (t) => ({
  creationDate: t.field({
    type: "Timestamp",
    resolve: (u: any) => u.creationDate,
  }),
  displayName: t.field({ type: "String", resolve: (u: any) => u.displayName }),
  email: t.field({ type: "String", resolve: (u: any) => u.email }),
  emailMD5: t.field({
    type: "String",
    resolve: (u: any) =>
      crypto.createHash("md5").update(u.email || "").digest("hex"),
  }),
  id: t.field({ type: "Float", resolve: (u: any) => u.id }),
  role: t.field({ type: "String", resolve: (u: any) => u.role }),
  username: t.field({ type: "String", resolve: (u: any) => u.username }),
}));

builder.drizzleObjectFields("UserPublicKeyCredentials", (t) => ({
  creationDate: t.field({
    type: "Timestamp",
    resolve: (c: any) => c.creationDate,
  }),
  id: t.field({ type: "Float", resolve: (c: any) => c.id }),
  remarks: t.field({ type: "String", nullable: true, resolve: (c: any) => c.remarks }),
  updatedOn: t.field({ type: "Timestamp", resolve: (c: any) => c.updatedOn }),
  userId: t.field({ type: "Float", resolve: (c: any) => c.userId }),
}));
