import { builder } from "../builder.js";
import { translationAlignment } from "../../../utils/translationAlignment.js";

builder.queryField("translationAlignment", (t) =>
  t.string({
    authScopes: { admin: true },
    args: {
      original: t.arg.string(),
      translation: t.arg.string(),
    },
    resolve: (_root, { original, translation }) =>
      translationAlignment(original, translation),
  }),
);
