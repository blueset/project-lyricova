import { builder } from "../builder";
import { translationAlignment } from "../../../utils/translationAlignment";

builder.queryField("translationAlignment", (t) =>
  t.string({
    authScopes: { admin: true },
    args: {
      original: t.arg.string(),
      translation: t.arg.string(),
    },
    resolve: (_root, { original, translation }) =>
      translationAlignment(original, translation),
  })
);
