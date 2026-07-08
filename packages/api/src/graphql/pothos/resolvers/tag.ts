import { eq } from "drizzle-orm";
import { builder } from "../builder.js";
import { TagRef } from "../types/refs.js";
import { db } from "../../../drizzle/client.js";
import { Tags } from "../../../drizzle/schema.js";
import { GraphQLError } from "graphql";

const NewTagInput = builder.inputType("NewTagInput", {
  fields: (t) => ({
    name: t.string(),
    slug: t.string(),
    color: t.string(),
  }),
});

const UpdateTagInput = builder.inputType("UpdateTagInput", {
  fields: (t) => ({
    name: t.string({ required: false }),
    slug: t.string({ required: false }),
    color: t.string({ required: false }),
  }),
});

builder.queryField("tags", (t) =>
  t.field({ type: [TagRef], resolve: async () => db.query.Tags.findMany() }),
);

builder.queryField("tag", (t) =>
  t.field({
    type: TagRef,
    nullable: true,
    args: { slug: t.arg.string() },
    resolve: async (_root, { slug }) =>
      (await db.query.Tags.findFirst({ where: eq(Tags.slug, slug) })) ?? null,
  }),
);

builder.mutationField("newTag", (t) =>
  t.field({
    type: TagRef,
    authScopes: { admin: true },
    args: { data: t.arg({ type: NewTagInput }) },
    resolve: async (_root, { data }) => {
      const now = new Date();
      await db.insert(Tags).values({
        slug: data.slug,
        name: data.name,
        color: data.color,
        createdAt: now,
        updatedAt: now,
      });
      return (await db.query.Tags.findFirst({
        where: eq(Tags.slug, data.slug),
      }))!;
    },
  }),
);

builder.mutationField("updateTag", (t) =>
  t.field({
    type: TagRef,
    authScopes: { admin: true },
    args: { slug: t.arg.string(), data: t.arg({ type: UpdateTagInput }) },
    resolve: async (_root, { slug, data }) => {
      const tag = await db.query.Tags.findFirst({ where: eq(Tags.slug, slug) });
      if (!tag) {
        throw new GraphQLError(`Tag ${slug} not found in database.`);
      }
      const set: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined && data.name !== null) set.name = data.name;
      if (data.slug !== undefined && data.slug !== null) set.slug = data.slug;
      if (data.color !== undefined && data.color !== null)
        set.color = data.color;
      await db.update(Tags).set(set).where(eq(Tags.slug, slug));
      return (await db.query.Tags.findFirst({
        where: eq(Tags.slug, data.slug ?? slug),
      }))!;
    },
  }),
);

builder.mutationField("deleteTag", (t) =>
  t.boolean({
    authScopes: { admin: true },
    args: { slug: t.arg.string() },
    resolve: async (_root, { slug }) => {
      const tag = await db.query.Tags.findFirst({ where: eq(Tags.slug, slug) });
      if (!tag) {
        throw new GraphQLError(`Tag ${slug} not found in database.`);
      }
      await db.delete(Tags).where(eq(Tags.slug, slug));
      return true;
    },
  }),
);
