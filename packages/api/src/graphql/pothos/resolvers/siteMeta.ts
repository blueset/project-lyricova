import { eq } from "drizzle-orm";
import { builder } from "../builder";
import { db } from "../../../drizzle/client";
import { SiteMeta } from "../../../drizzle/schema";

builder.queryField("getSiteMeta", (t) =>
  t.string({
    args: {
      key: t.arg.string(),
      default: t.arg.string(),
    },
    resolve: async (_root, { key, default: defaultValue }) => {
      const row = await db.query.SiteMeta.findFirst({
        where: eq(SiteMeta.key, key),
      });
      return row?.value ?? defaultValue;
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
        const now = new Date();
        await db
          .insert(SiteMeta)
          .values({ key, value, createdAt: now, updatedAt: now })
          .onDuplicateKeyUpdate({ set: { value, updatedAt: now } });
        return true;
      } catch (error) {
        console.error("Error setting site meta:", error);
        return false;
      }
    },
  })
);
