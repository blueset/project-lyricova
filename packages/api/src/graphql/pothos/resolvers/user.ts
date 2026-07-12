import { builder } from "../builder.js";
import { UserRef } from "../types/refs.js";

builder.queryField("currentUser", (t) =>
  t.field({
    type: UserRef,
    nullable: true,
    resolve: (_root, _args, ctx) => ctx.user ?? null,
  }),
);
