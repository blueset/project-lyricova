import crypto from "crypto";
import { builder } from "../builder.js";

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
      crypto
        .createHash("md5")
        .update(u.email || "")
        .digest("hex"),
  }),
  id: t.field({ type: "Float", resolve: (u: any) => u.id }),
  role: t.field({ type: "String", resolve: (u: any) => u.role }),
  username: t.field({ type: "String", resolve: (u: any) => u.username }),
}));
