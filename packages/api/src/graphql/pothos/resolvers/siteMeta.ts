import { builder } from "../builder";
import { SiteMeta } from "../../../models/SiteMeta";

builder.queryField("getSiteMeta", (t) =>
  t.string({
    args: {
      key: t.arg.string(),
      default: t.arg.string(),
    },
    resolve: async (_root, { key, default: defaultValue }) => {
      const siteMeta = await SiteMeta.findByPk(key);
      return siteMeta?.value ?? defaultValue;
    },
  })
);

builder.mutationField("setSiteMeta", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: {
      key: t.arg.string(),
      value: t.arg.string(),
    },
    resolve: async (_root, { key, value }) => {
      try {
        await SiteMeta.upsert({ key, value });
        return true;
      } catch (error) {
        console.error("Error setting site meta:", error);
        return false;
      }
    },
  })
);
